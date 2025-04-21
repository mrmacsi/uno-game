"use client"

import React, { useState, useEffect } from "react"
import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Play, RefreshCw, Home, Crown, AlertCircle, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import ResetRoomButton from "./reset-room-button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Player } from "@/lib/types"
import { startGame } from "@/lib/game-actions"
import { AvatarDisplay } from "@/components/game/avatar-display"

export default function WaitingRoom() {
  const {
    state,
    refreshGameState,
    currentPlayerId
  } = useGame()
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
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
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [refreshGameState])

  const copyRoomCode = () => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(state.roomId)
        .then(() => {
          toast.success("Room code copied!", {
            description: "Share this with your friends to join the game.",
          })
        })
        .catch(() => {
          toast.error("Clipboard error", {
            description: "Could not copy to clipboard. Please copy manually.",
          })
        })
    } else {
      toast.error("Clipboard not supported", {
        description: "Clipboard is not supported in this browser. Please copy manually.",
      })
    }
  }

  const handleStartGame = async () => {
    if (!canStartGame) {
      console.log("Cannot start game:", { isHost, playerCount: state.players.length })
      toast.error("Cannot start game", {
        description: isHost 
          ? "Need at least 2 players to start" 
          : "Only the host can start the game",
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
      toast.error("Failed to start game", {
        description,
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshGameState()
      toast.success("Game refreshed", {
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
    <div className="flex flex-col min-h-screen max-h-screen overflow-auto bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white p-4 sm:p-6">
      <Card className="w-full max-w-md mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-gray-200 dark:border-gray-700/50 shadow-xl rounded-2xl flex flex-col flex-grow overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700/50">
          <div className="absolute top-4 right-4 flex gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full h-8 w-8 sm:h-9 sm:w-9"
              title="Refresh Room"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToHome}
              className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full h-8 w-8 sm:h-9 sm:w-9"
              title="Back to Home"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-col items-center justify-center pt-6 sm:pt-4 text-center">
            <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 flex items-center justify-center shadow-lg mb-3">
              <Users className="h-6 sm:h-7 w-6 sm:h-7 text-white/90" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Waiting Room</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">
              Welcome, <span className="font-semibold text-gray-700 dark:text-gray-300">{currentPlayer?.name || "Player"}</span>!
              {isHost && (
                <div className="mt-2 inline-flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800/60 px-2.5 py-1 rounded-full text-yellow-700 dark:text-yellow-300 text-xs font-medium">
                  <Crown className="h-3.5 w-3.5" />
                  <span>You are the host</span>
                </div>
              )}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 text-gray-900 dark:text-gray-100 flex-grow flex flex-col overflow-auto">
          <div className="space-y-6 flex-grow flex flex-col">
            {/* Room code */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex justify-between items-center border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Room Code</p>
                <p className="text-xl font-mono font-bold text-gray-800 dark:text-gray-100">{state.roomId}</p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyRoomCode} 
                className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors duration-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Players list */}
            <div className="space-y-3 flex-grow flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span>Players</span>
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {state.players.length}/4
                </span>
              </div>
              
              <ScrollArea className="flex-grow h-[150px]">
                <div className="space-y-2 pr-4">
                  {state.players.map((player: Player) => {
                    // Log the player object being mapped
                    console.log(`WaitingRoom: Mapping player - ID: ${player.id}, Name: ${player.name}, Avatar Index: ${player.avatar_index}, Is Host: ${player.isHost}`);
                    
                    // Ensure avatar_index is a number, default to 0 if missing
                    const avatarIndex = typeof player.avatar_index === 'number' ? player.avatar_index : 0;
                    
                    // Log the index being passed to AvatarDisplay
                    console.log(`WaitingRoom: Passing avatarIndex ${avatarIndex} to AvatarDisplay for player ${player.name}`);
                    
                    return (
                      <div 
                        key={player.id} 
                        // Adjusted padding and background
                        className={`p-2.5 rounded-lg flex justify-between items-center border transition-all duration-200 hover:shadow-sm 
                          ${player.id === currentPlayerId 
                            ? "bg-indigo-100 border-indigo-200 shadow-sm" // Brighter highlight for current player
                            : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50"}
                        `}
                      >
                        {/* Left side: Avatar and Name */}
                        <div className="flex items-center gap-2.5 flex-grow min-w-0"> {/* Slightly increased gap */}
                           <AvatarDisplay index={avatarIndex} size="sm" />
                           <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate" title={player.name}> {/* Added title attribute */}
                            {player.name} 
                            {player.id === currentPlayerId && (
                              <span className="ml-1.5 text-xs text-indigo-600 font-normal">(You)</span>
                            )}
                          </span>
                        </div>
                        
                        {/* Right side: Host Crown (wrapped) */}
                        {player.isHost && (
                          <span title="Host">
                            <Crown className="h-5 w-5 text-yellow-500 flex-shrink-0 ml-2" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            {/* Info message - Adjusted Styling */}
            {isHost ? (
              <div className={` p-3 rounded-lg border text-sm ${canStartGame ? "bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-800/60 text-green-700 dark:text-green-200" : "bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800/60 text-yellow-700 dark:text-yellow-200"}`}> 
                <p>{canStartGame ? "Ready to start!" : "Need at least 2 players to start."}</p>
              </div>
            ) : (
              // Use softer gray styling for non-host waiting message
              <div className="bg-gray-100 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-400 text-sm text-center">
                <p>Waiting for the host to start the game...</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-6 border-t border-gray-200 dark:border-gray-700/50 flex flex-col gap-3">
          <div className="flex flex-col gap-3 w-full">
            <Button
              className={`w-full shadow-md py-3 text-base font-semibold rounded-lg transition-all duration-200 ease-in-out 
                ${canStartGame
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:shadow-lg"
                  : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70"} 
              `}
              disabled={!canStartGame || isStarting || state.status !== "waiting"}
              onClick={handleStartGame}
            >
              {isStarting ? ( 
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</> 
              ) : ( 
                <><Play className="mr-2 h-4 w-4 fill-current" /> Start Game</> 
              )}
            </Button>
            {isHost && (
              <div className="w-full">
                <ResetRoomButton 
                  roomId={state.roomId} 
                  className="w-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" 
                />
              </div>
            )}
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-1">
            {!isHost 
              ? "Only the host can start the game."
              : (state.players.length < 2 
                ? "Invite at least one more player!" 
                : "Click Start Game when ready.")}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}