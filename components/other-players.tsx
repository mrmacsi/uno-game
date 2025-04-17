"use client"

import { useGame } from "./game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"
import { Bell, User } from "lucide-react"

export default function OtherPlayers() {
  const { state, currentPlayerId, callUnoOnPlayer } = useGame()

  if (!currentPlayerId) return null

  const otherPlayers = state.players.filter((p) => p.id !== currentPlayerId)

  return (
    <div className="p-2">
      <h2 className="text-white/90 text-lg font-medium mb-4 px-2">Opponents</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherPlayers.map((player) => {
          const isPlayerTurn = state.currentPlayer === player.id;
          const needsUnoCall = player.cards.length === 1 && !player.saidUno;
          
          return (
            <div 
              key={player.id} 
              className={`
                relative overflow-hidden rounded-xl transition-all duration-300
                ${isPlayerTurn 
                  ? "bg-gradient-to-br from-yellow-500/20 to-yellow-700/20 border border-yellow-400/30" 
                  : "bg-black/20 border border-white/10"}
                ${needsUnoCall ? "ring-2 ring-red-500 animate-pulse-slow" : ""}
              `}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center
                      ${isPlayerTurn ? "bg-yellow-500 text-yellow-900" : "bg-white/10 text-white/60"}
                    `}>
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className={`text-white font-medium truncate max-w-[120px] ${isPlayerTurn ? "text-yellow-300" : ""}`}>
                      {player.name}
                    </div>
                  </div>
                  
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${isPlayerTurn 
                      ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black" 
                      : "bg-white/10 text-white/70"}
                  `}>
                    {player.cards.length} cards
                  </div>
                </div>
                
                {/* Cards visualization */}
                <div className="relative h-16 mt-2">
                  {player.cards.length > 0 ? (
                    <div className="flex justify-center absolute inset-x-0">
                      {player.cards.map((_, index) => {
                        // Only show a reasonable number of cards visually
                        if (index >= Math.min(7, player.cards.length)) return null;
                        
                        // Calculate spread factor based on card count
                        const spreadFactor = Math.min(20, 120 / Math.max(1, player.cards.length));
                        const offsetX = (index - (Math.min(7, player.cards.length) - 1) / 2) * spreadFactor;
                        const rotationDeg = (index - (Math.min(7, player.cards.length) - 1) / 2) * 4;
                        
                        return (
                          <div 
                            key={index} 
                            className="absolute transform transition-all duration-500"
                            style={{ 
                              transform: `translateX(${offsetX}px) rotate(${rotationDeg}deg)`,
                              zIndex: index
                            }}
                          >
                            <div style={{ transform: "scale(0.7)", transformOrigin: "center top" }}>
                              <UnoCard
                                card={{ id: `dummy-${index}`, type: "number", color: "red", value: 0 }}
                                faceDown
                                disabled
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/50 text-sm">
                      No cards
                    </div>
                  )}
                </div>
                
                {/* UNO call button */}
                {needsUnoCall && (
                  <div className="mt-3 flex justify-center">
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => callUnoOnPlayer(player.id)}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-medium rounded-full px-4 py-1 shadow-md flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Call UNO!</span>
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Progress bar at bottom */}
              <div className="h-1 bg-black/30">
                <div 
                  className={`h-full ${isPlayerTurn ? "bg-yellow-400" : "bg-white/30"}`} 
                  style={{
                    width: `${100 - Math.min(100, player.cards.length * 10)}%`, 
                    transition: "width 0.5s ease-out"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}