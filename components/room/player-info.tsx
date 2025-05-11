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
  
  // This determines if the PlayerInfo card being rendered is for the player whose turn it is globally.
  // const isGloballyCurrentTurnPlayer = state.currentPlayer === player.id;

  // This determines if the PlayerInfo card being rendered is for the user viewing the page AND it's their turn.
  const isMySpecificTurn = state.currentPlayer === player.id && player.id === currentPlayerId;
  
  const handleRing = (e: React.MouseEvent) => {
    e.stopPropagation()
    ringOpponent(player.id)
  }
  
  return (
    <div 
      className={cn(
        "rounded-md sm:rounded-lg overflow-hidden transition-all duration-300",
        // Apply 'my-turn-highlight' if it's this player's turn (based on prop)
        // This prop 'isCurrentTurn' should ideally be true ONLY for the player whose turn it is.
        isCurrentTurn ? "my-turn-highlight bg-amber-500/10" : "bg-black/50", 
        // If we want a more general highlight for the player who just played or is current in a broader sense (not necessarily MY turn)
        // we could use current-player-info-highlight based on a different condition.
        // For now, isCurrentTurn is the primary driver for the strongest highlight.
      )}
    >
      <div className="p-1 sm:p-1.5 flex items-center justify-between gap-1 sm:gap-1.5">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-grow min-w-0"> 
          <div className="relative flex-shrink-0">
            <AvatarDisplay 
              index={player.avatarIndex ?? 0}
              size="xs"
              className={cn(
                "transition-all duration-300",
                // The my-turn-highlight on parent div already provides a strong border.
                // We can keep a subtle ring or remove if it feels redundant.
                isCurrentTurn && "ring-1 ring-offset-1 ring-offset-yellow-600/50 ring-yellow-300",
                player.isHost && "ring-1 ring-yellow-400/60"
              )}
            />
            {player.isHost && (
              <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow">
                <Crown className="w-2 h-2 text-yellow-900" />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-grow">
             <p 
               className={cn(
                "font-medium truncate text-[10px] sm:text-xs w-full leading-tight",
                isCurrentTurn ? "text-yellow-100" : "text-white"
               )}
               title={player.name}
             >
               {player.name}
             </p>
             <div className={cn(
                "flex items-center text-[9px] sm:text-[10px] leading-tight",
                isCurrentTurn ? "text-yellow-200 font-semibold" : "text-white/60"
             )}>
               {player.cards.length} <span className="hidden sm:inline ml-0.5">cards</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {showRingButton && player.id !== currentPlayerId && state.currentPlayer !== player.id && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 p-0.5 text-white/70 hover:text-amber-400 hover:bg-white/10 rounded-full flex-shrink-0"
              onClick={handleRing}
              title={`Ring ${player.name}`}
            >
              <Bell className="w-3 h-3" />
            </Button>
          )}
          
          {isCurrentTurn && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold flex-shrink-0 shadow-sm whitespace-nowrap">
              <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
              <span>Turn</span>
            </div>
          )}
        </div>
      </div>
      
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
