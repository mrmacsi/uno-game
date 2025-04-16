import type { Card } from "@/lib/types"
import UnoCard from "./uno-card"

interface DiscardPileProps {
  topCard: Card | null
}

export default function DiscardPile({ topCard }: DiscardPileProps) {
  if (!topCard) {
    return (
      <div className="w-24 h-36 rounded-lg border-2 border-dashed border-white/50 flex items-center justify-center">
        <p className="text-white text-xs text-center">Discard Pile</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <UnoCard card={topCard} disabled={true} />
      <div className="absolute -bottom-4 left-0 right-0 text-center">
        <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full">Discard Pile</span>
      </div>
    </div>
  )
}
