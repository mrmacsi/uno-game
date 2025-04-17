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
  }, [searchParams])

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
    } catch (error) {
      console.error("Failed to join room:", error)
      setError("Failed to join room. Please check the room code and try again.")
      setIsJoining(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Join a Game Room</CardTitle>
          <CardDescription>
            {roomId === "DEFAULT" ? 
              "Join the public default room - no code needed!" : 
              "Enter a room code to join an existing UNO game"
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoinRoom}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomId">Room Code {roomId === "DEFAULT" && "(Pre-filled)"}</Label>
                <Input
                  id="roomId"
                  placeholder="Enter room code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                  disabled={roomId === "DEFAULT"}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isJoining}>
              {isJoining ? "Joining..." : `Join ${roomId === "DEFAULT" ? "Default " : ""}Room`}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push("/")}
            >
              Back to Home
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
