"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"

export default function GameControls() {
  const { state, currentPlayerId, drawCard } = useGame()

  const isMyTurn = state.currentPlayer === currentPlayerId

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 mt-4 flex justify-between items-center">
      <div className="text-white">
        <p>
          Current Color: <span className="font-bold">{state.currentColor.toUpperCase()}</span>
        </p>
        <p>Direction: {state.direction === 1 ? "Clockwise" : "Counter-Clockwise"}</p>
      </div>

      <Button onClick={drawCard} disabled={!isMyTurn} className="bg-blue-600 hover:bg-blue-700">
        Draw Card
      </Button>
    </div>
  )
}
