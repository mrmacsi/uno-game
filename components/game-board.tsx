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
import { Home, MessageCircle, X, Users, Settings, Maximize, Minimize } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"

export default function GameBoard() {
  const { state, selectWildCardColor, isColorSelectionOpen, closeColorSelector, currentPlayerId } = useGame()
  const router = useRouter()
  const [showLog, setShowLog] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)
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
      
      {/* Top navbar - improved with more modern styling */}
      <div className="flex items-center justify-between p-2 sm:p-3 bg-black/40 backdrop-blur-md z-20 border-b border-white/10 shadow-md">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:bg-white/10 rounded-full" 
            onClick={() => setShowLog(!showLog)}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:bg-white/10 rounded-full sm:hidden" 
            onClick={() => setShowPlayers(!showPlayers)}
          >
            <Users className="h-5 w-5" />
          </Button>
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
      
      {/* Mobile players panel (slide-in) */}
      <div 
        className={`fixed top-12 sm:top-14 right-0 bottom-0 w-64 sm:w-72 bg-black/70 backdrop-blur-lg z-30 transform transition-transform duration-300 ease-in-out overflow-auto border-l border-white/10 shadow-2xl sm:hidden
        ${showPlayers ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-3 border-b border-white/10">
          <h3 className="text-white font-medium">Players</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/70 hover:bg-white/10 h-8 w-8 rounded-full" 
            onClick={() => setShowPlayers(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-3 space-y-3">
          {otherPlayers.map((player) => (
            <PlayerInfo key={player.id} player={player} isCurrentTurn={player.id === state.currentPlayer} />
          ))}
        </div>
      </div>
      
      {/* Game log (slide-in panel) - Enhanced styling */}
      <div 
        className={`fixed top-12 sm:top-14 left-0 bottom-0 w-64 sm:w-72 bg-black/70 backdrop-blur-lg z-30 transform transition-transform duration-300 ease-in-out overflow-auto border-r border-white/10 shadow-2xl
        ${showLog ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-3 border-b border-white/10">
          <h3 className="text-white font-medium">Game Log</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/70 hover:bg-white/10 h-8 w-8 rounded-full" 
            onClick={() => setShowLog(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-3 space-y-2">
          {state.log && state.log.slice().reverse().map((entry, index) => (
            <div 
              key={index}
              className="bg-black/50 text-white/90 rounded-lg px-3 py-2 text-xs sm:text-sm border border-white/10 shadow-md"
            >
              {entry}
            </div>
          ))}
          
          {(!state.log || state.log.length === 0) && (
            <div className="text-white/50 text-center py-4 italic text-xs sm:text-sm">
              No game actions yet
            </div>
          )}
        </div>
      </div>
      
      {/* Players section - reorganized for better layout */}
      <div className="flex-1 flex flex-col min-h-0" style={{ overflow: 'visible' }}>
        {/* Other players - top section, hidden on mobile (moved to slide panel) */}
        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3">
          {otherPlayers.map((player) => (
            <PlayerInfo key={player.id} player={player} isCurrentTurn={player.id === state.currentPlayer} />
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
        
        {/* Current player info - shows above hand on mobile */}
        {myPlayer && (
          <div className="px-2 sm:px-3 py-2 block sm:hidden">
            <PlayerInfo 
              player={myPlayer} 
              isCurrentTurn={myPlayer.id === state.currentPlayer} 
            />
          </div>
        )}
        
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
