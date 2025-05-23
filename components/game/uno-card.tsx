"use client"

import type { Card as CardType } from "@/lib/types"
import { cn } from "@/lib/utils";

interface UnoCardProps {
  card: CardType
  onClick?: () => void
  disabled?: boolean
  faceDown?: boolean
  isMobile?: boolean
  className?: string; // Allow parent to pass additional classes
}

export default function UnoCard({ card, onClick, disabled = false, faceDown = false, animationClass = "", isMobile = false, className }: UnoCardProps & { animationClass?: string }) {
  const getCardColor = () => {
    if (faceDown) return "bg-gradient-to-br from-blue-900 to-blue-700"

    switch (card.color) {
      case "red":
        return "bg-gradient-to-br from-red-700 to-red-500"
      case "blue":
        return "bg-gradient-to-br from-blue-700 to-blue-500"
      case "green":
        return "bg-gradient-to-br from-green-700 to-green-500"
      case "yellow":
        return "bg-gradient-to-br from-yellow-600 to-yellow-400"
      case "black":
        return "bg-gradient-to-br from-gray-900 to-gray-700"
      default:
        return "bg-gradient-to-br from-gray-800 to-gray-600"
    }
  }
  
  const getTextColor = () => {
    if (faceDown) return "text-white"
    
    switch (card.color) {
      case "red":
        return "text-red-600"
      case "blue":
        return "text-blue-600"
      case "green":
        return "text-green-600"
      case "yellow":
        return "text-yellow-500"
      case "black":
        return "text-black"
      default:
        return "text-gray-800"
    }
  }

  const getCardContent = () => {
    if (faceDown) {
      return (
        <div className="bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 w-full h-full flex items-center justify-center">
          <div className="text-white text-3xl sm:text-4xl font-black">UNO</div>
        </div>
      )
    }

    if (card.type === "number") {
      if (isMobile) {
        return <div className={`text-5xl font-extrabold ${getTextColor()} mt-2 mb-0 leading-none`}>{card.value}</div>
      }
      return <div className={`text-3xl sm:text-4xl font-bold ${getTextColor()}`}>{card.value}</div>
    }

    if (card.type === "skip") {
      return <div className={`text-3xl sm:text-4xl font-bold ${getTextColor()}`}>⃠</div>
    }

    if (card.type === "reverse") {
      return <div className={`text-xl sm:text-2xl font-bold ${getTextColor()}`}>↺</div>
    }

    if (card.type === "draw2") {
      return (
        <div className={`text-xl sm:text-2xl font-bold ${getTextColor()}`}>
          <div>+2</div>
        </div>
      )
    }

    if (card.type === "wild") {
      return (
        <div className="text-xl sm:text-2xl font-bold">
          <div className="bg-gradient-to-br from-red-600 via-blue-600 to-green-600 bg-clip-text text-transparent">WILD</div>
        </div>
      )
    }

    if (card.type === "wild4") {
      return (
        <div className="text-xl sm:text-2xl font-bold">
          <div className="bg-gradient-to-br from-red-600 via-blue-600 to-green-600 bg-clip-text text-transparent">+4</div>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className={cn(
        "w-20 sm:w-24 h-32 sm:h-36 rounded-xl shadow-xl flex items-center justify-center",
        getCardColor(),
        !disabled && !faceDown ? "cursor-pointer" : "opacity-90", // Removed card-hover-effect
        "card-transition relative overflow-hidden select-none max-w-[6rem] max-h-[9.5rem]",
        animationClass,
        className // Allow parent to pass classes like card-playable-indicator
      )}
      style={{ maxWidth: '6rem', maxHeight: '9.5rem' }}
      onClick={!disabled && !faceDown ? onClick : undefined}
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-gradient-to-br from-white via-transparent to-transparent"></div>
      <div className="bg-white w-16 sm:w-20 h-28 sm:h-32 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-inner relative z-10 max-w-[5rem] max-h-[8rem]" style={{ maxWidth: '5rem', maxHeight: '8rem' }}>
        {getCardContent()}
      </div>
    </div>
  )
}
