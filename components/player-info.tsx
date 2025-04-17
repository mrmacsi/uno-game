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
        backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300
        ${isCurrentTurn 
          ? "bg-gradient-to-r from-yellow-500/30 to-amber-600/30 border border-yellow-400/50 shadow-[0_0_15px_rgba(253,224,71,0.3)]" 
          : "bg-black/20 border border-white/10 hover:bg-black/30"}
      `}
    >
      <div className="p-2 sm:p-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`
            w-6 sm:w-8 h-6 sm:h-8 rounded-full flex items-center justify-center shrink-0
            ${isCurrentTurn ? "bg-yellow-500 text-yellow-900" : "bg-white/10 text-white/70"}
          `}>
            <User className="w-3 sm:w-4 h-3 sm:h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate text-sm sm:text-base">{player.name}</p>
            <div className="flex items-center text-white/70 text-xs mt-0.5">
              <div className="flex items-center">
                <div className={`flex items-center gap-1 ${isCurrentTurn ? "text-yellow-300" : ""}`}>
                  {player.cards.length} cards
                </div>
              </div>
            </div>
          </div>
          
          {isCurrentTurn && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium shrink-0">
              <Clock className="w-3 h-3" />
              <span>Turn</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Card count visualization */}
      <div className="h-1.5 bg-black/20">
        <div 
          className={`h-full ${isCurrentTurn ? "bg-yellow-400" : "bg-white/30"}`} 
          style={{
            width: `${Math.min(100, player.cards.length * 10)}%`,
            transition: "width 0.5s ease-out"
          }}
        />
      </div>
    </div>
  )
}