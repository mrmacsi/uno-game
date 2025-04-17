"use client"

import { useGame } from "./game-context"
import PlayerHand from "./player-hand"
import DiscardPile from "./discard-pile"
import DrawPile from "./draw-pile"
import PlayerInfo from "./player-info"
import GameControls from "./game-controls"
import GameOver from "./game-over"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"
import { useRouter } from "next/navigation"

export default function GameBoard() {
  const { state } = useGame()
  const router = useRouter()

  const goToHome = () => {
    router.push("/")
  }

  if (state.status === "finished") {
    return <GameOver />
  }

  return (
    <div className="flex flex-col h-screen bg-green-800 p-4 relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 z-10" 
        onClick={goToHome}
      >
        <Home className="h-5 w-5 text-white" />
      </Button>
      
      {/* Opponents */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {state.players
          .filter((player) => player.id !== state.currentPlayer)
          .map((player, index) => (
            <PlayerInfo key={player.id} player={player} isCurrentTurn={player.id === state.currentPlayer} />
          ))}
      </div>

      {/* Game Table */}
      <div className="flex-1 flex items-center justify-center gap-8">
        <DrawPile count={state.drawPileCount} />
        <DiscardPile topCard={state.discardPile[state.discardPile.length - 1]} />
      </div>

      {/* Current Player's Hand */}
      <div className="mt-auto">
        <PlayerHand />
      </div>

      {/* Game Controls */}
      <GameControls />
    </div>
  )
}
