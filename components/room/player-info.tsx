import type { Player } from "@/lib/types"
import { Clock, Crown } from "lucide-react"
import { AvatarDisplay } from "../game/avatar-display"
import { cn } from "@/lib/utils"

interface PlayerInfoProps {
  player: Player
  isCurrentTurn: boolean
}

export default function PlayerInfo({ player, isCurrentTurn }: PlayerInfoProps) {
  return (
    <div 
      className={`
        rounded-md sm:rounded-lg overflow-hidden transition-all duration-300
        ${isCurrentTurn 
          ? "border border-yellow-400/40 bg-amber-500/20" 
          : "bg-black/50"} 
      `}
    >
      <div className="p-1 sm:p-1.5 flex flex-col items-center">
        {/* Player name - very small */}
        <p className="text-white font-medium truncate text-[10px] sm:text-xs text-center w-full mb-0.5 sm:mb-1">{player.name}</p>
        
        <div className="flex items-center justify-between w-full gap-1 sm:gap-1.5">
          {/* Avatar and Host indicator - very small */}
          <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="relative">
                <AvatarDisplay 
                  index={player.avatar_index ?? 0}
                  size="xs"
                  className={cn(
                    "transition-all duration-300",
                    isCurrentTurn && "ring-2 ring-offset-1 ring-offset-amber-500/30 ring-yellow-400",
                    player.isHost && "ring-1 ring-yellow-400/60"
                  )}
                />
                {player.isHost && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow">
                    <Crown className="w-2 h-2 text-yellow-900" />
                  </div>
                )}
              </div>
              {/* Card Count - very small */}
               <div className="flex items-center text-white/60 text-[10px] sm:text-xs">
                 <div className={`
                    flex items-center gap-0.5 sm:gap-1
                    ${isCurrentTurn ? "text-yellow-200 font-semibold" : ""}
                 `}>
                   {player.cards.length} <span className="hidden sm:inline">cards</span>
                 </div>
               </div>
          </div>
          
          {isCurrentTurn && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold shrink-0 shadow-sm whitespace-nowrap">
              <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              <span>Turn</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Card count visualization - very thin */}
      <div className="h-0.5 bg-black/40">
        <div 
          className={`h-full ${isCurrentTurn 
            ? "bg-gradient-to-r from-amber-400 to-yellow-500" 
            : "bg-white/30"}`} 
          style={{
            width: `${Math.min(100, Math.max(5, player.cards.length * 10))}%`,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </div>
    </div>
  )
}