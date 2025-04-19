"use client"

import React from "react"
import { useGame } from "@/components/providers/game-context"
import GameBoard from "@/components/game/game-board"
import WaitingRoom from "@/components/room/waiting-room"
import GameOver from "@/components/layout/game-over"
// import LoadingSpinner from "@/components/ui/loading-spinner" // Assuming you have a spinner

export default function GameViewSelector() {
  const { state } = useGame()

  // if (isLoading && !state.status) {
  //   // Optional: Show a loading state while the initial context loads fully
  //   // You might want a more sophisticated loading UI
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <LoadingSpinner size={48} />
  //     </div>
  //   )
  // }

  if (state.status === 'waiting') {
    return <WaitingRoom />
  }

  if (state.status === 'playing') {
    return <GameBoard />
  }

  if (state.status === 'finished') {
    return <GameOver />
  }

  // Fallback or initial loading state if status is somehow invalid
  console.warn("GameViewSelector: Reached fallback state, game status:", state.status);
  // Return null or a minimal placeholder if no status matches yet
  return null;
  // return (
  //   <div className="flex items-center justify-center min-h-screen">
  //      {/* Minimal loading indicator */}
  //      <p>Loading...</p>
  //   </div>
  // ) 
} 