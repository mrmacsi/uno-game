import UnoCard from "./uno-card"
import type { Card } from "@/lib/types"

interface DrawPileProps {
  count: number
}

export default function DrawPile({ count }: DrawPileProps) {
  const dummyCard: Card = {
    id: "draw-pile",
    type: "number",
    color: "blue",
    value: 0,
  }

  const cardStack = Array(Math.min(3, count)).fill(null);
  
  return (
    <div className="relative" style={{ height: '170px', width: '120px' }}>
      <div className={`card-stack animate-deal-card ${count > 0 ? 'animate-draw-card' : ''}`}>
        {cardStack.map((_, index) => (
          <div 
            key={`stack-${index}`} 
            className="absolute" 
            style={{
              transform: `translateY(${index * -2}px) translateX(${index * -2}px)`,
              zIndex: 10 - index
            }}
          >
            <UnoCard card={dummyCard} faceDown={true} disabled={true} />
          </div>
        ))}
      </div>
      
      <div className={`absolute bottom-0 left-0 right-0 text-center transition-transform duration-500 ${count > 0 ? 'translate-y-[-20px]' : ''}`}>
        <span className="text-white text-sm font-bold bg-black/70 px-3 py-1 rounded-full shadow-lg">
          {count}
        </span>
      </div>
    </div>
  )
}
