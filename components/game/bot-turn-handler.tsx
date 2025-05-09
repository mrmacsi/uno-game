"use client"

import { useEffect } from "react";
import { useGame } from "@/components/providers/game-context";
import { getBotPlay } from "@/lib/game-logic";
import type { GameState } from "@/lib/types";

const BOT_TURN_DELAY_MS = 1500;

export default function BotTurnHandler() {
  const { state: gameState } = useGame();

  useEffect(() => {
    const currentPlayer = gameState.players.find(player => player.id === gameState.currentPlayer);

    const handleBotTurn = async () => {
      if (!gameState.currentPlayer) return;
      const botPlayResult = getBotPlay(gameState as GameState, gameState.currentPlayer);

      try {
        if (botPlayResult.action === 'play') {
          const body: any = {
            roomId: gameState.roomId,
            playerId: gameState.currentPlayer,
            card: botPlayResult.card,
          };
          if (botPlayResult.chosenColor) {
            body.chosenColor = botPlayResult.chosenColor;
          }
          const response = await fetch('/api/game/play-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            console.error('Bot Action: Failed to play card:', response.statusText);
          }
        } else if (botPlayResult.action === 'draw') {
          const response = await fetch('/api/game/draw-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId: gameState.roomId, playerId: gameState.currentPlayer }),
          });

          if (!response.ok) {
            console.error('Bot Action: Failed to draw card:', response.statusText);
          }
        }
      } catch (error) {
        console.error('Bot Action: Error during bot turn:', error);
      }
    };

    let turnTimeoutId: NodeJS.Timeout | undefined;

    if (currentPlayer?.isBot && gameState.status === "playing") {
      console.log(`BotTurnHandler: Bot ${currentPlayer.name} is playing in ${BOT_TURN_DELAY_MS}ms. Current player ID: ${gameState.currentPlayer}, Game status: ${gameState.status}`);
      turnTimeoutId = setTimeout(() => {
        console.log(`BotTurnHandler: Executing bot turn for ${currentPlayer.name}`);
        handleBotTurn();
      }, BOT_TURN_DELAY_MS);
    } else {
      // console.log(`BotTurnHandler: Not bot's turn or game not playing. Current player: ${currentPlayer?.name}, Is bot: ${currentPlayer?.isBot}, Status: ${gameState.status}`);
    }

    return () => {
      if (turnTimeoutId) {
        clearTimeout(turnTimeoutId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [gameState.currentPlayer, gameState.status, gameState.roomId, gameState.players]); // gameState itself is not needed due to players, status, etc.

  return null; // This component does not render anything
}
