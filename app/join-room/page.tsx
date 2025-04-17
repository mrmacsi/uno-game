"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { joinRoom } from "@/lib/game-actions"
import { storePlayerIdInLocalStorage } from "@/lib/client-utils"
import { generateRandomName } from "@/lib/name-generator"
import { Home, User, Sparkles, KeyRound, ShieldAlert, ArrowRight } from "lucide-react"

export default function JoinRoom() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [playerName, setPlayerName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Get roomId from URL query parameter if available
    const roomIdParam = searchParams.get("roomId")
    if (roomIdParam) {
      setRoomId(roomIdParam)
    }
    
    // Generate a random name for the player
    setPlayerName(generateRandomName())
  }, [searchParams])
  
  const generateNewRandomName = () => {
    setPlayerName(generateRandomName())
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim() || !roomId.trim()) return

    setIsJoining(true)
    setError("")

    try {
      const playerId = await joinRoom(roomId, playerName)
      
      // Store the player ID in localStorage using our utility function
      storePlayerIdInLocalStorage(playerId)
      
      // Navigate to the room
      router.push(`/room/${roomId}`)
    } catch (error: any) {
      console.error("Failed to join room:", error)
      setError(error.message || "Failed to join room. Please check the room code and try again.")
      setIsJoining(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <Card className="backdrop-blur-sm border border-white/20 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="relative space-y-1 pb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 rounded-full" 
              onClick={() => router.push("/")}
            >
              <Home className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold">Join a Game Room</CardTitle>
            <CardDescription className="text-gray-600">
              {roomId === "DEFAULT" ? 
                "Join the public default room - no code needed!" : 
                "Enter a room code to join an existing UNO game"
              }
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoinRoom}>
            <CardContent className="space-y-5">
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
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500 transition-all"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roomId" className="flex items-center gap-1 text-gray-700">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Room Code {roomId === "DEFAULT" && "(Pre-filled)"}</span>
                </Label>
                <Input
                  id="roomId"
                  placeholder="Enter room code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="font-mono rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500 transition-all uppercase"
                  required
                  disabled={roomId === "DEFAULT"}
                />
                
                {roomId === "DEFAULT" && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Default public room is always available
                  </p>
                )}
              </div>
              
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex gap-2 items-center">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                disabled={isJoining}
              >
                {isJoining ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    <span>Joining...</span>
                  </div>
                ) : (
                  <>
                    Join {roomId === "DEFAULT" ? "Default " : ""}Room
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full rounded-xl border-2 text-gray-700 hover:bg-gray-50" 
                onClick={() => router.push("/")}
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
