"use client"

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode, useRef } from "react"
import pusherClient from "@/lib/pusher-client"
import type { GameState, GameAction, Card } from "@/lib/types"
import { playCard, drawCard, sayUno, getRoom, callUnoOnPlayer, endTurn } from "@/lib/game-actions"
import { getPlayerIdFromLocalStorage, addIsValidPlayFunction } from "@/lib/client-utils"
import { toast } from "@/hooks/use-toast"

type GameContextType = {
  state: GameState
  playCard: (cardId: string) => Promise<void>
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
  
  // State for wild card color selection
  const [isColorSelectionOpen, setIsColorSelectionOpen] = useState(false)
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null)
  
  // Keep track of last seen log entries to display new ones as toasts
  const previousLogRef = useRef<string[]>([]);
  
  // Monitor log changes and show toasts for new entries
  useEffect(() => {
    if (!state.log) return;
    
    const prevLog = previousLogRef.current;
    const currentLog = state.log;
    
    // Only show toast for new log entries
    if (prevLog.length > 0 && currentLog.length > prevLog.length) {
      // Get the newest log entry
      const newestEntry = currentLog[currentLog.length - 1];
      if (!prevLog.includes(newestEntry)) {
        toast({
          description: newestEntry,
          duration: 3000,
        });
      }
    }
    
    // Update ref for next comparison
    previousLogRef.current = currentLog;
  }, [state.log]);

  // Log initial player ID
  useEffect(() => {
    console.log("[GameProvider] Initial player ID:", currentPlayerId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("[GameProvider] Storage event detected, player ID:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange)
      
      // Also check once on mount
      const storedPlayerId = getPlayerIdFromLocalStorage()
      if (storedPlayerId !== currentPlayerId) {
        console.log("[GameProvider] Updated player ID on mount:", storedPlayerId)
        setCurrentPlayerId(storedPlayerId)
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange)
      }
    }
  }, [currentPlayerId])

  // Debug the player ID and host status
  useEffect(() => {
    if (currentPlayerId) {
      const playerInGame = state.players.find(p => p.id === currentPlayerId)
      console.log("[GameProvider] Current player ID:", currentPlayerId)
      console.log("[GameProvider] Current player in game:", playerInGame)
      console.log("[GameProvider] Players in room:", state.players)
      console.log("[GameProvider] Is host:", playerInGame?.isHost)
      console.log("[GameProvider] Total players:", state.players.length)
    } else {
      console.warn("[GameProvider] No player ID available")
    }
  }, [currentPlayerId, state.players])

  useEffect(() => {
    if (!pusherClient || !roomId) return;

    const channelName = `game-${roomId}`;
    console.log(`[GameProvider] Subscribing to Pusher channel: ${channelName}`);

    const channel = pusherClient.subscribe(channelName);

    channel.bind("game-updated", (data: GameState) => {
      console.log("[GameProvider] Received game update via Pusher:", data);
      dispatch({ type: "UPDATE_GAME_STATE", payload: data });
    });

    return () => {
      console.log(`[GameProvider] Unsubscribing from Pusher channel: ${channelName}`);
      channel.unbind_all();
      pusherClient?.unsubscribe(channelName);
    };
  }, [roomId, currentPlayerId]);

  const refreshGameState = async (): Promise<void> => {
    try {
      console.log("[GameProvider] Manually refreshing game state for room:", roomId)
      const gameState = await getRoom(roomId)
      dispatch({ type: "UPDATE_GAME_STATE", payload: gameState })
    } catch (error) {
      console.error("[GameProvider] Failed to refresh game state:", error)
    }
  }

  // Add a function to check if current player has any playable cards
  const hasPlayableCard = (): boolean => {
    if (!currentPlayerId || currentPlayerId !== state.currentPlayer) return false
    
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) return false
    
    // Check if any card in player's hand can be played
    return currentPlayer.cards.some(card => state.isValidPlay(card))
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
    
    // Get the card from the player's hand
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) {
      console.error("[GameProvider] Cannot play card: Player not found")
      return
    }
    
    const card = currentPlayer.cards.find(c => c.id === cardId)
    if (!card) {
      console.error("[GameProvider] Cannot play card: Card not found in player's hand")
      return
    }
    
    // Verify the card is playable
    if (!state.isValidPlay(card)) {
      console.error("[GameProvider] Cannot play card: Card is not valid to play")
      toast({
        title: "Cannot Play Card",
        description: "This card cannot be played now",
        variant: "destructive",
      })
      return
    }
    
    // If it's a wild card, open the color selector
    if (card.type === "wild" || card.type === "wild4") {
      setIsColorSelectionOpen(true)
      setPendingWildCardId(cardId)
      return
    }
    
    // For non-wild cards, play immediately
    try {
      await playCard(roomId, currentPlayerId, cardId)
    } catch (error) {
      console.error("[GameProvider] Error playing card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to play card",
        variant: "destructive",
      })
    }
  }

  const handleDrawCard = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: No player ID")
      return
    }
    
    if (!roomId) {
      console.error("[GameProvider] Cannot draw card: No room ID")
      return
    }
    
    if (state.hasDrawnThisTurn) {
      console.error("[GameProvider] Cannot draw again: Player has already drawn this turn")
      return
    }
    
    try {
      await drawCard(roomId, currentPlayerId)
      
      // Add toast notification that the player drew a card
      toast({
        title: "Card Drawn",
        description: "You drew a card from the pile",
        variant: "default",
      })
      
      // After drawing, check if the player can play any card
      // If not, automatically end their turn
      setTimeout(async () => {
        const refreshedState = await getRoom(roomId)
        dispatch({ type: "UPDATE_GAME_STATE", payload: refreshedState })
        
        // If the player doesn't have a playable card after drawing, automatically end turn
        if (refreshedState.hasDrawnThisTurn && refreshedState.currentPlayer === currentPlayerId) {
          const currentPlayer = refreshedState.players.find(p => p.id === currentPlayerId)
          if (currentPlayer) {
            const canPlayAnyCard = currentPlayer.cards.some(card => refreshedState.isValidPlay(card))
            if (!canPlayAnyCard) {
              // Automatically end turn if player can't play any card
              await handleEndTurn()
            }
          }
        }
      }, 500) // Short delay to allow state to update
    } catch (error) {
      console.error("[GameProvider] Failed to draw card:", error)
      toast({
        title: "Error",
        description: "Failed to draw card",
        variant: "destructive",
      })
    }
  }

  const handleSayUno = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot say UNO: No player ID")
      return
    }
    await sayUno(roomId, currentPlayerId)
  }

  const handleCallUnoOnPlayer = async (targetPlayerId: string) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot call UNO: No player ID")
      return
    }
    try {
      await callUnoOnPlayer(roomId, currentPlayerId, targetPlayerId)
    } catch (error) {
      console.error("[GameProvider] Error calling UNO:", error)
    }
  }

  const handleSelectWildCardColor = async (color: "red" | "blue" | "green" | "yellow") => {
    if (!pendingWildCardId || !currentPlayerId) {
      console.error("[GameProvider] Cannot select color: No pending wild card or player ID")
      return
    }
    
    // Verify the wild card is still in player's hand
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) {
      console.error("[GameProvider] Cannot select color: Player not found")
      setIsColorSelectionOpen(false)
      setPendingWildCardId(null)
      return
    }
    
    const card = currentPlayer.cards.find(c => c.id === pendingWildCardId)
    if (!card) {
      console.error("[GameProvider] Cannot select color: Wild card not found in player's hand")
      toast({
        title: "Error",
        description: "The card is no longer available",
        variant: "destructive",
      })
      setIsColorSelectionOpen(false)
      setPendingWildCardId(null)
      return
    }
    
    // First play the card
    try {
      await playCard(roomId, currentPlayerId, pendingWildCardId, color)
    } catch (error) {
      console.error("[GameProvider] Error playing wild card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to play wild card",
        variant: "destructive",
      })
    } finally {
      // Reset wild card state
      setIsColorSelectionOpen(false)
      setPendingWildCardId(null)
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
      const response = await fetch("/api/end-turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          playerId: currentPlayerId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to end turn")
      }
    } catch (error) {
      console.error("[GameProvider] Failed to end turn:", error)
      toast({
        title: "Error",
        description: "Failed to end turn",
        variant: "destructive",
      })
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
        hasPlayableCard
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
