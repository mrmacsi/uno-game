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
    if (faceDown) return "bg-blue-800"

    switch (card.color) {
      case "red":
        return "bg-red-600"
      case "blue":
        return "bg-blue-600"
      case "green":
        return "bg-green-600"
      case "yellow":
        return "bg-yellow-500"
      case "wild":
        return "bg-gradient-to-br from-red-600 via-blue-600 to-green-600"
      default:
        return "bg-gray-800"
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

    if (card.type === "number") {
      return <div className="text-white text-4xl font-bold">{card.value}</div>
    }

    if (card.type === "skip") {
      return (
        <div className="text-white text-2xl font-bold">
          <div className="rounded-full border-4 border-white w-16 h-16 flex items-center justify-center">
            <div className="transform rotate-45 w-12 h-1 bg-white absolute"></div>
          </div>
        </div>
      )
    }

    if (card.type === "reverse") {
      return (
        <div className="text-white text-2xl font-bold">
          <div className="flex flex-col items-center">
            <div className="transform rotate-180">↺</div>
            <div>↺</div>
          </div>
        </div>
      )
    }

    if (card.type === "draw2") {
      return <div className="text-white text-2xl font-bold">+2</div>
    }

    if (card.type === "wild") {
      return <div className="text-white text-2xl font-bold">WILD</div>
    }

    if (card.type === "wild4") {
      return <div className="text-white text-2xl font-bold">+4</div>
    }

    return null
  }

  return (
    <div
      className={`w-24 h-36 rounded-lg shadow-lg flex items-center justify-center ${getCardColor()} ${
        !disabled && !faceDown ? "cursor-pointer hover:shadow-xl transform hover:scale-105" : "opacity-70"
      } transition-all duration-200`}
      onClick={!disabled && !faceDown ? onClick : undefined}
    >
      <div className="bg-white w-20 h-32 rounded-lg flex items-center justify-center">{getCardContent()}</div>
    </div>
  )
}
