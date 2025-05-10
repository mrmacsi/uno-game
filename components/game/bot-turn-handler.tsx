"use client";

import { useEffect } from "react";
import { useGame } from "@/components/providers/game-context";
import { getBotPlay } from "@/lib/game-logic";
import type { GameState } from "@/lib/types";
import { executeAutomatedTurnAction } from "@/lib/auto-play-utils"; // Import the new utility

const BOT_TURN_DELAY_MS = 500;

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
      
      // Get the bot's intended play
      const botPlayResult = getBotPlay(gameState as GameState, gameState.currentPlayer);
      console.log("BotTurnHandler: botPlayResult from getBotPlay:", JSON.parse(JSON.stringify(botPlayResult)));

      // Execute the determined action using the new utility function
      await executeAutomatedTurnAction(gameState, gameState.currentPlayer, botPlayResult);
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
  }, [gameState.currentPlayer, gameState.status, gameState.roomId, gameState.players]); // Ensured all relevant dependencies from gameState are present

  return null; 
}
