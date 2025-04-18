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

  // Define color mapping based on current color
  const colorStyles = {
    red: "from-red-500 to-red-600 text-white",
    blue: "from-blue-500 to-blue-600 text-white",
    green: "from-green-500 to-green-600 text-white",
    yellow: "from-yellow-400 to-yellow-500 text-black",
    wild: "from-purple-500 to-purple-600 text-white",
    black: "from-gray-800 to-gray-900 text-white",
  }[state.currentColor] || "from-gray-600 to-gray-700 text-white";

  return (
    <div className="bg-black/60 backdrop-blur-md p-2 sm:rounded-xl rounded-none sm:mt-2 sm:mb-4 mb-0 shadow-xl border-t sm:border border-white/10 w-full z-30">
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2 min-h-10">
        <div className="flex items-center">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${colorStyles} mr-2`}>
            {state.currentColor.toUpperCase()}
          </span>
        </div>

        <div className="flex gap-1 items-center">
          {canSayUno && (
            <Button 
              onClick={sayUno} 
              size="sm"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow px-2 py-1 h-8 text-xs"
            >
              <Hand className="h-3 w-3 mr-1" />
              UNO!
            </Button>
          )}
          
          <div className="flex flex-row gap-2 items-stretch w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  document.querySelector('.draw-pile')?.dispatchEvent(
                    new MouseEvent('click', { bubbles: true })
                  );
                }
              }}
              className={`h-8 px-2 text-xs ${noPlayableCards ? 'bg-blue-600 text-white animate-pulse' : 'bg-blue-600 text-white'} ${!isMyTurn || state.hasDrawnThisTurn ? 'opacity-50' : ''}`}
              disabled={!isMyTurn || state.hasDrawnThisTurn}
              style={{ minWidth: 78 }}
            >
              Draw Card
            </Button>
            <Button 
              onClick={endTurn} 
              disabled={!canEndTurn}
              size="sm"
              className={`h-8 px-2 text-xs
                ${canEndTurn
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800" 
                  : "bg-gray-700/50 text-white/50"}
              `}
              style={{ minWidth: 78 }}
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              End Turn
            </Button>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-white/80 hover:bg-white/10 rounded-full h-8 w-8 border border-white/20"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-black/90 border-white/20 text-white">
                <p className="font-medium">UNO Rules:</p>
                <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                  <li>Match the top card by color, number, or action</li>
                  <li>Click the draw pile to draw a card</li>
                  <li>After drawing, if you cannot play, end your turn</li>
                  <li>Say "UNO" when you have 1 card left!</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}