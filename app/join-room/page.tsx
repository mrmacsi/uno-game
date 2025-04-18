"use client"
export const dynamic = "force-dynamic";

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { joinRoom } from "@/lib/game-actions"
import { storePlayerIdInLocalStorage } from "@/lib/client-utils"
import { generateRandomName } from "@/lib/name-generator"
import { Home, User, Wand2, KeyRound, ShieldAlert, ArrowRight, Globe } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function JoinRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [nameError, setNameError] = useState("")
  const [roomIdError, setRoomIdError] = useState("")
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const roomIdParam = params.get('roomId')
      if (roomIdParam) {
        setRoomId(roomIdParam)
        setIsDefault(roomIdParam === "DEFAULT")
      }
    }
    setPlayerName(generateRandomName())
  }, [])

  const generateNewRandomName = () => {
    setPlayerName(generateRandomName())
    setNameError("")
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Reset errors
    setNameError("")
    setRoomIdError("")
    setError("")
    
    // Validate inputs
    let hasError = false
    
    if (!playerName.trim()) {
      setNameError("Please enter a name")
      hasError = true
    } else if (playerName.length > 25) {
      setNameError("Name must be 25 characters or less")
      hasError = true
    }
    
    if (!roomId.trim() && !isDefault) {
      setRoomIdError("Please enter a room code")
      hasError = true
    }
    
    if (hasError) return

    setIsJoining(true)

    try {
      const playerId = await joinRoom(roomId, playerName)
      
      // Store the player ID in localStorage using our utility function
      storePlayerIdInLocalStorage(playerId)
      
      // Navigate to the room
      router.push(`/room/${roomId}`)
    } catch (error: unknown) {
      console.error("Failed to join room:", error)
      setError(error instanceof Error ? error.message : "Failed to join room. Please check the room code and try again.")
      setIsJoining(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 border border-white/20 dark:border-gray-800/40 shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="relative space-y-1 pb-4 px-5 sm:px-6 pt-6 sm:pt-8">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full" 
              onClick={() => router.push("/")}
            >
              <Home className="h-5 w-5" />
            </Button>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Join Game Room</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">
                {isDefault ? 
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-green-500" />
                    Join the public default room - no code needed!
                  </span> : 
                  "Enter a room code to join an existing UNO game"
                }
              </CardDescription>
            </motion.div>
          </CardHeader>
          <form onSubmit={handleJoinRoom}>
            <CardContent className="space-y-5 px-5 sm:px-6">
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      <span>Your Name</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs px-2 flex items-center gap-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300" 
                      onClick={generateNewRandomName}
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Random Name
                    </Button>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value)
                      if (nameError) setNameError("")
                    }}
                    className={`rounded-xl border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all ${nameError ? 'border-red-500 dark:border-red-500' : ''}`}
                    required
                    maxLength={25}
                    autoComplete="off"
                  />
                  {nameError && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{nameError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomId" className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <KeyRound className="h-4 w-4" />
                    <span>Room Code {isDefault && "(Pre-filled)"}</span>
                  </Label>
                  <Input
                    id="roomId"
                    placeholder="Enter room code"
                    value={roomId}
                    onChange={(e) => {
                      setRoomId(e.target.value.toUpperCase())
                      if (roomIdError) setRoomIdError("")
                    }}
                    className={`font-mono rounded-xl border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all uppercase ${roomIdError ? 'border-red-500 dark:border-red-500' : ''}`}
                    required
                    disabled={isDefault}
                  />
                  {roomIdError && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{roomIdError}</p>
                  )}
                  {isDefault && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      Default public room is always available
                    </p>
                  )}
                </div>
                
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm flex gap-2 items-center"
                    >
                      <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                      <p>{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-6 px-5 sm:px-6">
              <motion.div 
                className="w-full space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-800 dark:hover:from-blue-700 dark:hover:to-blue-900 text-white py-5 sm:py-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <>
                      Join {isDefault ? "Default " : ""}Room
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full rounded-xl border-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700" 
                  onClick={() => router.push("/")}
                >
                  Back to Home
                </Button>
              </motion.div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </main>
  )
}