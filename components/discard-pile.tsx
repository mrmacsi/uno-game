import type { Card } from "@/lib/types"
import UnoCard from "./uno-card"

interface DiscardPileProps {
  topCard: Card | null
}

export default function DiscardPile({ topCard }: DiscardPileProps) {
  if (!topCard) {
    return (
      <div className="relative" style={{ height: '170px', width: '120px' }}>
        <div className="w-24 h-36 rounded-lg border-2 border-dashed border-white/50 flex items-center justify-center absolute top-10 left-0">
          <p className="text-white text-xs text-center">Discard Pile</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <span className="text-white text-sm font-bold bg-black/70 px-3 py-1 rounded-full shadow-lg">Empty</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height: '170px', width: '120px' }}>
      <div className="absolute top-10 left-0">
        <UnoCard card={topCard} disabled={true} />
      </div>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span className="text-white text-sm font-bold bg-black/70 px-3 py-1 rounded-full shadow-lg">Discard</span>
      </div>
    </div>
  )
}
