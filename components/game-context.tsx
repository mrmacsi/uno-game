"use client"

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react"
import pusherClient from "@/lib/pusher-client"
import type { GameState, GameAction } from "@/lib/types"
import { playCard, drawCard, sayUno } from "@/lib/game-actions"

type GameContextType = {
  state: GameState
  playCard: (cardId: string) => Promise<void>
  drawCard: () => Promise<void>
  sayUno: () => Promise<void>
  currentPlayerId: string | null
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
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const currentPlayerId = typeof window !== "undefined" ? localStorage.getItem("playerId") : null

  useEffect(() => {
    // Initialize Pusher
    if (pusherClient) {
      // Subscribe to the game room channel
      const channel = pusherClient.subscribe(`game-${roomId}`)

      // Listen for game state updates
      channel.bind("game-updated", (data: GameState) => {
        dispatch({ type: "UPDATE_GAME_STATE", payload: data })
      })

      return () => {
        channel.unbind_all()
        channel.unsubscribe()
        pusherClient.disconnect()
      }
    }
  }, [roomId])

  const handlePlayCard = async (cardId: string) => {
    if (!currentPlayerId) return
    await playCard(roomId, currentPlayerId, cardId)
  }

  const handleDrawCard = async () => {
    if (!currentPlayerId) return
    await drawCard(roomId, currentPlayerId)
  }

  const handleSayUno = async () => {
    if (!currentPlayerId) return
    await sayUno(roomId, currentPlayerId)
  }

  return (
    <GameContext.Provider
      value={{
        state,
        playCard: handlePlayCard,
        drawCard: handleDrawCard,
        sayUno: handleSayUno,
        currentPlayerId,
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
