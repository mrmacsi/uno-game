"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { ArrowDown, Hand, HelpCircle } from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function GameControls() {
  const { state, currentPlayerId, endTurn, sayUno, hasPlayableCard } = useGame()

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canEndTurn = isMyTurn && state.hasDrawnThisTurn
  const noPlayableCards = isMyTurn && !hasPlayableCard()
  
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
        
        {isMyTurn && !state.hasDrawnThisTurn && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-white/80 px-3 py-1 rounded-full bg-blue-600/30 text-sm animate-pulse-subtle">
                  Click the draw pile to draw a card
                </div>
              </TooltipTrigger>
              <TooltipContent>
                You need to draw a card this turn
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button 
                  onClick={endTurn} 
                  disabled={!canEndTurn} 
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  <ArrowDown className="h-4 w-4 mr-1" />
                  End Turn
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canEndTurn ? 
                "End your turn and pass to the next player" : 
                "You must draw a card before ending your turn"
              }
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="text-white/80 hover:bg-white/10 rounded-full h-9 w-9"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-medium">UNO Rules:</p>
              <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                <li>Match the top card by color, number, or action</li>
                <li>Click the draw pile to draw a card</li>
                <li>After drawing, if you can't play, end your turn</li>
                <li>Don't forget to say "UNO" when you have 1 card left!</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}