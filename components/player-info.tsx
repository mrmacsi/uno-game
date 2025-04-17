import type { Player } from "@/lib/types"
import { User, Clock } from "lucide-react"

interface PlayerInfoProps {
  player: Player
  isCurrentTurn: boolean
}

export default function PlayerInfo({ player, isCurrentTurn }: PlayerInfoProps) {
  return (
    <div 
      className={`
        backdrop-blur-lg rounded-xl overflow-hidden transition-all duration-300
        ${isCurrentTurn 
          ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-400/30 shadow-lg shadow-yellow-500/10" 
          : "bg-black/20 border border-white/10 hover:bg-black/30"}
      `}
    >
      <div className="p-3.5">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center shrink-0
            transition-all duration-300
            ${isCurrentTurn 
              ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-yellow-900 shadow-md" 
              : "bg-white/10 text-white/70"}
          `}>
            <User className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{player.name}</p>
            <div className="flex items-center text-white/70 text-xs mt-1">
              <div className="flex items-center">
                <div className={`
                  flex items-center gap-1.5
                  ${isCurrentTurn ? "text-yellow-300 font-medium" : ""}
                `}>
                  {player.cards.length} cards
                </div>
              </div>
            </div>
          </div>
          
          {isCurrentTurn && (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs px-3 py-1.5 rounded-full font-medium shrink-0 shadow-sm">
              <Clock className="w-3 h-3" />
              <span>Turn</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Card count visualization */}
      <div className="h-1.5 bg-black/30">
        <div 
          className={`h-full ${isCurrentTurn 
            ? "bg-gradient-to-r from-amber-400 to-yellow-500" 
            : "bg-white/30"}`} 
          style={{
            width: `${Math.min(100, player.cards.length * 10)}%`,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </div>
    </div>
  )
}