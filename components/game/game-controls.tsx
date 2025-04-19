"use client"

import React from "react"
import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { ArrowDown, Hand, HelpCircle, Info } from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"

export default function GameControls() {
  const {
    state,
    currentPlayerId,
    hasPlayableCard,
    drawCard,
    passTurn,
    declareUno,
  } = useGame()
  const isMobile = useIsMobile()

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canDraw = isMyTurn && (state.drawPileCount || 0) > 0 && !state.hasDrawnThisTurn
  const canEndTurn = isMyTurn && state.hasDrawnThisTurn
  const noPlayableCards = isMyTurn && !hasPlayableCard() && canDraw
  
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
    <div className="bg-black/80 backdrop-blur-md p-2 sm:p-3 sm:rounded-xl rounded-none sm:mt-2 sm:mb-4 mb-0 shadow-xl border-t sm:border border-white/10 w-full z-30">
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2 min-h-12">
        {/* Left Section: Current Color & Rules */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${colorStyles} mr-2 shadow-md`}>
            {state.currentColor.toUpperCase()}
          </span>
          
          {isMobile && (
            <Drawer>
              <DrawerTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-white/80 hover:bg-white/10 rounded-full h-8 w-8 border border-white/20"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-black/90 border-white/10 text-white">
                <DrawerHeader>
                  <DrawerTitle>UNO Rules</DrawerTitle>
                  <DrawerDescription className="text-white/70">Quick reference for game rules</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 space-y-2 text-sm">
                  <p>• Match the top card by color, number, or action</p>
                  <p>• Draw card when you can't play</p>
                  <p>• End your turn if you still can't play</p>
                  <p>• Say "UNO" when you have 1 card left!</p>
                  <p>• First player to get rid of all cards wins</p>
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline" className="border-white/20 text-white">
                      Close
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </div>

        {/* Center Section: Player Name & Turn Info */}
        <div className="flex-1 text-center px-2">
          {currentPlayer && (
            <p className="text-white font-semibold text-sm sm:text-base truncate">
              {currentPlayer.name} {isMyTurn ? "(Your Turn)" : ""}
            </p>
          )}
        </div>

        {/* Right Section: Action Buttons & Help */}
        <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
          {canSayUno && (
            <Button 
              onClick={declareUno}
              size="sm"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow px-2 py-1 h-8 text-xs"
            >
              <Hand className="h-3 w-3 mr-1" />
              UNO!
            </Button>
          )}
          
          <div className="flex flex-row gap-1 sm:gap-2 items-stretch w-full sm:w-auto mt-0 sm:mt-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (canDraw) {
                  drawCard()
                }
              }}
              className={`h-9 px-3 text-xs bg-blue-600 text-white ${noPlayableCards ? 'animate-pulse' : ''} ${!canDraw ? 'opacity-50' : ''} shadow-md rounded-full`}
              disabled={!canDraw}
              style={{ minWidth: 78 }}
            >
              Draw Card
            </Button>
            <Button 
              onClick={passTurn}
              disabled={!canEndTurn}
              size="sm"
              className={`h-9 px-3 text-xs rounded-full shadow-md
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

          {!isMobile && (
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
                <TooltipContent className="max-w-xs bg-black/95 border-white/20 text-white">
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
          )}
        </div>
      </div>
    </div>
  )
}