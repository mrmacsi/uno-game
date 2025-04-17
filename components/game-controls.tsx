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
    <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 mt-0 shadow-xl border border-white/10 sm:static fixed bottom-0 left-0 right-0 z-50 sm:rounded-xl rounded-none sm:mt-2 sm:mb-4 mb-0">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="text-white w-full sm:w-auto">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2 sm:mb-0">
            <div className="flex gap-2 items-center">
              <span className="text-white/80 text-sm">Color:</span>
              <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm bg-gradient-to-r ${colorStyles}`}>
                {state.currentColor.toUpperCase()}
              </span>
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-white/20"></div>
            
            <div className="flex gap-2 items-center">
              <span className="text-white/80 text-sm">Direction:</span>
              <span className="text-sm font-medium">
                {state.direction === 1 ? "➡️ Clockwise" : "⬅️ Counter-Clockwise"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-center w-full sm:w-auto">
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
                  <div className={`text-white/80 px-3 py-1 rounded-full ${noPlayableCards ? 'bg-blue-600 animate-pulse' : 'bg-blue-600/30'} text-sm ${noPlayableCards ? 'animate-pulse' : 'animate-pulse-subtle'}`}>
                    {noPlayableCards ? 'You must draw a card' : 'Draw a card'}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {noPlayableCards ? 
                    "You have no playable cards. You must draw a card from the draw pile." : 
                    "You need to draw a card this turn"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {(isMyTurn && state.hasDrawnThisTurn) && (
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
                <TooltipContent>
                  End your turn and pass to the next player
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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