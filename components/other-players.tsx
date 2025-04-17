"use client"

import { useGame } from "./game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"

export default function OtherPlayers() {
  const { state, currentPlayerId, callUnoOnPlayer } = useGame()

  if (!currentPlayerId) return null

  const otherPlayers = state.players.filter((p) => p.id !== currentPlayerId)

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-white text-lg">Other Players</h2>
      <div className="flex flex-wrap justify-center gap-8">
        {otherPlayers.map((player) => (
          <div key={player.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-white font-medium ${state.currentPlayer === player.id ? "text-yellow-400" : ""}`}>
                {player.name} ({player.cards.length} cards)
              </div>
              {player.cards.length === 1 && !player.saidUno && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => callUnoOnPlayer(player.id)}
                  className="ml-2 text-xs"
                >
                  Call UNO!
                </Button>
              )}
            </div>
            <div className="flex justify-center space-x-[-60px]">
              {player.cards.map((_, index) => (
                <div key={index} style={{ zIndex: index }}>
                  <UnoCard
                    card={{ id: `dummy-${index}`, type: "number", color: "red", value: 0 }}
                    faceDown
                    disabled
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 