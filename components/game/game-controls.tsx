"use client"

import React from "react"
import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { ArrowDown, Hand, HelpCircle, History, Info, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react"
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
  const canSayUno = isMyTurn && currentPlayer && currentPlayer.cards.length === 2 && !currentPlayer.saidUno
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
    <div className="flex flex-row items-center justify-between gap-1 sm:gap-2 w-full">
      {/* Moved Left Scroll Button to the start */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20 flex-shrink-0"
              onClick={() => window.dispatchEvent(new CustomEvent('player-hand-scroll-left'))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-black/95 border-white/20 text-white z-[100]">
            <p>Scroll hand left</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Original Left Section: Rules Icon (Mobile Only) & Size Controls */}
      <div className="flex items-center gap-1 sm:gap-2 ml-1 flex-shrink-0">
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
          <div className="px-2">
            <GameLog logs={state.log} />
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

      {/* Mobile optimized action buttons */}
      <div className="flex flex-wrap justify-end items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
        {/* Direction and Color indicators in one element on mobile */}
        {isMobile ? (
          <div className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md bg-gradient-to-r from-gray-700 to-gray-800 text-white">
            <span className="mr-1">{state.direction === 1 ? '➡️' : '⬅️'}</span>
            <span className={`inline-block px-1.5 py-0.5 rounded-full bg-gradient-to-r ${colorStyles}`}>
              {state.currentColor.charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <>
            {/* Direction Indicator */}
            <span 
              className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md bg-gradient-to-r ${state.direction === 1 ? 'from-green-400 to-emerald-500 text-green-900' : 'from-yellow-300 to-yellow-500 text-yellow-900'}`} 
              title={state.direction === 1 ? "Clockwise" : "Counter-Clockwise"}
            >
              {state.direction === 1 ? '➡️' : '⬅️'}
            </span>
            {/* Color Indicator */}
            <span 
              className={`inline-block px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r ${colorStyles} shadow-md`} 
              title={`Current color: ${state.currentColor}`}
            >
              {state.currentColor.toUpperCase()}
            </span>
          </>
        )}

        {/* UNO button - made more compact on mobile */}
        {canSayUno && (
          <Button 
            onClick={declareUno}
            size="sm"
            className={`bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow px-2 py-1 h-7 text-[10px] sm:text-xs animate-pulse ${isMobile ? 'w-[50px]' : ''}`}
          >
            <Hand className="h-3 w-3 mr-0.5 sm:mr-1" />
            UNO!
          </Button>
        )}
        
        {hasAlreadySaidUno && (
          <Button 
            disabled
            size="sm"
            className={`bg-gradient-to-r from-gray-500 to-gray-600 text-white px-2 py-1 h-7 text-[10px] sm:text-xs opacity-70 ${isMobile ? 'w-[50px]' : ''}`}
          >
            <Hand className="h-3 w-3 mr-0.5 sm:mr-1" />
            UNO!
          </Button>
        )}
        
        {/* Draw button */}
        {canDraw && (
          <Button
            onClick={drawCard}
            size="sm"
            variant={noPlayableCards ? "default" : "outline"}
            className={`px-2 py-1 h-7 text-[10px] sm:text-xs ${
              noPlayableCards 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold animate-pulse shadow" 
                : "border-white/20 text-white hover:bg-white/10"
            } ${isMobile && noPlayableCards ? 'w-[54px]' : ''}`}
          >
            Draw
          </Button>
        )}
          
        {/* Pass turn button */}
        {canEndTurn && (
          <Button
            onClick={() => passTurn()}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow px-2 py-1 h-7 text-[10px] sm:text-xs animate-pulse"
          >
            <ArrowDown className="h-3 w-3 mr-0.5 sm:mr-1" />
            {isMobile ? 'End' : 'End Turn'}
          </Button>
        )}
      </div>
      
      {/* Moved Right Scroll Button to the end */}
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="text-white/80 hover:bg-white/10 rounded-full h-7 w-7 border border-white/20 flex-shrink-0"
              onClick={() => window.dispatchEvent(new CustomEvent('player-hand-scroll-right'))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-black/95 border-white/20 text-white z-[100]">
            <p>Scroll hand right</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}