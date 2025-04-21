import type { Player } from "@/lib/types"
import { Bell, Clock, Crown } from "lucide-react"
import { AvatarDisplay } from "../game/avatar-display"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useGame } from "../providers/game-context"

interface PlayerInfoProps {
  player: Player
  isCurrentTurn: boolean
  showRingButton?: boolean
}

export default function PlayerInfo({ player, isCurrentTurn, showRingButton = false }: PlayerInfoProps) {
  const { state, ringOpponent, currentPlayerId } = useGame()
  
  const isCurrentPlayer = player.id === currentPlayerId
  const isMyTurn = state.currentPlayer === currentPlayerId
  
  const handleRing = (e: React.MouseEvent) => {
    e.stopPropagation()
    ringOpponent(player.id)
  }
  
  return (
    <div 
      className={cn(
        "rounded-md sm:rounded-lg overflow-hidden transition-all duration-300",
        isCurrentTurn 
          ? "border border-yellow-400/40 bg-amber-500/20" 
          : "bg-black/50"
      )}
    >
      <div className="p-1 sm:p-1.5 flex items-center justify-between gap-1 sm:gap-1.5">
        {/* Main container for Avatar, Name, Card Count */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-grow min-w-0"> 
          {/* Avatar and Host indicator */}
          <div className="relative flex-shrink-0">
            <AvatarDisplay 
              index={player.avatarIndex ?? 0}
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

          {/* Player name and Card Count (Vertical Flex) */}
          <div className="flex flex-col min-w-0 flex-grow">
             <p 
               className="text-white font-medium truncate text-[10px] sm:text-xs w-full leading-tight"
               title={player.name}
             >
               {player.name}
             </p>
             {/* Card Count */}
             <div className={cn(
                "flex items-center text-white/60 text-[9px] sm:text-[10px] leading-tight",
                isCurrentTurn && "text-yellow-200 font-semibold"
             )}>
               {player.cards.length} <span className="hidden sm:inline ml-0.5">cards</span>
             </div>
          </div>
        </div>
        
        {/* Action buttons or turn indicator */}
        <div className="flex items-center gap-1">
          {/* Show ring button only if: showRingButton is true, it's not the current player's own info card, AND it's not the current player's turn */}
          {showRingButton && !isCurrentPlayer && !isMyTurn && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 p-0.5 text-white/70 hover:text-amber-400 hover:bg-white/10 rounded-full flex-shrink-0"
              onClick={handleRing}
              title="Ring player"
            >
              <Bell className="w-3 h-3" />
            </Button>
          )}
          
          {/* Turn Indicator (if applicable) */}
          {isCurrentTurn && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold flex-shrink-0 shadow-sm whitespace-nowrap">
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