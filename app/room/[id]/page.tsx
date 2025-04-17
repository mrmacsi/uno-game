"use client"

"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GameProvider } from "@/components/game-context"
import GameBoard from "@/components/game-board"
import WaitingRoom from "@/components/waiting-room"
import { getRoom } from "@/lib/game-actions"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import type { GameState } from "@/lib/types"

export default function RoomPage() {
  const router = useRouter()
  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : undefined
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [playerId, setPlayerId] = useState<string | null>(null)

  // Get player ID from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("RoomPage: Retrieved player ID from localStorage:", storedPlayerId)
      
      if (!storedPlayerId) {
        console.error("No player ID found in localStorage, redirecting to join room")
        router.push(`/join-room?roomId=${id}`)
        return
      }
      
      setPlayerId(storedPlayerId)
    }
  }, [id, router])

  // Fetch room data when player ID is available
  useEffect(() => {
    if (!playerId) return; // Don't fetch if player ID is not available
    
    const fetchRoom = async () => {
      try {
        console.log(`Fetching room data for room ${id} with player ID ${playerId}`)
        const roomData = await getRoom(id as string)
        console.log("Received room data:", roomData)
        
        // Check if player exists in the room
        if (!roomData.players.some(p => p.id === playerId)) {
          console.error("Player not found in room, redirecting to join room")
          router.push(`/join-room?roomId=${id}`)
          return
        }
        
        setGameState(roomData)
        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch room:", error)
        setError("Failed to load the game room. It may not exist or has expired.")
        setLoading(false)
      }
    }

    fetchRoom()

    // Poll for game state updates as a fallback in case Pusher fails
    const intervalId = setInterval(fetchRoom, 3000)
    
    return () => {
      clearInterval(intervalId)
    }
  }, [id, playerId, router])

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
          <div className="mt-4">
            <button 
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Home
            </button>
          </div>
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
