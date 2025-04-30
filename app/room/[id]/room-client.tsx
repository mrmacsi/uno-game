"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { GameState } from "@/lib/types"
import { GameProvider } from "@/components/providers/game-context"
import GameViewSelector from "@/components/game/game-view-selector"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"

export default function RoomClientContent({ initialGameState }: { initialGameState: GameState }) {
  const router = useRouter()

  useEffect(() => {
    const storedPlayerId = getPlayerIdFromLocalStorage()
    
    // If there's no player ID stored, redirect to join room
    if (!storedPlayerId) {
      router.push(`/join-room?roomId=${initialGameState.roomId}`)
      return
    }
    
    // Check if the player is already in the room
    const isPlayerInRoom = initialGameState.players.some(p => p.id === storedPlayerId)
    
    // If player is not in the room, redirect to join room
    if (!isPlayerInRoom) {
      // For games in progress, only redirect if player is not in the room
      router.push(`/join-room?roomId=${initialGameState.roomId}`)
    }
  }, [initialGameState.roomId, initialGameState.players, router])

  return (
    <GameProvider initialState={initialGameState} roomId={initialGameState.roomId}>
      <GameViewSelector />
    </GameProvider>
  )
} 