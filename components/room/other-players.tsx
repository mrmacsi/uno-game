"use client"

import React from "react"
import { useGame } from "../providers/game-context"
import { motion } from "framer-motion"
import UnoCard from "../game/uno-card"
import { User } from "lucide-react"
import type { Player } from "@/lib/types"

export default function OtherPlayers() {
  const { state, currentPlayerId } = useGame()

  if (!currentPlayerId) return null

  const otherPlayers = state.players.filter((p: Player) => p.id !== currentPlayerId)

  // Define position offsets for other players (adjust as needed)
  const positions = [
    { top: '5%', left: '50%', transform: 'translateX(-50%)' }, // Top middle
    { top: '50%', left: '5%', transform: 'translateY(-50%)' }, // Middle left
    { top: '50%', right: '5%', transform: 'translateY(-50%)' }, // Middle right
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {otherPlayers.map((player: Player, index: number) => {
        const positionStyle = positions[index % positions.length]; // Cycle through positions
        const cardCount = player.cards.length;

        return (
          <motion.div
            key={player.id}
            className="absolute p-2 bg-background/80 backdrop-blur-sm rounded-lg shadow-md pointer-events-auto max-w-[150px] flex flex-col items-center text-center"
            style={positionStyle}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <User className="w-5 h-5 mb-1 text-muted-foreground" />
            <p className="text-sm font-medium truncate w-full" title={player.name}>
                {player.name}
                {state.currentPlayer === player.id && <span className="ml-1 text-primary font-bold"> (Turn)</span>}
            </p>
            <div className="flex items-center justify-center my-2 h-10">
              {/* Display facedown cards or card count */}
              <div className="flex -space-x-4 rtl:space-x-reverse">
                {Array(Math.min(cardCount, 3)).fill(0).map((_, cardIndex: number) => (
                   <div key={cardIndex} className="relative" style={{ width: '25px', height: '38px' }}>
                       <UnoCard card={{ id: `back-${cardIndex}`, type: 'back', color: 'black' }} disabled={true} faceDown={true} />
                   </div>
                ))}
                {cardCount > 3 && <span className="ml-1 text-xs font-semibold self-center">+{cardCount - 3}</span>}
                {cardCount === 0 && <span className="text-xs text-muted-foreground">No cards</span>}
              </div>
            </div>
            
            {cardCount === 1 && player.saidUno && (
                <p className="text-xs font-semibold text-green-600 mt-1">UNO!</p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}