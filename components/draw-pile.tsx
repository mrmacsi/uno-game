import { useEffect, useState } from "react"
import UnoCard from "./uno-card"
import type { Card } from "@/lib/types"
import { Layers } from "lucide-react"
import { useGame } from "./game-context"

interface DrawPileProps {
  count: number
}

export default function DrawPile({ count }: DrawPileProps) {
  const { state, currentPlayerId, drawCard } = useGame()
  const [prevCount, setPrevCount] = useState(count)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showFlyingCard, setShowFlyingCard] = useState(false)
  const [recentDrawCount, setRecentDrawCount] = useState(0)
  const [showDrawCount, setShowDrawCount] = useState(false)
  
  const isMyTurn = state.currentPlayer === currentPlayerId
  const canDraw = isMyTurn && !state.hasDrawnThisTurn
  
  // Detect when cards are drawn
  useEffect(() => {
    if (count < prevCount) {
      const difference = prevCount - count
      setRecentDrawCount(difference)
      setShowDrawCount(true)
      setIsDrawing(true)
      setShowFlyingCard(true)
      
      const drawTimer = setTimeout(() => setIsDrawing(false), 500)
      const flyingCardTimer = setTimeout(() => setShowFlyingCard(false), 600)
      const countTimer = setTimeout(() => setShowDrawCount(false), 2000)
      
      return () => {
        clearTimeout(drawTimer)
        clearTimeout(flyingCardTimer)
        clearTimeout(countTimer)
      }
    }
    setPrevCount(count)
  }, [count, prevCount])

  const handleDrawClick = () => {
    if (canDraw) {
      drawCard()
    }
  }

  const dummyCard: Card = {
    id: "draw-pile",
    type: "number",
    color: "blue",
    value: 0,
  }

  // Show a max of 5 cards in the stack for visual effect
  const visibleCardCount = Math.min(5, count)
  const cardStack = Array(visibleCardCount).fill(null)
  
  // Display logic for empty pile
  if (count === 0) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="w-28 h-40 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center text-white/60">
            <Layers className="w-6 h-6 mb-2" />
            <p className="text-xs text-center font-medium">Draw Pile</p>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-white/80 text-sm font-medium bg-black/60 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
            Empty
          </span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative flex flex-col items-center">
      {/* Draw count indicator */}
      {showDrawCount && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-50 animate-float-up">
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold px-3 py-1 rounded-full text-sm shadow-lg animate-pulse">
            +{recentDrawCount}
          </div>
        </div>
      )}
      
      <div 
        className={`h-40 relative ${canDraw 
          ? 'cursor-pointer hover:scale-105 transition-transform duration-300 ease-out' 
          : ''}`}
        onClick={handleDrawClick}
      >
        {/* Flying card animation */}
        {showFlyingCard && (
          <div className="absolute top-0 left-0 z-50 animate-fly-to-hand pointer-events-none">
            <UnoCard 
              card={dummyCard} 
              faceDown={true} 
              disabled={true}
            />
          </div>
        )}
        
        {/* Card stack with slight offset for visual depth */}
        {cardStack.map((_, index) => {
          const stackOffset = (visibleCardCount - index - 1) * 1.5
          const isTopCard = index === 0
          
          return (
            <div 
              key={`stack-${index}`} 
              className={`
                absolute transition-all duration-300 ease-out
                ${isDrawing && isTopCard ? "opacity-0 translate-x-8" : "opacity-100"}
              `} 
              style={{
                transform: `translateY(${-stackOffset}px) translateX(${-stackOffset}px)`,
                zIndex: visibleCardCount - index
              }}
            >
              <UnoCard 
                card={dummyCard} 
                faceDown={true} 
                disabled={!canDraw} 
                animationClass={isDrawing && isTopCard ? "animate-draw" : ""}
              />
            </div>
          )
        })}
        
        {/* Glow effect when it's the player's turn to draw */}
        {canDraw && (
          <div className="absolute inset-0 rounded-xl bg-blue-500/20 animate-pulse-subtle z-0"></div>
        )}
      </div>
      
      {/* Count indicator */}
      <div className="mt-3">
        <span className={`
          text-white text-sm font-medium 
          backdrop-blur-md px-3 py-1.5
          rounded-full shadow-md transition-all duration-300
          ${count <= 5 
            ? "bg-gradient-to-r from-red-500/80 to-red-600/80 text-white" 
            : "bg-black/70"}
        `}>
          {count} {count === 1 ? "card" : "cards"}
        </span>
      </div>
      
      {/* Visual indicator for low cards */}
      {count <= 5 && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
          <div className="animate-ping absolute h-3 w-3 rounded-full bg-red-500 opacity-75"></div>
          <div className="h-3 w-3 rounded-full bg-red-500"></div>
        </div>
      )}
      
      {/* Draw card prompt when it's your turn */}
      {canDraw && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full animate-bounce-gentle shadow-lg shadow-blue-500/20">
            Click to draw
          </div>
        </div>
      )}
    </div>
  )
}