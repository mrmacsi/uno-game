import type { Card } from "@/lib/types"
import UnoCard from "./uno-card"
import { useEffect, useState } from "react"
import { LayoutDashboard } from "lucide-react"

interface DiscardPileProps {
  topCard: Card | null
}

export default function DiscardPile({ topCard }: DiscardPileProps) {
  const [animateCard, setAnimateCard] = useState(false)
  
  // Animate ONLY when the top card's ID changes
  useEffect(() => {
    if (topCard) {
      setAnimateCard(true)
      const timer = setTimeout(() => setAnimateCard(false), 700)
      return () => clearTimeout(timer)
    }
  }, [topCard?.id])

  if (!topCard) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="w-20 sm:w-28 h-32 sm:h-40 rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center bg-black/20 backdrop-blur-md">
          <div className="flex flex-col items-center justify-center text-white/70">
            <LayoutDashboard className="w-5 sm:w-6 h-5 sm:h-6 mb-2" />
            <p className="text-xs text-center font-medium">Discard Pile</p>
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

  // Determine color for glow effect based on card color
  const glowColor = {
    red: "shadow-red-500/50",
    blue: "shadow-blue-500/50",
    green: "shadow-green-500/50",
    yellow: "shadow-yellow-500/50",
    black: "shadow-gray-500/50",
    wild: "shadow-purple-500/50",
  }[topCard.color || "wild"]

  // Dynamic card stack count based on discard pile size
  const stackCount = 3;

  return (
    <div className="relative flex flex-col items-center">
      {/* Placeholder cards to create stack effect */}
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
      
      {/* Top card with animation */}
      <div 
        className={`relative transition-all duration-500 ease-out z-10 ${
          animateCard ? "scale-110 rotate-3" : "scale-100 rotate-0"
        } ${glowColor ? `shadow-xl ${glowColor}` : ""}`}
      >
        <UnoCard card={topCard} disabled={true} animationClass={animateCard ? "animate-discard" : ""} />
      </div>
      
      {/* Label */}
      <div className="mt-3">
        <span className="text-white/90 text-xs sm:text-sm font-medium bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md">
          Discard
        </span>
      </div>
    </div>
  )
}