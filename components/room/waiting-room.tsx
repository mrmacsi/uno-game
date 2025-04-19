"use client"

import React, { useState, useEffect } from "react"
import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Play, RefreshCw, Users, Home, Crown, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import ResetRoomButton from "./reset-room-button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Player } from "@/lib/types"
import { startGame } from "@/lib/game-actions"

export default function WaitingRoom() {
  const {
    state,
    refreshGameState,
    currentPlayerId
  } = useGame()
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [playerJoined, setPlayerJoined] = useState(false)
  
  // Find current player in players array
  const currentPlayer = state.players.find(player => player.id === currentPlayerId)
  // Check if player is host
  const isHost = Boolean(currentPlayer?.isHost)
  // Can start game if there are 2+ players and current player is host
  const canStartGame = state.players.length >= 2 && isHost && state.status === "waiting"
  
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
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(state.roomId)
        .then(() => {
          toast({
            title: "Room code copied!",
            description: "Share this with your friends to join the game.",
          })
        })
        .catch(() => {
          toast({
            title: "Clipboard error",
            description: "Could not copy to clipboard. Please copy manually.",
            variant: "destructive",
          })
        })
    } else {
      toast({
        title: "Clipboard not supported",
        description: "Clipboard is not supported in this browser. Please copy manually.",
        variant: "destructive",
      })
    }
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
      await startGame(state.roomId, currentPlayerId!)
    } catch (err: unknown) {
      console.error("Failed to start game:", err)
      let description = "Please try again."
      if (err instanceof Error && err.message === "Game has already started") {
        description = "Game has already started. Please refresh or rejoin the room."
      }
      toast({
        title: "Failed to start game",
        description,
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
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-48 bg-black/20 backdrop-blur-sm transform -skew-y-3"></div>
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-black/20 backdrop-blur-sm transform skew-y-3"></div>
          <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
        </div>
        
        <Card className="max-w-md w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl overflow-hidden relative z-10">
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
          <CardFooter className="flex flex-col gap-3 p-4 sm:p-6 bg-gradient-to-br from-red-50/50 to-white">
            <Button
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md rounded-xl"
              onClick={() => router.push(`/join-room?roomId=${state.roomId}`)}
            >
              Rejoin Room
            </Button>
            <Button 
              variant="outline"
              className="w-full border-gray-200 hover:bg-gray-50 rounded-xl" 
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
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent"></div>
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
              className="bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors duration-200"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToHome}
              className="bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors duration-200"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
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
        
        <CardContent className="p-6 bg-gradient-to-br from-gray-50/50 to-white">
          <div className="space-y-6">
            {/* Room code */}
            <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100 shadow-sm hover:shadow transition-shadow duration-200">
              <div>
                <p className="text-xs font-medium text-indigo-500 mb-1">Room Code</p>
                <p className="text-xl font-mono font-bold text-indigo-700">{state.roomId}</p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyRoomCode} 
                className="h-10 w-10 rounded-full bg-white border-indigo-200 hover:bg-indigo-50 text-indigo-600 transition-colors duration-200"
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
              <ScrollArea className="h-[200px] flex-1">
                <div className="space-y-2 pr-4">
                  {state.players.map((player: Player) => {
                    return (
                      <div 
                        key={player.id} 
                        className={`
                          p-3 rounded-xl flex justify-between items-center 
                          ${player.id === currentPlayerId 
                            ? "bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 shadow-sm" 
                            : "bg-white border border-gray-100"}
                          transition-all duration-200 hover:shadow-sm
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            ${player.isHost 
                              ? "bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-800 shadow-md" 
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
                    );
                  })}
                </div>
              </ScrollArea>
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
        
        <CardFooter className="flex flex-col gap-3 p-6 pt-2 bg-gradient-to-br from-gray-50/50 to-white">
          <Button
            className={`
              w-full shadow-md relative overflow-hidden group rounded-xl
              ${canStartGame
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"}
            `}
            disabled={!canStartGame || isStarting || state.status !== "waiting"}
            onClick={handleStartGame}
          >
            {/* Button highlight effect */}
            <div className="absolute inset-0 w-full h-full bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            
            <div className="relative flex items-center justify-center gap-2 py-2">
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