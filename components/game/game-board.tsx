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
import InGameMessages from "./in-game-messages"
import { Button } from "@/components/ui/button"
import { Clock, Home, Maximize, Minimize } from "lucide-react"
import { useRouter } from "next/navigation"

export default function GameBoard() {
  const {
    state,
    selectWildCardColor,
    isColorSelectionOpen,
    closeColorSelector,
    currentPlayerId
  } = useGame()
  const router = useRouter()
  const [fullscreen, setFullscreen] = useState(false)
  const [gameTime, setGameTime] = useState("00:00")
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const messagesPanelRef = useRef<HTMLDivElement>(null)
  const timerStartRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const otherPlayers = state.players.filter(p => p.id !== currentPlayerId)
  const currentPlayer = state.players.find(p => p.id === currentPlayerId)
  const isMyTurn = state.currentPlayer === currentPlayerId

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Independent timer implementation
  useEffect(() => {
    // Clear any existing timer when component mounts or state.status changes
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // If game is playing, start the timer
    if (state.status === "playing") {
      // Initialize timer start reference if it's not set
      if (!timerStartRef.current) {
        timerStartRef.current = Date.now();
      }

      // Function to update the timer
      const updateTimer = () => {
        if (timerStartRef.current) {
          const elapsedSeconds = Math.floor((Date.now() - timerStartRef.current) / 1000);
          setGameTime(formatTime(elapsedSeconds));
        }
      };

      // Update immediately, then set interval
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
    } else if (state.status === "waiting") {
      // Reset timer when game is waiting
      timerStartRef.current = null;
      setGameTime("00:00");
    }

    // Cleanup function
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [state.status]);

  // Reset timer when gameStartTime changes
  useEffect(() => {
    if (state.gameStartTime && state.status === "playing") {
      timerStartRef.current = state.gameStartTime;
    }
  }, [state.gameStartTime, state.status]);

  // Effect to close message panel on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (messagesPanelRef.current && !messagesPanelRef.current.contains(event.target as Node)) {
        setIsMessagesOpen(false);
      }
    }
    // Bind the event listener
    if (isMessagesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMessagesOpen]); // Only re-run if isMessagesOpen changes

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
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-900 to-emerald-950 relative overflow-hidden">
      {/* Enhanced Background pattern */}
      <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-5 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_100%)]"></div>
      
      {/* Top navbar - simplified for mobile */}
      <div className="flex items-center justify-between p-2 sm:p-3 bg-black/40 backdrop-blur-md z-20 border-b border-white/10 shadow-md">
        {/* Game timer */}
        <div className="flex items-center gap-1.5 text-white/80 text-sm"> 
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{gameTime}</span>
        </div>
        
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
          {/* Opponent player info - custom mobile layout, absolute on sm+ */}
          <div>
            {/* Mobile: left/right just above piles for 3/4 players, top center for 2 players */}
            <div className="sm:hidden z-20 relative w-full">
              {otherPlayers.length === 1 && (
                <div className="absolute left-1/2 -translate-x-1/2 top-2 w-40 pointer-events-auto">
                  <PlayerInfo 
                    player={otherPlayers[0]}
                    isCurrentTurn={otherPlayers[0].id === state.currentPlayer}
                    showRingButton={state.status === "playing"}
                  />
                </div>
              )}
              {otherPlayers.length > 1 && (
                <>
                  <div className="absolute left-2 top-[100px] w-32">
                    <PlayerInfo 
                      player={otherPlayers[0]}
                      isCurrentTurn={otherPlayers[0].id === state.currentPlayer}
                      showRingButton={state.status === "playing"}
                    />
                  </div>
                  {otherPlayers.length === 3 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-2 w-40">
                      <PlayerInfo 
                        player={otherPlayers[1]}
                        isCurrentTurn={otherPlayers[1].id === state.currentPlayer}
                        showRingButton={state.status === "playing"}
                      />
                    </div>
                  )}
                  <div className="absolute right-2 top-[100px] w-32">
                    <PlayerInfo 
                      player={otherPlayers[otherPlayers.length - 1]}
                      isCurrentTurn={otherPlayers[otherPlayers.length - 1].id === state.currentPlayer}
                      showRingButton={state.status === "playing"}
                    />
                  </div>
                </>
              )}
            </div>
            {/* Desktop/tablet: absolute layout */}
            <div className="hidden sm:block absolute inset-0 pointer-events-none z-10">
              {/* Player 1 (Top) */}
              {(otherPlayers.length === 1 || otherPlayers.length === 3) && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto w-56">
                  <PlayerInfo 
                    player={otherPlayers.length === 3 ? otherPlayers[1] : otherPlayers[0]} 
                    isCurrentTurn={(otherPlayers.length === 3 ? otherPlayers[1] : otherPlayers[0]).id === state.currentPlayer}
                    showRingButton={state.status === "playing"} 
                  />
                </div>
              )}
              {/* Player 2 (Left) */}
              {otherPlayers.length > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 left-4 pointer-events-auto w-40">
                  <PlayerInfo 
                    player={otherPlayers[0]} 
                    isCurrentTurn={otherPlayers[0].id === state.currentPlayer}
                    showRingButton={state.status === "playing"} 
                  />
                </div>
              )}
              {/* Player 3 (Right) */}
              {otherPlayers.length > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-auto w-40">
                  <PlayerInfo 
                     player={otherPlayers.length === 3 ? otherPlayers[2] : otherPlayers[1]} 
                     isCurrentTurn={(otherPlayers.length === 3 ? otherPlayers[2] : otherPlayers[1]).id === state.currentPlayer}
                     showRingButton={state.status === "playing"} 
                  />
                </div>
              )}
            </div>
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
      
      {/* Bottom section: Game controls and Player hand */}
      <div className="w-full flex flex-col gap-1 sm:gap-2 mt-auto z-20 flex-shrink-0">
        {/* Current Player Info (Above Controls) */}
        <div className="w-full flex justify-center px-2 pb-1">
          {currentPlayer && (
            <div className="w-44 sm:w-56">
              <PlayerInfo 
                player={currentPlayer} 
                isCurrentTurn={isMyTurn} 
              />
            </div>
          )}
        </div>
        
        {/* Game controls container */}
        <div className="w-full px-2 py-1 bg-black/30 backdrop-blur-sm border-t border-white/10 shadow-md z-30">
          <GameControls onToggleMessages={() => setIsMessagesOpen(!isMessagesOpen)} />
        </div>
        
        {/* Player hand - gets full focus with more space */}
        <div className="relative w-full flex items-center justify-center min-h-[140px] sm:min-h-[150px] overflow-visible">
          <PlayerHand />
        </div>
      </div>
      
      {/* Messages Side Panel (Conditionally Rendered) */}
      {isMessagesOpen && (
        <div 
          ref={messagesPanelRef} // Attach the ref here
          className="absolute inset-y-0 left-0 w-56 sm:w-64 bg-black/70 backdrop-blur-lg border-r border-white/10 shadow-2xl z-40 animate-in slide-in-from-left duration-300 p-4 flex flex-col">
          <InGameMessages onClose={() => setIsMessagesOpen(false)} />
        </div>
      )}
      
      {/* Color selector dialog for wild cards */}
      <ColorSelector 
        isOpen={isColorSelectionOpen} 
        onSelectColor={selectWildCardColor} 
        onClose={closeColorSelector}
      />
    </div>
  )
}
