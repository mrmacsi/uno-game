"use client"

import React, { createContext, useContext, useEffect, useReducer, useState, type ReactNode, useRef, useCallback } from "react"
import { useRouter } from 'next/navigation'
import pusherClient from "@/lib/pusher-client"
import type { GameState, GameAction, Card, CardColor } from "@/lib/types"
import { playCard, drawCard, declareUno, passTurn, startGame as startGameAction } from "@/lib/game-actions"
import { getRoom, resetRoom } from "@/lib/room-actions"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import type { Channel } from "pusher-js"
import Pusher from 'pusher-js'
import { checkPlayValidity as checkPlayValidityLogic } from '@/lib/game-logic'
import { toast } from "@/hooks/use-toast"

type GameContextType = {
  state: GameState
  playCard: (cardId: string, selectedColor?: CardColor) => Promise<void>
  drawCard: () => Promise<void>
  declareUno: () => Promise<void>
  currentPlayerId: string | null
  refreshGameState: () => Promise<void>
  selectWildCardColor: (color: CardColor) => Promise<void>
  isColorSelectionOpen: boolean
  pendingWildCardId: string | null
  closeColorSelector: () => void
  passTurn: (forcePass?: boolean) => Promise<void>
  hasPlayableCard: () => boolean
  drawnCardPlayable: Card | null
  roomId: string | null
  isLoading: boolean
  error: string | null
  startGame: () => Promise<void>
  resetGame: () => Promise<void>
  leaveRoom: () => void
  promptColorSelection: (cardId: string) => void
  cardScale: number
  increaseCardSize: () => void
  decreaseCardSize: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "UPDATE_GAME_STATE":
      return { ...action.payload }
    default:
      return state
  }
}

