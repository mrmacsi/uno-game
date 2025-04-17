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
        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 z-20" 
        onClick={goToHome}
      >
        <Home className="h-5 w-5 text-white" />
      </Button>
      
      <div className="grid grid-cols-3 gap-4 mb-16 mt-16">
        {state.players
          .filter((player) => player.id !== state.currentPlayer)
          .map((player, index) => (
            <PlayerInfo key={player.id} player={player} isCurrentTurn={player.id === state.currentPlayer} />
          ))}
      </div>

      <div className="flex-1 flex items-center justify-center gap-24 my-auto">
        <div className="mx-8">
          <DrawPile count={state.drawPileCount} />
        </div>
        <div className="mx-8">
          <DiscardPile topCard={state.discardPile[state.discardPile.length - 1]} />
        </div>
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
