"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { ArrowDown, Hand } from "lucide-react"

export default function GameControls() {
  const { state, currentPlayerId, drawCard, endTurn, sayUno } = useGame()

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canEndTurn = isMyTurn && state.hasDrawnThisTurn
  
  // Find current player to check if they have few cards
  const currentPlayer = state.players.find(p => p.id === currentPlayerId)
  const canSayUno = isMyTurn && currentPlayer && currentPlayer.cards.length === 2

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 mt-4 flex justify-between items-center">
      <div className="text-white">
        <p>
          Current Color: <span className="font-bold">{state.currentColor.toUpperCase()}</span>
        </p>
        <p>Direction: {state.direction === 1 ? "Clockwise" : "Counter-Clockwise"}</p>
      </div>

      <div className="flex gap-2">
        {canSayUno && (
          <Button 
            onClick={sayUno} 
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <Hand className="h-4 w-4 mr-1" />
            UNO
          </Button>
        )}
        
        <Button onClick={drawCard} disabled={!isMyTurn || state.hasDrawnThisTurn} className="bg-blue-600 hover:bg-blue-700">
          Draw Card
        </Button>
        
        <Button 
          onClick={endTurn} 
          disabled={!canEndTurn} 
          className="bg-gray-600 hover:bg-gray-700"
        >
          <ArrowDown className="h-4 w-4 mr-1" />
          End Turn
        </Button>
      </div>
    </div>
  )
}