export function GameProvider({
  children,
  initialState,
  roomId,
}: {
  children: ReactNode
  initialState: GameState
  roomId: string
}) {
  const router = useRouter()
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    typeof window !== "undefined" ? getPlayerIdFromLocalStorage() : null
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isColorSelectionOpen, setIsColorSelectionOpen] = useState(false)
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null)
  
  const [cardScale, setCardScale] = useState(100)
  
  const previousLogRef = useRef<string[]>([])
  
  const [drawnCardPlayable, setDrawnCardPlayable] = useState<Card | null>(null)
  
  const [isResetting, setIsResetting] = useState(false)
  
  const updateGameState = useCallback((newGameState: GameState) => {
    try {
      dispatch({ type: "UPDATE_GAME_STATE", payload: newGameState })
      setError(null)
    } catch (err) {
      console.error("[GameProvider] Error updating game state:", err)
      setError(err instanceof Error ? err.message : "Error updating game state")
    }
  }, [])
  
  useEffect(() => {
    if (!state.log) {
      previousLogRef.current = []
      return
    }
    
    const prevLog = previousLogRef.current
    const currentLog = state.log
    
    if (prevLog.length > 0 && currentLog.length > prevLog.length) {
      const newestEntry = currentLog[currentLog.length - 1]
      if (!prevLog.includes(newestEntry)) {
        toast({
          description: newestEntry,
          duration: 300,
        })
      }
    }
    
    previousLogRef.current = currentLog
  }, [state.log])

  useEffect(() => {
    console.log("[GameProvider] Initial player ID:", currentPlayerId)
  }, [currentPlayerId])

  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("[GameProvider] Storage event detected, player ID:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    window.addEventListener("storage", handleStorageChange)
    
    const storedPlayerId = getPlayerIdFromLocalStorage()
    if (storedPlayerId !== currentPlayerId) {
      console.log("[GameProvider] Updated player ID on mount:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerId]) // Acknowledging review of dependencies for this specific storage listener

  // Define refreshGameState with useCallback before useEffect hooks that use it
  const refreshGameState = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("[GameProvider] Manually refreshing game state for room:", roomId)
      const gameState = await getRoom(roomId)
      if (gameState) {
        updateGameState(gameState)
      } else {
        console.error("[GameProvider] Failed to refresh: Room not found or error fetching state.")
        setError("Room not found or invalid state")
      }
    } catch (err) {
      console.error("[GameProvider] Error refreshing game state:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh game state")
    } finally {
      setIsLoading(false)
    }
  }, [roomId, updateGameState])

  useEffect(() => {
    if (currentPlayerId && state.players) {
      const playerInGame = state.players.find(p => p.id === currentPlayerId)
      console.log("[GameProvider] Current player ID:", currentPlayerId)
      console.log("[GameProvider] Current player in game:", playerInGame)
      console.log("[GameProvider] Players in room:", state.players)
      console.log("[GameProvider] Is host:", playerInGame?.isHost)
      console.log("[GameProvider] Total players:", state.players.length)
    } else {
      console.warn("[GameProvider] No player ID available or no players loaded")
    }
  }, [currentPlayerId, state.players])

  useEffect(() => {
    let channel: Channel | null = null
    let pusher: Pusher | null = null
    
    const setupPusher = () => {
      if (!roomId) {
        console.warn("[GameProvider] No room ID provided, can't subscribe to Pusher")
        return
      }
      
      try {
        if (pusherClient) {
          console.log(`[GameProvider] Using existing Pusher client to subscribe to game-${roomId}`)
          channel = pusherClient.subscribe(`game-${roomId}`)
        } else {
          console.log(`[GameProvider] Creating new Pusher instance to subscribe to game-${roomId}`)
          pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            forceTLS: true
          })
          channel = pusher.subscribe(`game-${roomId}`)
        }
        
        if (!channel) {
          throw new Error("Failed to create Pusher channel")
        }
        
        channel.bind("game-updated", (data: GameState) => {
          console.log("[GameProvider] Received game-updated event:", data?.players?.length, "players")
          setDrawnCardPlayable(null)
          if (data && typeof data === 'object' && data.roomId) {
            updateGameState(data)
          } else {
            console.error("[GameProvider] Invalid data received from game-updated event:", data)
            // Call the memoized refreshGameState directly
            refreshGameState()
          }
        })
        
        channel.bind("drawn-card-playable", (data: { playerId: string, card: Card }) => {
          console.log("[GameProvider] Received drawn-card-playable event for player:", data.playerId)
          if (data.playerId === currentPlayerId) {
            setDrawnCardPlayable(data.card)
          }
        })
        
        channel.bind("room-deleted", (data: { message: string }) => {
          console.log("[GameProvider] Received room-deleted event:", data.message)
          toast({
            title: "Room Deleted",
            description: data.message,
            variant: "destructive",
          })
        })
        
        console.log(`[GameProvider] Successfully subscribed to game-${roomId}`)
      } catch (error) {
        console.error("[GameProvider] Error setting up Pusher:", error)
        setError("Failed to connect to game server. Please refresh the page.")
      }
    }
    
    setupPusher()
    
    return () => {
      if (channel) {
        console.log(`[GameProvider] Cleaning up Pusher subscription for game-${roomId}`)
        channel.unbind_all()
      }
      
      if (pusherClient && roomId) {
        pusherClient.unsubscribe(`game-${roomId}`)
      } else if (pusher && roomId) {
        pusher.unsubscribe(`game-${roomId}`)
        pusher.disconnect()
      }
    }
  }, [roomId, currentPlayerId, updateGameState, refreshGameState])

  useEffect(() => {
    if (state.status !== "playing") return
    const interval = setInterval(() => {
      refreshGameState()
    }, 1500)
    return () => clearInterval(interval)
  }, [state.status, roomId, refreshGameState])

  useEffect(() => {
    if (state.status !== "playing") return
    
    const refreshTimeout = setTimeout(() => {
      refreshGameState()
    }, 300)
    
    return () => clearTimeout(refreshTimeout)
  }, [state.status, refreshGameState, state.discardPile.length, state.currentColor])

  const hasPlayableCard = (): boolean => {
    if (!currentPlayerId || currentPlayerId !== state.currentPlayer) return false
    
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) return false
    
    return currentPlayer.cards.some(card => checkPlayValidityLogic(state, card))
  }

  const handlePlayCard = async (cardId: string, selectedColor?: CardColor) => {
    setIsLoading(true)
    setError(null)

    const player = state.players.find(p => p.id === currentPlayerId)
    if (!player) {
      setError("Player not found.")
      setIsLoading(false)
      return
    }

    // --- UNO Declaration Check ---    
    if (player.cards.length === 2 && !player.saidUno) {
        console.log(`${player.name} attempted to play second-to-last card without declaring UNO. Passing turn.`);
        toast({ 
            title: "UNO!", 
            description: "You must declare UNO before playing your second-to-last card! Turn passed.",
            variant: "destructive",
            duration: 3000 
        });
        // Automatically pass the turn instead of playing the card
        await handlePassTurn(true); // Pass turn forcefully
        setIsLoading(false); // Ensure loading state is reset
        return; // Stop the play card execution
    }
    // --- End UNO Declaration Check ---

    try {
      console.log("[handlePlayCard] Attempting to play card:", { cardId, selectedColor, currentPlayerId, state_currentColor: state.currentColor, turn: state.currentPlayer })
      if (state.currentPlayer !== currentPlayerId) {
        console.warn("[GameProvider] Attempted action when not current player's turn.")
        toast({ title: "Not Your Turn", description: "Please wait for your turn.", variant: "destructive" })
        setIsLoading(false)
        return
      }
      const card = player?.cards.find(c => c.id === cardId)
      if (!card) throw new Error("Card not in hand (client check)")
      if (!checkPlayValidityLogic(state, card)) {
        throw new Error("Invalid play (client check)")
      }
      if ((card.type === "wild" || card.type === "wild4") && !selectedColor) {
        setPendingWildCardId(cardId)
        setIsColorSelectionOpen(true)
        setIsLoading(false)
        return
      }
      // Optimistic update for non-wild cards
      if (card.type !== "wild" && card.type !== "wild4") {
        const updatedPlayers = state.players.map(p =>
          p.id === currentPlayerId
            ? { ...p, cards: p.cards.filter(c => c.id !== cardId) }
            : p
        )
        const updatedDiscardPile = [...state.discardPile, card]
        const updatedColor = card.color
        dispatch({
          type: "UPDATE_GAME_STATE",
          payload: {
            ...state,
            players: updatedPlayers,
            discardPile: updatedDiscardPile,
            currentColor: updatedColor,
          },
        })
      }
      await playCard(roomId, currentPlayerId, cardId, selectedColor)
      setPendingWildCardId(null)
      setIsColorSelectionOpen(false)
    } catch (err) {
      console.error("Failed to play card:", err)
      setError(err instanceof Error ? err.message : "Failed to play card")
      toast({ title: "Invalid Play", description: err instanceof Error ? err.message : "Could not play card.", variant: "destructive" })
      await refreshGameState()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrawCard = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: No player ID")
      return
    }
    
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: Not your turn")
      toast({
        title: "Cannot Draw Card",
        description: "It's not your turn",
        variant: "destructive",
      })
      return
    }
    
    if (state.hasDrawnThisTurn) {
      console.error("[GameProvider] Cannot draw card: Already drawn this turn")
      toast({
        title: "Cannot Draw Card",
        description: "You've already drawn a card this turn",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsLoading(true)
      await drawCard(roomId, currentPlayerId)
      
      toast({
        title: "Card Drawn",
        description: "You drew a card from the pile",
        variant: "default",
      })
      
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to draw card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to draw card",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleDeclareUno = async () => {
    if (!roomId || !currentPlayerId) return setError("Missing Room/Player ID")
    if (state.currentPlayer !== currentPlayerId) {
      toast({ title: "Not Your Turn", description: "You can only declare UNO on your turn.", variant: "default" });
      return;
    }
    
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || player.cards.length !== 2) {
        toast({ title: "Invalid Action", description: "You can only declare UNO when you have exactly two cards.", variant: "default" });
        return;
    }

    // Optimistic UI update for smoother UX
    dispatch({ 
        type: "UPDATE_GAME_STATE", 
        payload: {
            ...state,
            players: state.players.map(p => 
                p.id === currentPlayerId ? { ...p, saidUno: true } : p
            )
        }
    });
    toast({ 
      title: "UNO Declared!", 
      description: "Now you can play your second-to-last card!", 
      duration: 1500,
      variant: "default" 
    });

    setIsLoading(true)
    setError(null)
    try {
      await declareUno(roomId, currentPlayerId)
      // State will be updated via Pusher, no need to manually dispatch here after await
    } catch (err) {
      console.error("[handleDeclareUno] Error declaring UNO:", err)
      setError(err instanceof Error ? err.message : "Failed to declare UNO")
      // Revert optimistic update on error
      dispatch({ 
        type: "UPDATE_GAME_STATE", 
        payload: {
            ...state,
            players: state.players.map(p => 
                p.id === currentPlayerId ? { ...p, saidUno: false } : p // Revert the flag
            )
        }
     });
     toast({ 
       title: "Failed to Declare UNO", 
       description: err instanceof Error ? err.message : "Please try again.", 
       variant: "destructive" 
     });
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectWildCardColor = async (color: CardColor) => {
    if (!roomId || !currentPlayerId || !pendingWildCardId || color === 'black') {
      setError("Invalid state or color for selecting wild color.")
      toast({ title: "Invalid Color", description: "Please select Red, Blue, Green, or Yellow.", variant: "destructive" })
      return
    }
    console.log(`[GameProvider] Color selected: ${color} for card ${pendingWildCardId}`)
    setIsColorSelectionOpen(false)
    setIsLoading(true)
    try {
      await playCard(roomId, currentPlayerId, pendingWildCardId, color)
      setPendingWildCardId(null)
    } catch (err) {
      console.error("Failed to play wild card after color selection:", err)
      setError(err instanceof Error ? err.message : "Failed to play wild card")
      toast({ title: "Error Playing Wild Card", description: err instanceof Error ? err.message : "Could not play the wild card.", variant: "destructive" })
      await refreshGameState()
    } finally {
      setIsLoading(false)
      setPendingWildCardId(null)
    }
  }
  
  const handleCloseColorSelector = () => {
    setIsColorSelectionOpen(false)
    setPendingWildCardId(null)
  }

  const handlePassTurn = async (forcePass: boolean = false) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot pass turn: No player ID")
      return
    }
    
    // Check if the game is in playing status
    if (state.status !== "playing") {
      console.error("[GameProvider] Cannot pass turn: Game is not in progress")
      toast({
        title: "Cannot Pass Turn",
        description: "Game is not in progress yet",
        variant: "destructive",
      })
      return
    }
    
    // Check if it's the player's turn
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot pass turn: Not your turn")
      toast({
        title: "Cannot Pass Turn",
        description: "It's not your turn",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsLoading(true)
      await passTurn(roomId, currentPlayerId, forcePass)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to pass turn:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pass turn",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }
  
  const handleStartGame = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot start game: No player ID")
      return
    }
    
    // Check if player is host
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer?.isHost) {
      console.error("[GameProvider] Cannot start game: Not the host")
      toast({
        title: "Cannot Start Game",
        description: "Only the host can start the game",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsLoading(true)
      await startGameAction(roomId, currentPlayerId!)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to start game:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start game",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }
  
  const handleResetGame = async (): Promise<void> => {
    if (!roomId) {
      setError("Room ID is missing, cannot reset.")
      return
    }
    setIsResetting(true)
    setError(null)
    console.log(`[GameProvider] Attempting to reset room: ${roomId}`)
    try {
      await resetRoom(roomId)
      console.log(`[GameProvider] Reset action called successfully for room: ${roomId}`)
      toast({ description: "Room is resetting...", duration: 2000 })
    } catch (err) {
      console.error("[GameProvider] Failed to reset game:", err)
      setError(err instanceof Error ? err.message : "Failed to reset room")
      toast({ title: "Error", description: "Could not reset the room.", variant: "destructive" })
    } finally {
      setIsResetting(false)
    }
  }

  const handleLeaveRoom = (): void => {
    console.log("[GameProvider] Leaving room, navigating to home.")
    router.push("/")
  }

  const increaseCardSize = () => {
    setCardScale(prev => Math.min(prev + 10, 150)) // Increase by 10%, max 150%
  }

  const decreaseCardSize = () => {
    setCardScale(prev => Math.max(prev - 10, 70)) // Decrease by 10%, min 70%
  }

  const contextValue: GameContextType = {
    state,
    playCard: handlePlayCard,
    drawCard: handleDrawCard,
    declareUno: handleDeclareUno,
    currentPlayerId,
    refreshGameState,
    selectWildCardColor: handleSelectWildCardColor,
    isColorSelectionOpen,
    pendingWildCardId,
    closeColorSelector: handleCloseColorSelector,
    passTurn: handlePassTurn,
    hasPlayableCard,
    drawnCardPlayable,
    roomId,
    isLoading: isLoading || isResetting,
    error,
    startGame: handleStartGame,
    resetGame: handleResetGame,
    leaveRoom: handleLeaveRoom,
    promptColorSelection: (cardId: string) => {
      if (!state || state.currentPlayer !== currentPlayerId) {
        console.warn("Attempted to prompt color selection when not current player or state unavailable.")
        return
      }
      console.log('Prompting color selection for card:', cardId)
      setPendingWildCardId(cardId)
      setIsColorSelectionOpen(true)
    },
    cardScale,
    increaseCardSize,
    decreaseCardSize,
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
