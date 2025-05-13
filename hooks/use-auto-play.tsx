import { useState, useEffect, useCallback } from 'react';
import { getBotPlay } from '@/lib/game-logic';
import { executeAutomatedTurnAction } from '@/lib/auto-play-utils';
import { toast } from 'sonner';
import type { GameState } from '@/lib/types';

export function useAutoPlay() {
  // Auto play state with localStorage persistence
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(() => {
    if (typeof window !== "undefined") {
      const savedAutoPlay = localStorage.getItem("uno_autoplay_enabled");
      return savedAutoPlay === "true";
    }
    return false;
  });

  // Function to toggle Auto Play mode
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlayActive(prev => {
      const newState = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("uno_autoplay_enabled", newState.toString());
      }
      toast.info(`Auto Play ${newState ? 'Enabled' : 'Disabled'}`);
      return newState;
    });
  }, []);

  return { isAutoPlayActive, toggleAutoPlay };
}

interface AutoPlayProps {
  isAutoPlayActive: boolean;
  currentPlayerId: string | null;
  state: GameState;
}

export function useAutoPlayLogic({ isAutoPlayActive, currentPlayerId, state }: AutoPlayProps) {
  useEffect(() => {
    if (!isAutoPlayActive || !currentPlayerId || !state.currentPlayer) return;
    
    const isMyTurn = state.currentPlayer === currentPlayerId;
    if (!isMyTurn || state.status !== "playing") return;
    
    const currentPlayerDetails = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayerDetails || currentPlayerDetails.isBot) return;
    
    // Add a slight delay to make it feel more natural
    const autoPlayTimeout = setTimeout(async () => {
      try {
        console.log("Auto Play: Executing automated turn for human player");
        // Create a minimal game state to avoid large payload issues
        const minimalGameState: Partial<GameState> = {
          roomId: state.roomId,
          players: state.players.map(p => ({
            id: p.id,
            name: p.name,
            cards: p.cards,
            avatarIndex: p.avatarIndex,
            isBot: p.isBot || false,
            saidUno: p.saidUno || false,
            isHost: p.isHost || false
          })),
          currentPlayer: state.currentPlayer,
          direction: state.direction,
          drawPile: [],  // We don't need the draw pile for bot decision
          drawPileCount: state.drawPileCount,
          discardPile: state.discardPile.slice(-1), // Only need the top card
          currentColor: state.currentColor,
          status: state.status,
          hasDrawnThisTurn: state.hasDrawnThisTurn,
          winner: state.winner,
          log: []  // We don't need the logs for the bot decision
        };
        
        const botPlayResult = getBotPlay(minimalGameState as GameState, currentPlayerId);
        await executeAutomatedTurnAction(minimalGameState as GameState, currentPlayerId, botPlayResult);
      } catch (error) {
        console.error("Auto Play: Error during automated turn", error);
      }
    }, 400);
    
    return () => clearTimeout(autoPlayTimeout);
  }, [isAutoPlayActive, currentPlayerId, state.currentPlayer, state.status, state]);
} 