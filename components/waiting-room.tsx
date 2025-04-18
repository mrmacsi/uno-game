"use client"

import { useState, useEffect } from "react"
import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { startGame } from "@/lib/game-actions"
import { Copy, Home, RefreshCw, Play, Users, Crown, AlertCircle } from "lucide-react"
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
  const [playerJoined, setPlayerJoined] = useState(false)
  
  // Find current player in players array
  const currentPlayer = state.players.find(player => player.id === currentPlayerId)
  // Check if player is host
  const isHost = Boolean(currentPlayer?.isHost)
  // Can start game if there are 2+ players and current player is host
  const canStartGame = state.players.length >= 2 && isHost
  
  // Force refresh on component mount and animate player joined
  useEffect(() => {
    const timer = setTimeout(() => {
      refreshGameState()
      setPlayerJoined(true)
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
      <div className="flex min-h-screen flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
        <Card className="max-w-md w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="relative bg-red-50 border-b border-red-100 px-4 sm:px-6 pt-6 sm:pt-8">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-red-100/50 rounded-full" 
              onClick={goToHome}
            >
              <Home className="h-5 w-5" />
            </Button>
            <CardTitle className="text-red-600 flex items-center gap-2 text-lg sm:text-xl">
              <AlertCircle className="w-5 h-5" />
              <span>Connection Issue</span>
            </CardTitle>
            <CardDescription className="text-red-600/80 text-sm sm:text-base">
              Your player ID could not be found. Please try rejoining the room.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 p-4 sm:p-6">
            <Button
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md"
              onClick={() => router.push(`/join-room?roomId=${state.roomId}`)}
            >
              Rejoin Room
            </Button>
            <Button 
              variant="outline"
              className="w-full border-gray-200 hover:bg-gray-50" 
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
    <div className="flex min-h-screen flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-blue-400/10 animate-pulse-slow"></div>
        <div className="absolute bottom-[20%] right-[10%] w-56 sm:w-80 h-56 sm:h-80 rounded-full bg-purple-400/10 animate-pulse-slow animation-delay-1000"></div>
      </div>
      
      <Card className={`
        max-w-md w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl overflow-hidden
        transition-all duration-500 transform 
        ${playerJoined ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}>
        <CardHeader className="relative bg-gradient-to-r from-blue-500 to-indigo-600 text-white pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="absolute top-4 right-4 flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToHome}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Users className="h-6 sm:h-8 w-6 sm:w-8 text-white" />
            </div>
          </div>
          
          <CardTitle className="text-center text-xl sm:text-2xl mb-1">Waiting Room</CardTitle>
          <CardDescription className="text-center text-white/80 text-sm sm:text-base">
            Welcome, <span className="font-medium text-white">{currentPlayer?.name || "Player"}</span>!
            {isHost && (
              <div className="mt-1 inline-flex items-center gap-1 bg-yellow-400/20 backdrop-blur-sm px-2 py-1 rounded-full text-yellow-100 text-xs">
                <Crown className="h-3 w-3" />
                <span>You are the host</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Room code */}
            <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
              <div>
                <p className="text-xs font-medium text-indigo-500 mb-1">Room Code</p>
                <p className="text-xl font-mono font-bold text-indigo-700">{state.roomId}</p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyRoomCode} 
                className="h-10 w-10 rounded-full bg-white border-indigo-200 hover:bg-indigo-50 text-indigo-600"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Players list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>Players</span>
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  {state.players.length}/4
                </span>
              </div>
              
              {/* Player cards */}
              <div className="space-y-2">
                {state.players.map((player) => (
                  <div 
                    key={player.id} 
                    className={`
                      p-3 rounded-xl flex justify-between items-center 
                      ${player.id === currentPlayerId 
                        ? "bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100" 
                        : "bg-white border border-gray-100"}
                      transition-all duration-200 hover:shadow-sm
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${player.isHost 
                          ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-800" 
                          : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-500"}
                      `}>
                        {player.isHost ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </div>
                      <span className="font-medium text-gray-800">
                        {player.name} 
                        {player.id === currentPlayerId && (
                          <span className="ml-1 text-xs text-indigo-500">(You)</span>
                        )}
                      </span>
                    </div>
                    
                    {player.isHost && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Info message */}
            {isHost ? (
              <div className={`
                p-4 rounded-xl border
                ${canStartGame 
                  ? "bg-green-50 border-green-100 text-green-700" 
                  : "bg-amber-50 border-amber-100 text-amber-700"}
                text-sm
              `}>
                <p>
                  {canStartGame 
                    ? "You can start the game now! Everyone is ready to play." 
                    : "Need at least 2 players to start the game. Invite your friends!"}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-700 text-sm">
                <p>Waiting for the host to start the game...</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 p-6 pt-2">
          <Button
            className={`
              w-full shadow-md relative overflow-hidden group
              ${canStartGame
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"}
            `}
            disabled={!canStartGame || isStarting}
            onClick={handleStartGame}
          >
            {/* Button highlight effect */}
            <div className="absolute inset-0 w-full h-full bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            
            <div className="relative flex items-center justify-center gap-2">
              {isStarting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                  <span>Starting Game...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Start Game</span>
                </>
              )}
            </div>
          </Button>
          
          {isHost && (
            <ResetRoomButton 
              roomId={state.roomId} 
              className="w-full mt-1"
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