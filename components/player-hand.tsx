"use client"

import { useGame } from "./game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"

export default function PlayerHand() {
  const { state, currentPlayerId, playCard, sayUno } = useGame()

  if (!currentPlayerId) return null

  const currentPlayer = state.players.find((p) => p.id === currentPlayerId)

  if (!currentPlayer) return null

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canSayUno = currentPlayer.cards.length === 2 && isMyTurn

  return (
    <div className="relative">
      <h2 className="text-white text-lg mb-2">Your Hand</h2>
      <div className="flex items-center justify-center overflow-x-auto pb-4">
        <div className="flex space-x-[-40px]">
          {currentPlayer.cards.map((card, index) => (
            <div key={card.id} className="transition-transform hover:translate-y-[-20px]" style={{ zIndex: index }}>
              <UnoCard
                card={card}
                onClick={() => isMyTurn && playCard(card.id)}
                disabled={!isMyTurn || !state.isValidPlay(card)}
              />
            </div>
          ))}
        </div>
      </div>

      {canSayUno && (
        <div className="absolute bottom-4 right-4">
          <Button onClick={sayUno} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
            UNO!
          </Button>
        </div>
      )}
    </div>
  )
}
