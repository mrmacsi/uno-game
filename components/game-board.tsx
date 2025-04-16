"use client"

import { useGame } from "./game-context"
import PlayerHand from "./player-hand"
import DiscardPile from "./discard-pile"
import DrawPile from "./draw-pile"
import PlayerInfo from "./player-info"
import GameControls from "./game-controls"
import GameOver from "./game-over"

export default function GameBoard() {
  const { state } = useGame()

  if (state.status === "finished") {
    return <GameOver />
  }

  return (
    <div className="flex flex-col h-screen bg-green-800 p-4">
      {/* Opponents */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {state.players
          .filter((player) => player.id !== state.currentPlayer)
          .map((player, index) => (
            <PlayerInfo key={player.id} player={player} isCurrentTurn={player.id === state.currentPlayer} />
          ))}
      </div>

      {/* Game Table */}
      <div className="flex-1 flex items-center justify-center gap-8">
        <DrawPile count={state.drawPileCount} />
        <DiscardPile topCard={state.discardPile[state.discardPile.length - 1]} />
      </div>

      {/* Current Player's Hand */}
      <div className="mt-auto">
        <PlayerHand />
      </div>

      {/* Game Controls */}
      <GameControls />
    </div>
  )
}
