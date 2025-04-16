"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { GameProvider } from "@/components/game-context"
import GameBoard from "@/components/game-board"
import WaitingRoom from "@/components/waiting-room"
import { getRoom } from "@/lib/game-actions"
import type { GameState } from "@/lib/types"

export default function RoomPage() {
  const { id } = useParams()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const roomData = await getRoom(id as string)
        setGameState(roomData)
      } catch (error) {
        console.error("Failed to fetch room:", error)
        setError("Failed to load the game room. It may not exist or has expired.")
      } finally {
        setLoading(false)
      }
    }

    fetchRoom()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-500 to-yellow-500">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-500 to-yellow-500">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return null
  }

  return (
    <GameProvider initialState={gameState} roomId={id as string}>
      {gameState.status === "waiting" ? <WaitingRoom /> : <GameBoard />}
    </GameProvider>
  )
}
