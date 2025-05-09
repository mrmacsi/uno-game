"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { GameState } from "@/lib/types"
import { GameProvider } from "@/components/providers/game-context"
import GameViewSelector from "@/components/game/game-view-selector"
import BotTurnHandler from "@/components/game/bot-turn-handler"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"

export default function RoomClientContent({ initialGameState }: { initialGameState: GameState }) {
  const router = useRouter()

  useEffect(() => {
    const storedPlayerId = getPlayerIdFromLocalStorage()
    
    if (!storedPlayerId) {
      router.push(`/join-room?roomId=${initialGameState.roomId}`)
      return
    }
    
    const isPlayerInRoom = initialGameState.players.some(p => p.id === storedPlayerId)
    
    if (!isPlayerInRoom) {
      router.push(`/join-room?roomId=${initialGameState.roomId}`)
    }
  }, [initialGameState.roomId, initialGameState.players, router])

  return (
    <GameProvider initialState={initialGameState} roomId={initialGameState.roomId}>
      <GameViewSelector />
      <BotTurnHandler />
    </GameProvider>
  )
}
