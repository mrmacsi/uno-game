"use client"

import type { Card as CardType } from "@/lib/types"

interface UnoCardProps {
  card: CardType
  onClick?: () => void
  disabled?: boolean
  faceDown?: boolean
}

export default function UnoCard({ card, onClick, disabled = false, faceDown = false }: UnoCardProps) {
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
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-4xl font-bold">UNO</div>
        </div>
      )
    }

    const textColorClass = getTextColor()

    if (card.type === "number") {
      return <div className={`${textColorClass} text-4xl font-bold`}>{card.value}</div>
    }

    if (card.type === "skip") {
      return (
        <div className={`${textColorClass} text-2xl font-bold`}>
          <div className={`rounded-full border-4 border-current w-16 h-16 flex items-center justify-center`}>
            <div className="transform rotate-45 w-12 h-1 bg-current absolute"></div>
          </div>
        </div>
      )
    }

    if (card.type === "reverse") {
      return (
        <div className={`${textColorClass} text-2xl font-bold`}>
          <div className="flex flex-col items-center">
            <div className="transform rotate-180">↺</div>
            <div>↺</div>
          </div>
        </div>
      )
    }

    if (card.type === "draw2") {
      return <div className={`${textColorClass} text-2xl font-bold`}>+2</div>
    }

    if (card.type === "wild") {
      return (
        <div className="text-3xl font-bold bg-gradient-to-br from-red-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
          WILD
        </div>
      )
    }

    if (card.type === "wild4") {
      return (
        <div className="text-2xl font-bold">
          <div className="bg-gradient-to-br from-red-600 via-blue-600 to-green-600 bg-clip-text text-transparent">+4</div>
        </div>
      )
    }
    
    if (card.type === "wildSwap") {
      return (
        <div className="text-2xl font-bold">
          <div className="bg-gradient-to-br from-red-600 via-blue-600 to-green-600 bg-clip-text text-transparent">SWAP</div>
        </div>
      )
    }

    return null
  }

  return (
    <div
      className={`w-24 h-36 rounded-xl shadow-xl flex items-center justify-center ${getCardColor()} ${
        !disabled && !faceDown ? "cursor-pointer card-hover-effect" : "opacity-90"
      } card-transition animate-draw-card relative overflow-hidden`}
      onClick={!disabled && !faceDown ? onClick : undefined}
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-gradient-to-br from-white via-transparent to-transparent"></div>
      <div className="bg-white w-20 h-32 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-inner relative z-10">
        {getCardContent()}
      </div>
    </div>
  )
}
