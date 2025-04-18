"use client"

import React, { useState, useEffect, useRef } from "react"
import { useGame } from "../providers/game-context"
import PlayerHand from "./player-hand"
import DrawPile from "./draw-pile"
import DiscardPile from "./discard-pile"
import GameControls from "./game-controls"
import GameOver from "../layout/game-over"
import ColorSelector from "./color-selector"
import PlayerInfo from "../room/player-info"
import { Button } from "@/components/ui/button"
import { Home, Maximize, Minimize } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import type { Card } from "@/lib/types"

export default function GameBoard() {
  const {
    state,
    selectWildCardColor,
    isColorSelectionOpen,
    closeColorSelector,
    currentPlayerId,
  } = useGame()
  const router = useRouter()
  const [fullscreen, setFullscreen] = useState(false)
  const { toast } = useToast()
  const previousDiscardPileRef = useRef<Card[]>([])

  // Effect to show toast when a card is played
  useEffect(() => {
    // Ensure state and discardPile exist
    if (!state?.discardPile) {
      previousDiscardPileRef.current = state?.discardPile || [];
      return;
    }

    // Get the current top card and the previous top card ID
    const currentPile = state.discardPile;
    const previousPile = previousDiscardPileRef.current;
    const currentTopCard = currentPile.length > 0 ? currentPile[currentPile.length - 1] : null;
    const previousTopCardId = previousPile.length > 0 ? previousPile[previousPile.length - 1]?.id : null;

    // Check if a new card was added to the top
    if (currentTopCard && currentTopCard.id !== previousTopCardId) {
      console.log("[GameBoard] New card detected on discard pile:", currentTopCard);
      // Find the player who likely played the card (the one whose turn it *was*)
      // This relies on the log potentially being updated before the state or having a specific format
      // A more robust way might involve adding `lastPlayedBy` to the state itself.
      const logEntry = state.log[state.log.length - 1]; 
      let playerName = "Someone"; // Default name
      // Basic check if log exists and might contain player name
      if (logEntry && typeof logEntry === 'string') {
         // Attempt to extract player name if log format is like "Player Name played ..." or similar
         const match = logEntry.match(/^([\w\s]+?)\s+(played|declared|drew|forgot)/);
         if (match && match[1]) {
           playerName = match[1].trim();
           // Special case for UNO declaration log
           if (logEntry.startsWith("UNO!")) {
             playerName = logEntry.split("UNO! ")[1]?.split(" has")[0] || playerName;
           }
         }
      }
      console.log(`[GameBoard] Determined player name: ${playerName}`);
      
      // Construct toast description
      let cardDescription = `${currentTopCard.color} ${currentTopCard.type}`;
      if (currentTopCard.type === "number") {
        cardDescription = `${currentTopCard.color} ${currentTopCard.value}`;
      }
      // Capitalize for display
      cardDescription = cardDescription.charAt(0).toUpperCase() + cardDescription.slice(1);

      console.log(`[GameBoard] Calling toast with: Title='${playerName} Played', Desc='${cardDescription}'`);
      toast({
        title: `${playerName} Played`,
        description: cardDescription,
        duration: 2000, // Show for 2 seconds
      });
    }

    // Update the ref for the next render
    previousDiscardPileRef.current = currentPile;

  }, [state?.discardPile, state?.log, toast]); // Depend on discardPile, log, and toast fn

  const otherPlayers = state.players.filter(p => p.id !== currentPlayerId)

  if (state.status === "finished") {
    return <GameOver />
  }

  const goToHome = () => {
    router.push("/")
  }
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setFullscreen(false);
      }
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-900 to-emerald-950 relative" style={{ overflow: 'visible' }}>
      {/* Enhanced Background pattern */}
      <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-5 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_100%)]"></div>
      
      {/* Top navbar - simplified for mobile */}
      <div className="flex items-center justify-between p-2 sm:p-3 bg-black/40 backdrop-blur-md z-20 border-b border-white/10 shadow-md">
        {/* Remove left-side buttons */}
        <div className="w-8"> {/* Placeholder for balance */} </div>
        
        <div className="font-bold text-white text-base sm:text-lg bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">UNO Game</div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:bg-white/10 rounded-full hidden sm:flex" 
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:bg-white/10 rounded-full" 
            onClick={goToHome}
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Players section - always visible */}
      {/* Main container: flex column, takes remaining height */}
      <div className="flex-1 flex flex-col relative" style={{ overflow: 'visible' }}>
        {/* Top section wrapper: Takes available space, relative positioning context */}
        <div className="flex-1 relative">
          {/* Opponent player info positioned absolutely within the top section wrapper */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Player 1 (Top) */}
            {/* Renders top player only if 1 or 3 opponents */}
            {(otherPlayers.length === 1 || otherPlayers.length === 3) && (
              <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 pointer-events-auto w-44 sm:w-56">
                <PlayerInfo 
                  player={otherPlayers.length === 3 ? otherPlayers[1] : otherPlayers[0]} 
                  isCurrentTurn={(otherPlayers.length === 3 ? otherPlayers[1] : otherPlayers[0]).id === state.currentPlayer} 
                />
              </div>
            )}
            {/* Player 2 (Left) */}
            {/* Renders left player only if 2 or 3 opponents */}
            {otherPlayers.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-4 pointer-events-auto w-32 sm:w-40">
                <PlayerInfo 
                  player={otherPlayers[0]} 
                  isCurrentTurn={otherPlayers[0].id === state.currentPlayer} 
                />
              </div>
            )}
            {/* Player 3 (Right) */}
            {/* Renders right player only if 2 or 3 opponents */}
            {otherPlayers.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4 pointer-events-auto w-32 sm:w-40">
                <PlayerInfo 
                   // If 2 players, right is index 1. If 3 players, right is index 2.
                  player={otherPlayers.length === 3 ? otherPlayers[2] : otherPlayers[1]} 
                  isCurrentTurn={(otherPlayers.length === 3 ? otherPlayers[2] : otherPlayers[1]).id === state.currentPlayer} 
                />
              </div>
            )}
          </div>
        </div>

        {/* Game area - middle section with card piles (sibling to opponent container, inside wrapper) */}
        {/* Centered within the top section wrapper */}
        <div className="flex items-center justify-center absolute inset-0 overflow-visible gap-4 sm:gap-16 p-2 sm:p-4">
          {/* Enhanced decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-white/5 absolute animate-pulse-slow"></div>
            <div className="w-64 sm:w-96 h-64 sm:h-96 rounded-full border border-white/10 absolute animate-spin-slow"></div>
            <div className="w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl absolute"></div>
          </div>
          
          {/* Animated card path - a visual guide for the card animation */}
          <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          {/* Card piles container - position them for better animation path */}
          <div className="flex justify-center items-center gap-8 sm:gap-24 lg:gap-32 relative z-10 mt-8 sm:mt-12">
            {/* Draw pile positioned on the left for better animation path */}
            <div className="relative">
              <DrawPile count={state.drawPileCount || 0} />
            </div>
            
            {/* Discard pile on the right */}
            <div className="relative">
              <DiscardPile topCard={state.discardPile[state.discardPile.length - 1]} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom section: Player hand and controls */}
      <div className="w-full flex flex-col gap-1 sm:gap-2 mt-auto z-20">
         {/* Render GameControls above PlayerHand */}
        <div className="w-full px-0 sm:px-2 order-1">
            <GameControls />
        </div>
        {/* Adjust PlayerHand container if needed */}
        <div className="relative min-h-[170px] order-2" style={{ overflow: 'visible' }}>
          <PlayerHand />
        </div>
      </div>
      
      {/* Color selector dialog for wild cards */}
      <ColorSelector 
        isOpen={isColorSelectionOpen} 
        onSelectColor={selectWildCardColor} 
        onClose={closeColorSelector}
      />
    </div>
  )
}
