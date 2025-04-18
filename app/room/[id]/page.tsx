"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GameProvider } from "@/components/game-context"
import GameBoard from "@/components/game-board"
import WaitingRoom from "@/components/waiting-room"
import { getRoom } from "@/lib/game-actions"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import type { GameState } from "@/lib/types"

import React from "react"

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = React.use(params)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [rejoinName, setRejoinName] = useState("")
  const [isRejoining, setIsRejoining] = useState(false)
  const [rejoinError, setRejoinError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  // Get player ID from localStorage
  useEffect(() => {
    const getPlayerData = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("RoomPage: Retrieved player ID from localStorage:", storedPlayerId)
      
      if (!storedPlayerId) {
        console.error("No player ID found in localStorage, redirecting to join room")
        router.push(`/join-room?roomId=${id}`)
        return
      }
      
      setPlayerId(storedPlayerId)
    }
    
    getPlayerData()
    
    // Add a small delay and retry for iOS devices that might need time to access storage
    const timerId = setTimeout(() => {
      if (!playerId && retryCount < maxRetries) {
        getPlayerData()
        setRetryCount(prev => prev + 1)
      }
    }, 500)
    
    return () => clearTimeout(timerId)
  }, [id, router, playerId, retryCount])

  // Fetch room data when player ID is available
  useEffect(() => {
    if (!playerId) return
    
    let isMounted = true
    const fetchRoom = async () => {
      try {
        console.log(`Fetching room data for room ${id} with player ID ${playerId}`)
        const roomData = await getRoom(id as string)
        
        if (!isMounted) return
        console.log("Received room data:", roomData)
        
        // Check if player exists in the room
        if (!roomData.players.some(p => p.id === playerId)) {
          console.error("Player not found in room, redirecting to join room")
          router.push(`/join-room?roomId=${id}`)
          return
        }
        
        setGameState(roomData)
        setLoading(false)
        setError("")
      } catch (error) {
        console.error("Failed to fetch room:", error)
        
        if (!isMounted) return
        
        // Only set error after multiple failed attempts
        if (retryCount >= maxRetries) {
          setError("Failed to load the game room. It may not exist or has expired.")
        } else {
          setRetryCount(prev => prev + 1)
          console.log(`Retry attempt ${retryCount + 1}/${maxRetries}`)
        }
        
        setLoading(false)
      }
    }

    fetchRoom()

    // Poll for game state updates as a fallback in case Pusher fails
    // Use more frequent polling on mobile devices
    const intervalId = setInterval(fetchRoom, 2000)
    
    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [id, playerId, router, retryCount])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-500 to-yellow-500 p-2 sm:p-0">
        <div className="text-white text-lg sm:text-xl">Loading game...</div>
      </div>
    )
  }

  if (error) {
    const handleRejoin = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!rejoinName.trim()) return
      setIsRejoining(true)
      setRejoinError("")
      try {
        const { joinRoom } = await import("@/lib/game-actions")
        const { storePlayerIdInLocalStorage } = await import("@/lib/client-utils")
        const playerId = await joinRoom(id as string, rejoinName)
        storePlayerIdInLocalStorage(playerId)
        window.location.reload()
      } catch (err) {
        setRejoinError(err instanceof Error ? err.message : "Failed to rejoin room. Please try again.")
        setIsRejoining(false)
      }
    }
    
    const handleRetry = () => {
      setError("")
      setLoading(true)
      setRetryCount(0)
    }
    
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-red-500 to-yellow-500 p-2 sm:p-0">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-lg sm:text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4 text-sm sm:text-base">{error}</p>
          
          <button 
            onClick={handleRetry}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4 text-sm sm:text-base"
          >
            Try Again
          </button>
          
          <form onSubmit={handleRejoin} className="space-y-2">
            <input
              className="w-full border rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Enter your name to rejoin"
              value={rejoinName}
              onChange={e => setRejoinName(e.target.value)}
              required
              disabled={isRejoining}
            />
            {rejoinError && <div className="text-red-600 text-xs sm:text-sm">{rejoinError}</div>}
            <button
              type="submit"
              className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60 text-sm sm:text-base"
              disabled={isRejoining}
            >
              {isRejoining ? "Rejoining..." : "Rejoin Room"}
            </button>
          </form>
          <div className="mt-4">
            <button 
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 w-full mt-2 text-sm sm:text-base"
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
