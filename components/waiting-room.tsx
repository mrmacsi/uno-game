"use client"

import { useState } from "react"
import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { startGame } from "@/lib/game-actions"
import { Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function WaitingRoom() {
  const { state, currentPlayerId } = useGame()
  const { toast } = useToast()
  const [isStarting, setIsStarting] = useState(false)

  const isHost = state.players.find((p) => p.id === currentPlayerId)?.isHost || false
  const canStartGame = state.players.length >= 2 && isHost

  const copyRoomCode = () => {
    navigator.clipboard.writeText(state.roomId)
    toast({
      title: "Room code copied!",
      description: "Share this with your friends to join the game.",
    })
  }

  const handleStartGame = async () => {
    if (!canStartGame) return

    setIsStarting(true)
    try {
      await startGame(state.roomId)
    } catch (error) {
      console.error("Failed to start game:", error)
      toast({
        title: "Failed to start game",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Waiting Room</CardTitle>
          <CardDescription>Waiting for players to join...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-gray-100 p-3 rounded-md flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Room Code</p>
                <p className="text-lg font-mono font-bold">{state.roomId}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={copyRoomCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Players ({state.players.length}/4)</h3>
              <ul className="space-y-2">
                {state.players.map((player) => (
                  <li key={player.id} className="bg-white p-2 rounded-md flex justify-between items-center">
                    <span>{player.name}</span>
                    {player.isHost && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Host</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            disabled={!canStartGame || isStarting}
            onClick={handleStartGame}
          >
            {isStarting ? "Starting..." : "Start Game"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
