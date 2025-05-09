"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { GameState } from "@/lib/types"
import { GameProvider } from "@/components/providers/game-context"
import GameViewSelector from "@/components/game/game-view-selector"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import { getBotPlay } from "@/lib/game-logic"

const BOT_TURN_DELAY_MS = 1500;

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

  useEffect(() => {
    const currentPlayer = initialGameState.players.find(player => player.id === initialGameState.currentPlayer)

    const handleBotTurn = async () => {
      if (!initialGameState.currentPlayer) return; // Guard against null currentPlayerId
      const botPlayResult = getBotPlay(initialGameState, initialGameState.currentPlayer)

      try {
        if (botPlayResult.action === 'play') {
          const body: any = {
            roomId: initialGameState.roomId,
            playerId: initialGameState.currentPlayer,
            card: botPlayResult.card,
          }
          if (botPlayResult.chosenColor) {
            body.chosenColor = botPlayResult.chosenColor
          }
          const response = await fetch('/api/game/play-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            console.error('Failed to play card:', response.statusText)
          }

        } else if (botPlayResult.action === 'draw') {
          const response = await fetch('/api/game/draw-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId: initialGameState.roomId, playerId: initialGameState.currentPlayer }),
          })

          if (!response.ok) {
            console.error('Failed to draw card:', response.statusText)
          }
        }
      } catch (error) {
        console.error('Error during bot turn:', error)
      }
    }

    let turnTimeoutId: NodeJS.Timeout | undefined;

    if (currentPlayer?.isBot && initialGameState.status === "playing") {
      turnTimeoutId = setTimeout(() => {
        handleBotTurn();
      }, BOT_TURN_DELAY_MS);
    }

    return () => {
      if (turnTimeoutId) {
        clearTimeout(turnTimeoutId);
      }
    };
  }, [initialGameState.currentPlayer, initialGameState.players, initialGameState.status, initialGameState.roomId, initialGameState]) // initialGameState is intentionally included as per original code


  return (
    <GameProvider initialState={initialGameState} roomId={initialGameState.roomId}>
      <GameViewSelector />
    </GameProvider>
  )
}
