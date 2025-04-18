"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { GameProvider } from "@/components/game-context"
import GameBoard from "@/components/game-board"
import WaitingRoom from "@/components/waiting-room"
import { getRoom } from "@/lib/game-actions"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import type { GameState } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, AlertCircle, Home, RefreshCw, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  const paramsObj = React.use(params)
  const roomId = paramsObj.id

  // Get player ID from localStorage
  useEffect(() => {
    const getPlayerData = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("RoomPage: Retrieved player ID from localStorage:", storedPlayerId)
      
      if (!storedPlayerId) {
        console.error("No player ID found in localStorage, redirecting to join room")
        router.push(`/join-room?roomId=${roomId}`)
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
  }, [id, router, playerId, retryCount, roomId])

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
    const intervalId = setInterval(fetchRoom, 2000)
    
    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [id, playerId, router, retryCount])

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 p-3 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 p-6 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/40 flex flex-col items-center"
        >
          <Loader2 className="h-10 w-10 text-red-600 dark:text-red-400 animate-spin mb-3" />
          <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200">Loading Game</h3>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Connecting to UNO room...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 p-3 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full backdrop-blur-xl border border-white/20 dark:border-gray-800/40"
        >
          <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
            <AlertCircle className="h-7 w-7" />
            <h2 className="text-xl sm:text-2xl font-bold">Connection Error</h2>
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 mb-5 text-sm sm:text-base">
            {error}
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={handleRetry}
              className="w-full px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-500 dark:text-gray-400">or rejoin the game</span>
              </div>
            </div>
            
            <form onSubmit={handleRejoin} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Your Name
                </label>
                <Input
                  className="w-full border rounded-xl px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter your name to rejoin"
                  value={rejoinName}
                  onChange={e => setRejoinName(e.target.value)}
                  required
                  disabled={isRejoining}
                />
              </div>
              
              <AnimatePresence>
                {rejoinError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-600 dark:text-red-400 text-xs sm:text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded-lg"
                  >
                    {rejoinError}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <Button
                type="submit"
                className="w-full px-4 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:hover:bg-red-600"
                disabled={isRejoining}
              >
                {isRejoining ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    <span>Rejoining...</span>
                  </div>
                ) : "Rejoin Room"}
              </Button>
            </form>
            
            <Button 
              onClick={() => router.push("/")}
              className="w-full px-4 py-4 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-all"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!gameState) {
    return null
  }

  return (
    <GameProvider initialState={gameState} roomId={id as string}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen"
      >
        {gameState.status === "waiting" ? <WaitingRoom /> : <GameBoard />}
      </motion.div>
    </GameProvider>
  )
}