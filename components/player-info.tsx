import type { Player } from "@/lib/types"

interface PlayerInfoProps {
  player: Player
  isCurrentTurn: boolean
}

export default function PlayerInfo({ player, isCurrentTurn }: PlayerInfoProps) {
  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-3 ${isCurrentTurn ? "ring-2 ring-yellow-400" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium truncate">{player.name}</p>
          <p className="text-white/70 text-sm">{player.cards.length} cards</p>
        </div>
        {isCurrentTurn && <div className="bg-yellow-400 text-yellow-800 text-xs px-2 py-1 rounded-full">Turn</div>}
      </div>
    </div>
  )
}
