import { useEffect } from 'react';
import { getPlayerIdFromLocalStorage } from '@/lib/client-utils';
import type { GameState } from '@/lib/types';

interface GameEffectsProps {
  currentPlayerId: string | null;
  setCurrentPlayerId: React.Dispatch<React.SetStateAction<string | null>>;
  state: GameState;
  refreshGameState: () => Promise<void>;
  setGameStartTime: React.Dispatch<React.SetStateAction<number | null>>;
  notificationSoundRef: React.RefObject<HTMLAudioElement | null>;
}

export function useGameEffects({
  currentPlayerId,
  setCurrentPlayerId,
  state,
  refreshGameState,
  setGameStartTime,
  notificationSoundRef
}: GameEffectsProps) {
  // Load sound effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio();
        audio.src = "/sounds/notification.wav";
        audio.preload = "auto";
        audio.volume = 0.8;
        notificationSoundRef.current = audio;
        audio.load();

        return () => {
          if (notificationSoundRef.current) {
            notificationSoundRef.current.src = "";
            notificationSoundRef.current = null;
          }
        };
      } catch (err) { }
    }
  }, [notificationSoundRef]);

  // Track player ID from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage();

      setCurrentPlayerId(storedPlayerId);
    };
    window.addEventListener("storage", handleStorageChange);
    const storedPlayerId = getPlayerIdFromLocalStorage();
    if (storedPlayerId !== currentPlayerId) {

      setCurrentPlayerId(storedPlayerId);
    }
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [currentPlayerId, setCurrentPlayerId]);

  // Regular game state refresh during play
  useEffect(() => {
    if (state.status !== "playing") return;
    const interval = setInterval(() => {
      refreshGameState();
    }, 1500);
    return () => clearInterval(interval);
  }, [state.status, refreshGameState]);

  // Refresh after discard pile or color changes
  useEffect(() => {
    if (state.status !== "playing") return;
    const refreshTimeout = setTimeout(() => {
      refreshGameState();
    }, 300);
    return () => clearTimeout(refreshTimeout);
  }, [state.status, refreshGameState, state.discardPile.length, state.currentColor]);

  // Track game start time
  useEffect(() => {
    if (state.status === "playing" && state.gameStartTime) {

      setGameStartTime(state.gameStartTime);
    }
  }, [state.status, state.gameStartTime, setGameStartTime]);
} 