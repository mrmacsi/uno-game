"use client"

import React, { createContext, useContext, useEffect, useReducer, useState, type ReactNode, useRef, useCallback } from "react"
import pusherClient from "@/lib/pusher-client"
import type { GameState, GameAction, Card, CardColor, Player } from "@/lib/types"
import { playCard, drawCard, sayUno, getRoom, callUnoOnPlayer, endTurn, startGame as startGameAction } from "@/lib/game-actions"
import { getPlayerIdFromLocalStorage, addIsValidPlayFunction } from "@/lib/client-utils"
import { toast } from "@/hooks/use-toast"
import type { Channel } from "pusher-js"
import Pusher from 'pusher-js'
import { checkPlayValidity as checkPlayValidityClient } from '@/lib/utils'

type GameContextType = {
  state: GameState
  playCard: (cardId: string, selectedColor?: CardColor) => Promise<void>
  drawCard: () => Promise<void>
  sayUno: () => Promise<void>
  callUnoOnPlayer: (targetPlayerId: string) => Promise<void>
  currentPlayerId: string | null
  refreshGameState: () => Promise<void>
  selectWildCardColor: (color: "red" | "blue" | "green" | "yellow") => Promise<void>
  isColorSelectionOpen: boolean
  pendingWildCardId: string | null
  closeColorSelector: () => void
  endTurn: () => Promise<void>
  hasPlayableCard: () => boolean
  drawnCardPlayable: Card | null
  roomId: string | null
  isLoading: boolean
  error: string | null
  startGame: () => Promise<void>
}

