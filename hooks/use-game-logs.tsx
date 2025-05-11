import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { GameState, LogEntry } from '@/lib/types';

interface GameLogsProps {
  state: GameState;
  getGameDuration: () => string;
}

export function useGameLogs({
  state,
  getGameDuration
}: GameLogsProps) {
  const previousLogRef = useRef<LogEntry[]>([]);
  const shownToastIds = useRef(new Set<string>());

  useEffect(() => {
    if (!state.log) {
      previousLogRef.current = [];
      return;
    }
    const prevLog = previousLogRef.current;
    const currentLog = state.log;
    const newEntries = currentLog.slice(prevLog.length);

    newEntries.forEach(newestEntry => {
      if (shownToastIds.current.has(newestEntry.id) || (Date.now() - newestEntry.timestamp > 5000)) {
        return;
      }
      shownToastIds.current.add(newestEntry.id);

      let toastTitle = "Game Update";
      let toastDescription = newestEntry.message;
      let duration = 2000;

      if (newestEntry.eventType === 'play' || newestEntry.eventType === 'draw') {
        return;
      }
      
      switch (newestEntry.eventType) {
        case 'skip':
          toastTitle = `${newestEntry.player || 'Someone'} Skipped`;
          break;
        case 'reverse':
          toastTitle = `Direction Reversed`;
          break;
        case 'uno':
          toastTitle = `${newestEntry.player || 'Someone'} Declared UNO!`;
          break;
        case 'uno_fail':
          toastTitle = `UNO! Missed`;
          toastDescription = `${newestEntry.player || 'Someone'} forgot to declare UNO!`;
          duration = 2500;
          break;
        case 'win':
          toastTitle = `Game Over!`;
          const gameDuration = getGameDuration();
          toastDescription = `${newestEntry.player || 'Winner'} has won the game in ${gameDuration}!`;
          duration = 5000;
          break;
        case 'join':
          toastTitle = `Player Joined`;
          toastDescription = `${newestEntry.player || 'Someone'} joined the room.`;
          duration = 1500;
          break;
        case 'leave':
          toastTitle = `Player Left`;
          toastDescription = `${newestEntry.player || 'Someone'} left the room.`;
          duration = 1500;
          break;
        case 'system':
          toastTitle = `${newestEntry.player || 'System'} Message`;
          duration = 2500;
          break;
      }
      
      toast(toastTitle, {
        description: toastDescription,
        duration: duration,
      });
    });
    previousLogRef.current = currentLog;
  }, [state.log, getGameDuration]);
} 