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
    <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 mt-2 mb-4 shadow-xl border border-white/10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-white">
          <div className="flex items-center gap-3">
            <div className="flex gap-2 items-center">
              <span className="text-white/80 text-sm">Color:</span>
              <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm bg-gradient-to-r ${colorStyles}`}>
                {state.currentColor.toUpperCase()}
              </span>
            </div>
            
            <div className="h-6 w-px bg-white/20"></div>
            
            <div className="flex gap-2 items-center">
              <span className="text-white/80 text-sm">Direction:</span>
              <span className="text-sm font-medium">
                {state.direction === 1 ? "➡️ Clockwise" : "⬅️ Counter-Clockwise"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          {canSayUno && (
            <Button 
              onClick={sayUno} 
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg shadow-red-500/20 transition-all duration-300 hover:scale-105"
            >
              <Hand className="h-4 w-4 mr-1.5" />
              UNO!
            </Button>
          )}
          
          {isMyTurn && !state.hasDrawnThisTurn && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-white px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/80 to-blue-600/80 text-sm animate-pulse-subtle shadow-md">
                    Draw a card
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-black/90 border-white/20 text-white">
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
                    className={`
                      transition-all duration-300
                      ${canEndTurn 
                        ? "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 hover:scale-105 shadow-lg" 
                        : "bg-gray-700/50 text-white/50"}
                    `}
                  >
                    <ArrowDown className="h-4 w-4 mr-1.5" />
                    End Turn
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-black/90 border-white/20 text-white">
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
                  className="text-white/80 hover:bg-white/10 rounded-full h-9 w-9 border border-white/20 backdrop-blur-sm"
                >
                  <HelpCircle className="h-5 w-5" />
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