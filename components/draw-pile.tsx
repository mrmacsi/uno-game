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
      setShowFlyingCard(true)
      setRecentDrawCount(prev => prev + 1)
      setTimeout(() => setShowFlyingCard(false), 800)
      setPrevCount(count)
      setShowDrawCount(true)
      setTimeout(() => setShowDrawCount(false), 1500)
    }
    setPrevCount(count)
  }, [count, prevCount])

  useEffect(() => {
    const onDrawCardClick = () => {
      if (canDraw) drawCard()
    }
    window.addEventListener('draw-card-click', onDrawCardClick)
    return () => window.removeEventListener('draw-card-click', onDrawCardClick)
  }, [canDraw, drawCard])

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

  const actualCount = count <= 0 ? 1 : count
  
  // Show a max of 5 cards in the stack for visual effect
  const visibleCardCount = Math.min(5, actualCount)
  const cardStack = Array(visibleCardCount).fill(null)
  
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
        className={`h-40 relative draw-pile ${canDraw 
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
          ${actualCount <= 5 
            ? "bg-gradient-to-r from-red-500/80 to-red-600/80 text-white" 
            : "bg-black/70"}
        `}>
          {count <= 0 ? "Draw" : `${count} ${count === 1 ? "card" : "cards"}`}
        </span>
      </div>
      
      {/* Visual indicator for low cards */}
      {actualCount <= 5 && count > 0 && (
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