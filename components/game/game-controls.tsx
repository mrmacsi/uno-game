"use client"

import React from "react"
import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { ArrowDown, Hand, HelpCircle, History, Info, ZoomIn, ZoomOut } from "lucide-react"
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
import GameLog from "./game-log"

export default function GameControls() {
  const {
    state,
    currentPlayerId,
    hasPlayableCard,
    drawCard,
    passTurn,
    declareUno,
    increaseCardSize,
    decreaseCardSize,
  } = useGame()
  const isMobile = useIsMobile()

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canDraw = isMyTurn && (state.drawPileCount || 0) > 0 && !state.hasDrawnThisTurn
  const canEndTurn = isMyTurn && state.hasDrawnThisTurn
  const noPlayableCards = isMyTurn && !hasPlayableCard() && canDraw
  
  // Find current player to check if they have few cards
  const currentPlayer = state.players.find(p => p.id === currentPlayerId)
  const canSayUno = isMyTurn && currentPlayer && currentPlayer.cards.length === 2
  const hasAlreadySaidUno = isMyTurn && currentPlayer && currentPlayer.saidUno && currentPlayer.cards.length === 2

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
    <div className="bg-black/80 backdrop-blur-md p-1 px-2 sm:p-2 sm:rounded-xl rounded-none sm:mt-2 sm:mb-4 mb-0 shadow-xl border-t sm:border border-white/10 w-full z-40">
      <div className="flex flex-row items-center justify-center gap-2 sm:gap-2">
        {/* Left Section: Rules Icon (Mobile Only) & Size Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-1 flex-shrink-0">
          {isMobile && (
            <Drawer>
              <DrawerTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20"
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
                  <p>• Play a card matching the discard pile's color, number, or symbol.</p>
                  <p>• If you can't play, you must draw a card.</p>
                  <p>• After drawing, you can play the drawn card if it's valid.</p>
                  <p>• If you still can't play after drawing, your turn ends (click End Turn).</p>
                  <p>• Wild cards can be played on any color. You choose the next color.</p>
                  <p>• Wild Draw 4: Choose the next color. The next player draws 4 cards and loses their turn.</p>
                  <p>• Draw 2: Next player draws 2 and loses their turn.</p>
                  <p>• Reverse: Reverses the direction of play.</p>
                  <p>• Skip: Skips the next player's turn.</p>
                  <p>• When you have one card left, click the "UNO!" button before playing your second-to-last card.</p>
                  <p>• First player to empty their hand wins the round!</p>
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
          {!isMobile && (
             <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-black/95 border-white/20 text-white z-[100]">
                  <p className="font-medium">UNO Quick Rules:</p>
                  <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                    <li>Match the top card by color, number, or symbol.</li>
                    <li>Click the draw pile (deck icon) if you can't play.</li>
                    <li>Play the drawn card if possible, otherwise click 'End Turn'.</li>
                    <li>Special Cards:</li>
                      <ul className="list-[circle] pl-3">
                        <li>Wild: Choose next color.</li>
                        <li>Wild Draw 4: Choose color, next player draws 4.</li>
                        <li>Draw 2: Next player draws 2.</li>
                        <li>Reverse: Change play direction.</li>
                        <li>Skip: Next player loses turn.</li>
                      </ul>
                    <li>Click "UNO!" button when you have one card left.</li>
                    <li>First to play all cards wins!</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Card Size Controls */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20"
                  onClick={decreaseCardSize}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/95 border-white/20 text-white z-[100]">
                <p>Decrease card size</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20"
                  onClick={increaseCardSize}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-black/95 border-white/20 text-white z-[100]">
                <p>Increase card size</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Game Log Drawer Button (Added) */}
        <Drawer>
          <DrawerTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20"
            >
              <History className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="bg-black/90 border-white/10 text-white">
            <DrawerHeader>
              <DrawerTitle>Game Log</DrawerTitle>
              <DrawerDescription className="text-white/70">Recent game events</DrawerDescription>
            </DrawerHeader>
            <GameLog logs={state.log || []} /> 
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" className="border-white/20 text-white">
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Center Section: Player Name, Card Count, Turn Info */}
        <div className="flex-shrink text-center px-1 sm:px-2 overflow-hidden">
          {currentPlayer && (
            <div className="flex items-center justify-center gap-1.5">
              {isMyTurn && (
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
              <p className={`text-white font-medium text-xs sm:text-sm truncate ${isMyTurn ? 'text-green-300' : 'text-white/90'}`}>
                {isMyTurn ? `${currentPlayer.name} (Your Turn)` : currentPlayer.name}
              </p>
              <span className="text-white/60 text-[10px] sm:text-xs font-normal whitespace-nowrap">
                 ({currentPlayer.cards.length} cards)
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Direction, Color, Actions */}
        <div className="flex gap-1 sm:gap-2 items-center flex-shrink-0">
           {/* Direction Indicator */}
           <span 
             className={`hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md bg-gradient-to-r ${state.direction === 1 ? 'from-green-400 to-emerald-500 text-green-900' : 'from-yellow-300 to-yellow-500 text-yellow-900'} order-first`} 
             title={state.direction === 1 ? "Clockwise" : "Counter-Clockwise"}
            >
            {state.direction === 1 ? '➡️' : '⬅️'}
          </span>
           {/* Color Indicator */}
           <span 
             className={`inline-block px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r ${colorStyles} shadow-md order-1 sm:order-none`} 
             title={`Current color: ${state.currentColor}`}
            >
            {state.currentColor.toUpperCase()}
          </span>

          {canSayUno && (
            <Button 
              onClick={declareUno}
              size="sm"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow px-2 py-1 h-7 text-[10px] sm:text-xs order-2 sm:order-none animate-pulse"
            >
              <Hand className="h-3 w-3 mr-0.5 sm:mr-1" />
              UNO!
            </Button>
          )}
          
          {hasAlreadySaidUno && (
            <Button 
              disabled
              size="sm"
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow px-2 py-1 h-7 text-[10px] sm:text-xs order-2 sm:order-none"
            >
              <Hand className="h-3 w-3 mr-0.5 sm:mr-1" />
              UNO Declared!
            </Button>
          )}
          
          {/* Combined Draw/Pass Buttons */}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (canDraw) drawCard()
              else if (canEndTurn) passTurn()
            }}
            className={`
              h-7 px-2 text-[10px] sm:text-xs rounded-full shadow-md flex items-center justify-center transition-all duration-200 order-3 sm:order-none
              ${isMyTurn && (canDraw || canEndTurn) ? 'bg-blue-600 text-white' : 'bg-gray-700/50 text-white/50 cursor-not-allowed'}
              ${noPlayableCards ? 'animate-pulse' : ''} 
            `} 
            disabled={!isMyTurn || (!canDraw && !canEndTurn)}
            style={{ minWidth: 65 }} 
            title={canDraw ? "Draw a Card" : (canEndTurn ? "End Turn" : "Not your turn or action available")}
          >
            {canDraw ? "Draw" : "End"}
             {canEndTurn && <ArrowDown className="h-3 w-3 ml-0.5 sm:ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}