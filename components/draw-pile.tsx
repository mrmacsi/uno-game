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
  const canDraw = isMyTurn && count > 0 && !state.hasDrawnThisTurn
  
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
    if (!canDraw) return
    setIsDrawing(true)
    drawCard()
    setTimeout(() => setIsDrawing(false), 1000)
  }

  const dummyCard: Card = {
    id: "draw-pile",
    type: "number",
    color: "blue",
    value: 0,
  }

  const actualCount = count <= 0 ? 0 : count
  
  if (actualCount === 0) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="w-20 sm:w-28 h-32 sm:h-40 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center text-white/70">
            <Layers className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
            <p className="text-xs text-center font-medium">Draw Pile</p>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-white/90 text-xs sm:text-sm font-medium bg-black/60 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
            Empty
          </span>
        </div>
      </div>
    )
  }
  
  const stackCount = 3
  return (
    <div className="relative flex flex-col items-center">
      {Array.from({ length: stackCount }).map((_, index) => (
        <div
          key={`stack-${index}`}
          className="absolute bg-white/10 rounded-xl border border-white/10"
          style={{
            width: 'calc(5rem + 2vw)',
            height: 'calc(8rem + 2vw)',
            transform: `rotate(${(index - stackCount/2) * 3}deg) translateY(${index * -1}px)`,
            zIndex: index,
          }}
        />
      ))}
      <div
        className={`relative transition-all duration-500 ease-out z-10 ${
          isDrawing ? "scale-110 rotate-3" : "scale-100 rotate-0"
        } shadow-xl shadow-blue-500/50`}
        onClick={handleDrawClick}
        style={{ cursor: canDraw ? 'pointer' : 'default' }}
      >
        {showFlyingCard && (
          <div className="absolute top-0 left-0 z-50 animate-fly-to-hand pointer-events-none">
            <UnoCard card={dummyCard} faceDown={true} disabled={true} />
          </div>
        )}
        <UnoCard
          card={dummyCard}
          faceDown={true}
          disabled={!canDraw}
          onClick={canDraw ? handleDrawClick : undefined}
          animationClass={isDrawing ? "animate-draw" : ""}
        />
        {canDraw && (
          <div className="absolute inset-0 rounded-xl bg-blue-500/30 animate-pulse-subtle z-0"></div>
        )}
      </div>
      <div className="mt-3">
        <span className="text-white/90 text-xs sm:text-sm font-medium bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md">
          {actualCount} {actualCount === 1 ? "card" : "cards"}
        </span>
      </div>
      {canDraw && (
        <div className="mt-2">
          <span className="text-white/90 text-xs sm:text-sm font-medium bg-blue-600/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md animate-bounce-gentle">
            Click to draw
          </span>
        </div>
      )}
      {showDrawCount && (
        <div className="absolute -top-8 sm:-top-12 md:-top-14 left-1/2 transform -translate-x-1/2 z-50 animate-float-up">
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold px-3 py-1 rounded-full text-xs sm:text-sm shadow-lg animate-pulse">
            +{recentDrawCount}
          </div>
        </div>
      )}
      {actualCount <= 5 && actualCount > 0 && (
        <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 transform -translate-x-1/2">
          <div className="animate-ping absolute h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-red-500 opacity-75"></div>
          <div className="h-2 sm:h-3 w-2 sm:w-3 rounded-full bg-red-500"></div>
        </div>
      )}
    </div>
  )
}