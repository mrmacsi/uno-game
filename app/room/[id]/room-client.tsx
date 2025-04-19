"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { GameState } from "@/lib/types"
import { GameProvider } from "@/components/providers/game-context"
import GameBoard from "@/components/game/game-board"
import WaitingRoom from "@/components/room/waiting-room"
import GameOver from "@/components/layout/game-over"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils" 

export default function RoomClientContent({ initialGameState }: { initialGameState: GameState }) {
  const router = useRouter(); 

  useEffect(() => {
    const storedPlayerId = getPlayerIdFromLocalStorage();
    if (!storedPlayerId) {
        router.push(`/join-room?roomId=${initialGameState.roomId}`);
    } else if (!initialGameState.players.some(p => p.id === storedPlayerId)) {
        router.push(`/join-room?roomId=${initialGameState.roomId}`);
    }
    // Removed dynamic import as getPlayerIdFromLocalStorage is now directly imported
  }, [initialGameState.roomId, initialGameState.players, router]);

  return (
    <GameProvider initialState={initialGameState} roomId={initialGameState.roomId}>
      {initialGameState.status === 'waiting' && <WaitingRoom />}
      {initialGameState.status === 'playing' && <GameBoard />}
      {initialGameState.status === 'finished' && <GameOver />}
    </GameProvider>
  );
} 