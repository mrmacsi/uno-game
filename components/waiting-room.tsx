"use client"

import { useState, useEffect } from "react"
import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { startGame } from "@/lib/game-actions"
import { Copy, Home, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import ResetRoomButton from "./reset-room-button"

export default function WaitingRoom() {
  const { state, currentPlayerId, refreshGameState } = useGame()
  const { toast } = useToast()
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Find current player in players array
  const currentPlayer = state.players.find(player => player.id === currentPlayerId)
  // Check if player is host
  const isHost = Boolean(currentPlayer?.isHost)
  // Can start game if there are 2+ players and current player is host
  const canStartGame = state.players.length >= 2 && isHost
  
  // Force refresh on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshGameState()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [refreshGameState])
  
  // Debug info
  useEffect(() => {
    const storedId = getPlayerIdFromLocalStorage()
    console.log("-------- WaitingRoom Debug --------")
    console.log("Current player ID (from context):", currentPlayerId)
    console.log("Player ID from localStorage:", storedId)
    console.log("Current player data:", currentPlayer)
    console.log("All players:", state.players)
    console.log("Is host:", isHost)
    console.log("Player count:", state.players.length)
    console.log("Can start game:", canStartGame)
    if (!currentPlayerId) {
      console.error("Player ID is null - localStorage issue")
    }
    if (state.players.length >= 2 && !canStartGame) {
      console.log("2+ players but can't start - checking host status:", currentPlayer?.isHost)
    }
    console.log("----------------------------------")
  }, [currentPlayerId, state.players, isHost, canStartGame, currentPlayer])

  const copyRoomCode = () => {
    navigator.clipboard.writeText(state.roomId)
    toast({
      title: "Room code copied!",
      description: "Share this with your friends to join the game.",
    })
  }

  const handleStartGame = async () => {
    if (!canStartGame) {
      console.log("Cannot start game:", { isHost, playerCount: state.players.length })
      toast({
        title: "Cannot start game",
        description: isHost 
          ? "Need at least 2 players to start" 
          : "Only the host can start the game",
        variant: "destructive",
      })
      return
    }

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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshGameState()
      toast({
        title: "Game refreshed",
        description: "Latest game state loaded.",
      })
    } catch (error) {
      console.error("Failed to refresh game:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const goToHome = () => {
    router.push("/")
  }

  // Special case: if player ID is null, show a warning
  if (!currentPlayerId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
        <Card className="max-w-md w-full">
          <CardHeader className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4" 
              onClick={goToHome}
            >
              <Home className="h-5 w-5" />
            </Button>
            <CardTitle>Connection Issue</CardTitle>
            <CardDescription>
              Your player ID could not be found. Please try rejoining the room.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => router.push(`/join-room?roomId=${state.roomId}`)}
            >
              Rejoin Room
            </Button>
            <Button 
              variant="outline"
              className="w-full" 
              onClick={goToHome}
            >
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <Card className="max-w-md w-full">
        <CardHeader className="relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToHome}
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <CardTitle>Waiting Room</CardTitle>
          <CardDescription>
            Welcome, {currentPlayer?.name || "Player"}! 
            {isHost ? " You are the host." : " Waiting for host to start the game."}
          </CardDescription>
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
                    <span>{player.name} {player.id === currentPlayerId ? "(You)" : ""}</span>
                    {player.isHost && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Host</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            
            {isHost && (
              <div className="bg-yellow-50 p-3 rounded-md">
                <p className="text-sm text-yellow-800">
                  You are the host. You can start the game when at least 2 players have joined.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full bg-red-600 hover:bg-red-700"
            disabled={!canStartGame || isStarting}
            onClick={handleStartGame}
          >
            {isStarting ? "Starting..." : "Start Game"}
          </Button>
          {isHost && (
            <ResetRoomButton 
              roomId={state.roomId} 
              className="w-full mt-2"
            />
          )}
          <p className="text-xs text-center text-gray-500 mt-2">
            {!isHost 
              ? "Waiting for host to start the game" 
              : (state.players.length < 2 
                ? "Need at least 2 players to start" 
                : "You can start the game now")}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
