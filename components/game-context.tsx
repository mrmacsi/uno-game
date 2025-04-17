"use client"

import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from "react"
import pusherClient from "@/lib/pusher-client"
import type { GameState, GameAction } from "@/lib/types"
import { playCard, drawCard, sayUno, getRoom, callUnoOnPlayer } from "@/lib/game-actions"
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

  // Log initial player ID
  useEffect(() => {
    console.log("[GameProvider] Initial player ID:", currentPlayerId)
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

  const handlePlayCard = async (cardId: string) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot play card: No player ID")
      return
    }
    
    // Get the card from the player's hand
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) return
    
    const card = currentPlayer.cards.find(c => c.id === cardId)
    if (!card) return
    
    // If it's a wild card, open the color selector
    if (card.type === "wild" || card.type === "wild4" || card.type === "wildSwap") {
      setIsColorSelectionOpen(true)
      setPendingWildCardId(cardId)
      return
    }
    
    // For non-wild cards, play immediately
    await playCard(roomId, currentPlayerId, cardId)
    toast({ description: `Played ${card.type === "number" ? card.value : card.type.toUpperCase()} ${card.color.toUpperCase()}` })
  }

  const handleDrawCard = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: No player ID")
      return
    }
    await drawCard(roomId, currentPlayerId)
    toast({ description: "You drew a card" })
  }

  const handleSayUno = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot say UNO: No player ID")
      return
    }
    await sayUno(roomId, currentPlayerId)
    toast({ description: "UNO!" })
  }

  const handleCallUnoOnPlayer = async (targetPlayerId: string) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot call UNO: No player ID")
      return
    }
    try {
      await callUnoOnPlayer(roomId, currentPlayerId, targetPlayerId)
      toast({ description: "Called UNO on player" })
    } catch (error) {
      console.error("[GameProvider] Error calling UNO:", error)
    }
  }

  const handleSelectWildCardColor = async (color: "red" | "blue" | "green" | "yellow") => {
    if (!pendingWildCardId || !currentPlayerId) {
      console.error("[GameProvider] Cannot select color: No pending wild card or player ID")
      return
    }
    
    // First play the card
    await playCard(roomId, currentPlayerId, pendingWildCardId, color)
    toast({ description: `Changed color to ${color.toUpperCase()}` })
    
    // Reset wild card state
    setIsColorSelectionOpen(false)
    setPendingWildCardId(null)
  }
  
  const handleCloseColorSelector = () => {
    setIsColorSelectionOpen(false)
    setPendingWildCardId(null)
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
        closeColorSelector: handleCloseColorSelector
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
