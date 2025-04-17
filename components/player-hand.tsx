"use client"

import { useGame } from "./game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function PlayerHand() {
  const { state, currentPlayerId, playCard, sayUno } = useGame()
  const [animatingCard, setAnimatingCard] = useState<string | null>(null)

  if (!currentPlayerId) return null

  const currentPlayer = state.players.find((p) => p.id === currentPlayerId)

  if (!currentPlayer) return null

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canSayUno = currentPlayer.cards.length === 2 && isMyTurn

  return (
    <div className="relative">
      <h2 className="text-white text-xl font-bold mb-4 text-shadow">Your Hand</h2>
      <div className="flex items-center justify-center overflow-x-auto pb-8">
        <div className="flex space-x-[-30px] px-4">
          {currentPlayer.cards.map((card, index) => {
            const isPlayable = isMyTurn && state.isValidPlay(card);
            const animationDelay = `${index * 0.05}s`;
            
            return (
              <div 
                key={card.id} 
                className={`transition-all duration-300 ${animatingCard === card.id ? 'animate-play-card' : 'animate-deal-card'} ${isPlayable ? 'hover:translate-y-[-30px]' : ''}`} 
                style={{ 
                  zIndex: index,
                  animationDelay: animationDelay,
                  transformOrigin: 'bottom center'
                }}
              >
                <div className={isPlayable ? 'animate-glow' : ''}>
                  <UnoCard
                    card={card}
                    onClick={() => {
                      if (isMyTurn && state.isValidPlay(card)) {
                        setAnimatingCard(card.id)
                        setTimeout(() => {
                          playCard(card.id)
                          setAnimatingCard(null)
                        }, 500)
                      }
                    }}
                    disabled={!isMyTurn || !state.isValidPlay(card)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canSayUno && (
        <div className="absolute bottom-8 right-8">
          <Button 
            onClick={sayUno} 
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 rounded-full shadow-lg animate-pulse"
          >
            UNO!
          </Button>
        </div>
      )}
    </div>
  )
}
