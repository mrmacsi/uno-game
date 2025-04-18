"use client"

import { useGame } from "./game-context"
import PlayerHand from "./player-hand"
import DiscardPile from "./discard-pile"
import DrawPile from "./draw-pile"
import PlayerInfo from "./player-info"
import GameControls from "./game-controls"
import GameOver from "./game-over"
import ColorSelector from "./color-selector"
import { Button } from "@/components/ui/button"
import { Home, Settings, Maximize, Minimize } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

export default function GameBoard() {
  const { state, selectWildCardColor, isColorSelectionOpen, closeColorSelector, currentPlayerId } = useGame()
  const router = useRouter()
  const [fullscreen, setFullscreen] = useState(false)
  const isMobile = useIsMobile()

  // Find the player that belongs to the user
  const myPlayer = state.players.find(p => p.id === currentPlayerId)
  // Filter out the user's player from the list of players displayed at the top
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
      <div className="flex-1 flex flex-col min-h-0" style={{ overflow: 'visible' }}>
        {/* Other players - Adjust grid for mobile and always show */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-3 p-1 sm:p-3">
          {otherPlayers.map((player) => (
            // Wrap PlayerInfo and apply scaling for mobile view
            <div key={player.id} className="sm:scale-100 scale-90 origin-top-left sm:origin-center">
              <PlayerInfo player={player} isCurrentTurn={player.id === state.currentPlayer} />
            </div>
          ))}
        </div>
        
        {/* Game area - middle section with card piles */}
        <div className="flex-1 flex items-center justify-center overflow-visible gap-4 sm:gap-16 p-2 sm:p-4 relative">
          {/* Enhanced decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 sm:w-64 h-40 sm:h-64 rounded-full bg-white/5 absolute animate-pulse-slow"></div>
            <div className="w-64 sm:w-96 h-64 sm:h-96 rounded-full border border-white/10 absolute animate-spin-slow"></div>
            <div className="w-32 sm:w-48 h-32 sm:h-48 bg-gradient-to-br from-blue-500/10 to-emerald-500/10 rounded-full blur-3xl absolute"></div>
          </div>
          
          {/* Animated card path - a visual guide for the card animation */}
          <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          {/* Card piles container - position them for better animation */}
          <div className="flex justify-center items-center gap-8 sm:gap-24 lg:gap-32 relative z-10">
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
        
        <div className="w-full flex flex-col gap-0 sm:gap-2 mt-auto">
          <div className="relative z-30">
            <PlayerHand />
            <div className="w-full">
              <GameControls />
            </div>
          </div>
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
