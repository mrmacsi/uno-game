"use client"

import { useEffect } from "react";
import { useGame } from "@/components/providers/game-context";
import { getBotPlay } from "@/lib/game-logic";
import type { GameState, Card } from "@/lib/types";

const BOT_TURN_DELAY_MS = 1500;

export default function BotTurnHandler() {
  const { state: gameState } = useGame();

  useEffect(() => {
    const currentPlayerInContext = gameState.players.find(player => player.id === gameState.currentPlayer);

    const handleBotTurn = async () => {
      if (!gameState.currentPlayer) {
        console.error("BotTurnHandler: No current player ID in game state for bot turn.");
        return;
      }
      
      const botPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
      if (!botPlayer) {
        console.error(`BotTurnHandler: Bot player with ID ${gameState.currentPlayer} not found in game state.`);
        return;
      }

      console.log("BotTurnHandler: GameState at bot turn execution:", JSON.parse(JSON.stringify(gameState)));
      console.log("BotTurnHandler: Bot player object:", JSON.parse(JSON.stringify(botPlayer)));
      console.log("BotTurnHandler: Bot hand before getBotPlay:", JSON.parse(JSON.stringify(botPlayer.cards)));

      const botPlayResult = getBotPlay(gameState as GameState, gameState.currentPlayer);
      console.log("BotTurnHandler: botPlayResult from getBotPlay:", JSON.parse(JSON.stringify(botPlayResult)));

      try {
        if (botPlayResult.action === 'play') {
          const cardToPlay: Card = botPlayResult.card;
          console.log("BotTurnHandler: Card to play:", JSON.parse(JSON.stringify(cardToPlay)));

          if (!cardToPlay || typeof cardToPlay.id !== 'string') {
            console.error("BotTurnHandler: Invalid card object or missing/invalid card ID before sending to API.", cardToPlay);
            return; 
          }

          const body: any = {
            roomId: gameState.roomId,
            playerId: gameState.currentPlayer,
            card: cardToPlay,
          };
          if (botPlayResult.chosenColor) {
            body.chosenColor = botPlayResult.chosenColor;
          }
          
          console.log("BotTurnHandler: Request body for /api/game/play-card:", JSON.parse(JSON.stringify(body)));

          const response = await fetch('/api/game/play-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('Bot Action: Failed to play card:', response.status, response.statusText, errorData);
          } else {
            console.log("Bot Action: Successfully played card.")
          }
        } else if (botPlayResult.action === 'draw') {
          console.log("BotTurnHandler: Bot is drawing a card.");
          const response = await fetch('/api/game/draw-card', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomId: gameState.roomId, playerId: gameState.currentPlayer }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('Bot Action: Failed to draw card:', response.status, response.statusText, errorData);
          } else {
             console.log("Bot Action: Successfully drew card.")
          }
        }
      } catch (error) {
        console.error('Bot Action: Error during bot turn execution:', error);
      }
    };

    let turnTimeoutId: NodeJS.Timeout | undefined;

    if (currentPlayerInContext?.isBot && gameState.status === "playing") {
      console.log(`BotTurnHandler: Scheduling bot turn for ${currentPlayerInContext.name} in ${BOT_TURN_DELAY_MS}ms. Current player ID: ${gameState.currentPlayer}, Game status: ${gameState.status}`);
      turnTimeoutId = setTimeout(() => {
        console.log(`BotTurnHandler: Executing bot turn for ${currentPlayerInContext.name} (ID: ${gameState.currentPlayer})`);
        handleBotTurn();
      }, BOT_TURN_DELAY_MS);
    } 

    return () => {
      if (turnTimeoutId) {
        clearTimeout(turnTimeoutId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [gameState.currentPlayer, gameState.status, gameState.roomId, gameState.players]);

  return null; 
}
