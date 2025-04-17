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
import { Home, MessageCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function GameBoard() {
  const { state, selectWildCardColor, isColorSelectionOpen, closeColorSelector, currentPlayerId } = useGame()
  const router = useRouter()
  const [showLog, setShowLog] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check screen size
  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    window.addEventListener('resize', checkSize)
    checkSize()
    
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  const goToHome = () => {
    router.push("/")
  }

  if (state.status === "finished") {
    return <GameOver />
  }

  // Find the player that belongs to the user
  const myPlayer = state.players.find(p => p.id === currentPlayerId)
  // Filter out the user's player from the list of players displayed at the top
  const otherPlayers = state.players.filter(p => p.id !== currentPlayerId)

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-green-800 to-green-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/bg-pattern.svg')] opacity-5 pointer-events-none" />
      
      {/* Top navbar */}
      <div className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-sm z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/80 hover:bg-white/10 rounded-full" 
          onClick={() => setShowLog(!showLog)}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        
        <div className="font-bold text-white/90 text-lg">UNO Game</div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/80 hover:bg-white/10 rounded-full" 
          onClick={goToHome}
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Game log (slide-in panel) */}
      <div 
        className={`absolute top-14 left-0 bottom-0 w-72 bg-black/50 backdrop-blur-md z-30 transform transition-transform duration-300 overflow-auto
        ${showLog ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-3 border-b border-white/10">
          <h3 className="text-white font-medium">Game Log</h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/70 hover:bg-white/10 h-8 w-8" 
            onClick={() => setShowLog(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-3 space-y-2">
          {state.log && state.log.slice().reverse().map((entry, index) => (
            <div 
              key={index}
              className="bg-black/40 text-white/90 rounded px-3 py-2 text-sm border border-white/5"
            >
              {entry}
            </div>
          ))}
          
          {(!state.log || state.log.length === 0) && (
            <div className="text-white/50 text-center py-4 italic text-sm">
              No game actions yet
            </div>
          )}
        </div>
      </div>
      
      {/* Players section - reorganized for better layout */}
      <div className="flex-1 flex flex-col">
        {/* Other players - top section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
          {otherPlayers.map((player) => (
            <PlayerInfo key={player.id} player={player} isCurrentTurn={player.id === state.currentPlayer} />
          ))}
        </div>
        
        {/* Game area - middle section with card piles */}
        <div className="flex-1 flex items-center justify-center gap-8 sm:gap-16 p-4 relative">
          {/* Decorative elements */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-white/5 absolute animate-pulse-slow" />
            <div className="w-96 h-96 rounded-full border border-white/10 absolute animate-spin-slow" />
          </div>
          
          {/* Animated card path - a visual guide for the card animation */}
          <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-0"></div>
          
          {/* Card piles container - position them for better animation */}
          <div className="flex justify-center items-center gap-16 sm:gap-24 lg:gap-32 relative z-10">
            {/* Draw pile positioned on the left for better animation path */}
            <div className="relative">
              <DrawPile count={state.drawPileCount} />
            </div>
            
            {/* Discard pile on the right */}
            <div className="relative">
              <DiscardPile topCard={state.discardPile[state.discardPile.length - 1]} />
            </div>
          </div>
        </div>
        
        {/* Current player info - shows above hand on mobile */}
        {isMobile && myPlayer && (
          <div className="px-3 py-2">
            <PlayerInfo 
              player={myPlayer} 
              isCurrentTurn={myPlayer.id === state.currentPlayer} 
            />
          </div>
        )}
        
        {/* Player's Hand - bottom section */}
        <div className="mt-auto">
          <PlayerHand />
        </div>
        
        {/* Game Controls */}
        <GameControls />
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