const GameContext = createContext<GameContextType | undefined>(undefined)

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "UPDATE_GAME_STATE":
      return addIsValidPlayFunction({ ...action.payload })
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
  const processedInitialState = addIsValidPlayFunction(initialState)
  const [state, dispatch] = useReducer(gameReducer, processedInitialState)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    typeof window !== "undefined" ? getPlayerIdFromLocalStorage() : null
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  // State for wild card color selection
  const [isColorSelectionOpen, setIsColorSelectionOpen] = useState(false)
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null)
  
  // Keep track of last seen log entries to display new ones as toasts
  const previousLogRef = useRef<string[]>([])
  
  // State for drawn card playable
  const [drawnCardPlayable, setDrawnCardPlayable] = useState<Card | null>(null)
  
  // Function to update game state, implementing error handling
  const updateGameState = useCallback((newGameState: GameState) => {
    try {
      const processedState = addIsValidPlayFunction({ ...newGameState })
      dispatch({ type: "UPDATE_GAME_STATE", payload: processedState })
      setError(null)
    } catch (err) {
      console.error("[GameProvider] Error updating game state:", err)
      setError(err instanceof Error ? err.message : "Error updating game state")
    }
  }, [])
  
  // Monitor log changes and show toasts for new entries
  useEffect(() => {
    if (!state.log) {
      previousLogRef.current = []
      return
    }
    
    const prevLog = previousLogRef.current
    const currentLog = state.log
    
    // Only show toast for new log entries
    if (prevLog.length > 0 && currentLog.length > prevLog.length) {
      // Get the newest log entry
      const newestEntry = currentLog[currentLog.length - 1]
      if (!prevLog.includes(newestEntry)) {
        toast({
          description: newestEntry,
          duration: 3000,
        })
      }
    }
    
    // Update ref for next comparison
    previousLogRef.current = currentLog
  }, [state.log])

  // Log initial player ID
  useEffect(() => {
    console.log("[GameProvider] Initial player ID:", currentPlayerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for localStorage changes - ensure hooks are always called
  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("[GameProvider] Storage event detected, player ID:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    // Always set up event listener, but check value conditionally inside
    window.addEventListener("storage", handleStorageChange)
    
    // Also check once on mount
    const storedPlayerId = getPlayerIdFromLocalStorage()
    if (storedPlayerId !== currentPlayerId) {
      console.log("[GameProvider] Updated player ID on mount:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [currentPlayerId])

  // Debug the player ID and host status - always call hooks, conditional logic inside
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

  // Improved Pusher subscription with robust error handling
  useEffect(() => {
    let channel: Channel | null = null
    let pusher: Pusher | null = null
    
    const setupPusher = () => {
      if (!roomId) {
        console.warn("[GameProvider] No room ID provided, can't subscribe to Pusher")
        return
      }
      
      try {
        // Use existing pusherClient if available
        if (pusherClient) {
          console.log(`[GameProvider] Using existing Pusher client to subscribe to game-${roomId}`)
          channel = pusherClient.subscribe(`game-${roomId}`)
        } else {
          // As a fallback, create a new Pusher instance
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
        
        // Bind to the game-updated event
        channel.bind("game-updated", (data: GameState) => {
          console.log("[GameProvider] Received game-updated event:", data.players.length, "players")
          setDrawnCardPlayable(null)
          updateGameState(data)
        })
        
        // Bind to the drawn-card-playable event
        channel.bind("drawn-card-playable", (data: { playerId: string, card: Card }) => {
          console.log("[GameProvider] Received drawn-card-playable event for player:", data.playerId)
          if (data.playerId === currentPlayerId) {
            setDrawnCardPlayable(data.card)
          }
        })
        
        // Bind to room-deleted event
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
    
    // Cleanup function
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
  }, [roomId, currentPlayerId, updateGameState])

  // Reset drawnCardPlayable when turn changes
  useEffect(() => {
    if (state.currentPlayer !== currentPlayerId) {
      setDrawnCardPlayable(null)
    }
  }, [state.currentPlayer, currentPlayerId])

  const refreshGameState = async (): Promise<void> => {
    try {
      setIsLoading(true)
      console.log("[GameProvider] Manually refreshing game state for room:", roomId)
      const gameState = await getRoom(roomId)
      updateGameState(gameState)
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to refresh game state:", error)
      setError("Failed to refresh game state. Please try again.")
      setIsLoading(false)
    }
  }

  // Add a function to check if current player has any playable cards
  const hasPlayableCard = (): boolean => {
    if (!currentPlayerId || currentPlayerId !== state.currentPlayer) return false
    
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) return false
    
    // Check if any card in player's hand can be played
    return currentPlayer.cards.some(card => checkPlayValidityClient(state, card))
  }

  const handlePlayCard = async (cardId: string) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot play card: No player ID")
      return
    }
    if (state.status !== "playing") {
      console.error("[GameProvider] Cannot play card: Game is not in progress")
      toast({
        title: "Cannot Play Card",
        description: "Game is not in progress",
        variant: "destructive",
      })
      return
    }
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot play card: Not your turn")
      toast({
        title: "Cannot Play Card",
        description: "It's not your turn",
        variant: "destructive",
      })
      return
    }
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) {
      console.error("[GameProvider] Cannot play card: Player not found")
      return
    }
    const card = currentPlayer.cards.find(c => c.id === cardId)
    if (!card) {
      console.error("[GameProvider] Cannot play card: Card not found in player's hand")
      toast({
        title: "Cannot Play Card",
        description: "This card is no longer in your hand",
        variant: "destructive",
      })
      return
    }
    if (!checkPlayValidityClient(state, card)) {
      console.error("[GameProvider] Cannot play card: Card is not valid to play")
      toast({
        title: "Cannot Play Card",
        description: "This card cannot be played now",
        variant: "destructive",
      })
      return
    }
    if (card.type === "wild" || card.type === "wild4") {
      setIsColorSelectionOpen(true)
      setPendingWildCardId(cardId)
      return
    }
    try {
      setIsLoading(true)
      const playerHasCard = currentPlayer.cards.some(c => c.id === cardId)
      if (!playerHasCard) {
        console.error("[GameProvider] Cannot play card: Card no longer in hand")
        toast({
          title: "Card Error",
          description: "This card is no longer in your hand",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      await playCard(roomId, currentPlayerId, cardId)
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to play card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to play card",
        variant: "destructive",
      })
      setIsLoading(false)
      await refreshGameState()
    }
  }

  useEffect(() => {
    if (state.status !== "playing") return
    const interval = setInterval(() => {
      refreshGameState()
    }, 3000)
    return () => clearInterval(interval)
  }, [state.status, roomId])

  const handleDrawCard = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: No player ID")
      return
    }
    
    // Check if it's the player's turn
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: Not your turn")
      toast({
        title: "Cannot Draw Card",
        description: "It's not your turn",
        variant: "destructive",
      })
      return
    }
    
    // Check if player has already drawn this turn
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
      
      // Add toast notification that the player drew a card
      toast({
        title: "Card Drawn",
        description: "You drew a card from the pile",
        variant: "default",
      })
      
      // No need for setTimeout and manual state refresh - Pusher will update the state
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

  const handleSayUno = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot say UNO: No player ID")
      return
    }
    
    try {
      setIsLoading(true)
      await sayUno(roomId, currentPlayerId)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to say UNO:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to say UNO",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleCallUnoOnPlayer = async (targetPlayerId: string) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot call UNO: No player ID")
      return
    }
    
    try {
      setIsLoading(true)
      await callUnoOnPlayer(roomId, currentPlayerId, targetPlayerId)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Error calling UNO:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to call UNO on player",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleSelectWildCardColor = async (color: "red" | "blue" | "green" | "yellow") => {
    console.log(`[GameProvider] handleSelectWildCardColor called with color: ${color}, pending card: ${pendingWildCardId}`)
    if (!currentPlayerId || !pendingWildCardId) {
      console.error("[GameProvider] Cannot select color: Missing player or pending card ID")
      toast({
        title: "Error",
        description: "Cannot select color: Missing player or pending card ID.",
        variant: "destructive",
      })
      // Close modal just in case
      setIsColorSelectionOpen(false)
      setPendingWildCardId(null)
      return
    }

    const cardToPlay = pendingWildCardId

    try {
      setIsLoading(true)
      console.log(`[GameProvider] Attempting to play wild card ${cardToPlay} with color ${color}`)
      // Call the server action with the color
      await playCard(roomId, currentPlayerId, cardToPlay, color)
      console.log(`[GameProvider] Successfully called playCardAction for ${cardToPlay}`)
      // If successful, close modal
      setIsColorSelectionOpen(false)
      setPendingWildCardId(null)
      setIsLoading(false)
    } catch (error) {
      // Log specific error, show toast
      console.error(`[GameProvider] Failed to play wild card ${cardToPlay}:`, error)
      toast({
        title: "Failed to Play Card",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
      // Ensure modal closes even on error
      setIsColorSelectionOpen(false)
      setPendingWildCardId(null)
      setIsLoading(false)
    }
  }
  
  const handleCloseColorSelector = () => {
    setIsColorSelectionOpen(false)
    setPendingWildCardId(null)
  }

  const handleEndTurn = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot end turn: No player ID")
      return
    }
    
    // Check if the game is in playing status
    if (state.status !== "playing") {
      console.error("[GameProvider] Cannot end turn: Game is not in progress")
      toast({
        title: "Cannot End Turn",
        description: "Game is not in progress yet",
        variant: "destructive",
      })
      return
    }
    
    // Check if it's the player's turn
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot end turn: Not your turn")
      toast({
        title: "Cannot End Turn",
        description: "It's not your turn",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsLoading(true)
      await endTurn(roomId, currentPlayerId)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to end turn:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end turn",
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
      await startGameAction(roomId)
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
  
  return (
    <GameContext.Provider
      value={{
        state,
        playCard: handlePlayCard,
        drawCard: handleDrawCard,
        sayUno: handleSayUno,
        callUnoOnPlayer: handleCallUnoOnPlayer,
        currentPlayerId,
        refreshGameState,
        selectWildCardColor: handleSelectWildCardColor,
        isColorSelectionOpen,
        pendingWildCardId,
        closeColorSelector: handleCloseColorSelector,
        endTurn: handleEndTurn,
        hasPlayableCard,
        drawnCardPlayable,
        roomId,
        isLoading,
        error,
        startGame: handleStartGame
      }}
    >
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
