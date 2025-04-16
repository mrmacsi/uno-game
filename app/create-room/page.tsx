"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createRoom } from "@/lib/game-actions"

export default function CreateRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setIsCreating(true)
    try {
      const roomId = await createRoom(playerName)
      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error("Failed to create room:", error)
      setIsCreating(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Create a New Game Room</CardTitle>
          <CardDescription>Set up a new UNO game and invite your friends to join</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateRoom}>
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
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Room"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
