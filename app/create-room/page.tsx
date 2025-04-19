"use client"
export const dynamic = "force-dynamic";

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createRoom } from "@/lib/room-actions"
import { Home, User, ArrowRight, Wand2 } from "lucide-react"
import { storePlayerIdInLocalStorage } from "@/lib/client-utils"
import { generateRandomName } from "@/lib/name-generator"
import { motion } from "framer-motion"

export default function CreateRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [nameError, setNameError] = useState("")
  
  useEffect(() => {
    // Generate a random name for the player on component mount
    setPlayerName(generateRandomName())
  }, [])
  
  const generateNewRandomName = () => {
    setPlayerName(generateRandomName())
    setNameError("")
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!playerName.trim()) {
      setNameError("Please enter a name")
      return
    }
    
    if (playerName.length > 15) {
      setNameError("Name must be 15 characters or less")
      return
    }

    setIsCreating(true)
    try {
      const { roomId, playerId } = await createRoom(playerName)
      
      // Store the server-generated player ID in localStorage
      storePlayerIdInLocalStorage(playerId) 
      
      router.push(`/room/${roomId}`)
      
      // Generate a client-side ID and store it in localStorage
      // const clientPlayerId = generateClientUUID()
      // storePlayerIdInLocalStorage(clientPlayerId)
    } catch (error) {
      console.error("Failed to create room:", error)
      setIsCreating(false)
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
              <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Create Game Room</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-1">Set up a new UNO game and invite friends</CardDescription>
            </motion.div>
          </CardHeader>
          <form onSubmit={handleCreateRoom}>
            <CardContent className="px-5 sm:px-6">
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
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => {
                        setPlayerName(e.target.value)
                        if (nameError) setNameError("")
                      }}
                      className={`pr-4 rounded-xl border-gray-300 dark:border-gray-700 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-500 dark:focus:ring-red-400 transition-all ${nameError ? 'border-red-500 dark:border-red-500' : ''}`}
                      required
                      maxLength={15}
                      autoComplete="off"
                    />
                    {nameError && (
                      <p className="text-red-500 text-xs mt-1 ml-1">{nameError}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                    Choose a fun name - this is how other players will see you
                  </p>
                </div>
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
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-600 dark:to-red-800 dark:hover:from-red-700 dark:hover:to-red-900 text-white py-5 sm:py-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <>
                      Create Room
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