"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { joinRoom } from "@/lib/game-actions"

export default function JoinRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [roomId, setRoomId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim() || !roomId.trim()) return

    setIsJoining(true)
    setError("")

    try {
      await joinRoom(roomId, playerName)
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
          <CardDescription>Enter a room code to join an existing UNO game</CardDescription>
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
                <Label htmlFor="roomId">Room Code</Label>
                <Input
                  id="roomId"
                  placeholder="Enter room code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isJoining}>
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
