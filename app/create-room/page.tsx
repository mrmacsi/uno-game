"use client"
export const dynamic = "force-dynamic";

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createRoom } from "@/lib/game-actions"
import { Home, User, Sparkles, ArrowRight } from "lucide-react"
import { storePlayerIdInLocalStorage, generateClientUUID } from "@/lib/client-utils"
import { generateRandomName } from "@/lib/name-generator"

export default function CreateRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  
  useEffect(() => {
    // Generate a random name for the player on component mount
    setPlayerName(generateRandomName())
  }, [])
  
  const generateNewRandomName = () => {
    setPlayerName(generateRandomName())
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setIsCreating(true)
    try {
      const roomId = await createRoom(playerName)
      
      // Generate a client-side ID and store it in localStorage
      const clientPlayerId = generateClientUUID()
      storePlayerIdInLocalStorage(clientPlayerId)
      
      // Navigate to the room
      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error("Failed to create room:", error)
      setIsCreating(false)
    }
  }

  const goToHome = () => {
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 flex flex-col items-center justify-center p-2 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-sm border border-white/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="relative space-y-1 pb-4 px-4 sm:px-6 pt-6 sm:pt-8">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 rounded-full" 
              onClick={goToHome}
            >
              <Home className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl sm:text-2xl font-bold">Create a Game Room</CardTitle>
            <CardDescription className="text-gray-600">Set up a new UNO game and invite friends</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateRoom}>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex justify-between items-center text-gray-700">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <span>Your Name</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs px-2 flex items-center gap-1 rounded-full hover:bg-gray-100" 
                      onClick={generateNewRandomName}
                    >
                      <Sparkles className="h-3 w-3" />
                      Random Name
                    </Button>
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="pr-4 rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-6 px-4 sm:px-6">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 sm:py-5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2"
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
                className="w-full rounded-xl border-2 text-gray-700 hover:bg-gray-50" 
                onClick={goToHome}
              >
                Back to Home
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
