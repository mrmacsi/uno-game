import UnoCard from "./uno-card"
import type { Card } from "@/lib/types"

interface DrawPileProps {
  count: number
}

export default function DrawPile({ count }: DrawPileProps) {
  // Create a dummy card for the draw pile
  const dummyCard: Card = {
    id: "draw-pile",
    type: "number",
    color: "blue",
    value: 0,
  }

  return (
    <div className="relative">
      <UnoCard card={dummyCard} faceDown={true} disabled={true} />
      <div className="absolute -bottom-4 left-0 right-0 text-center">
        <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">Draw Pile ({count})</span>
      </div>
    </div>
  )
}
