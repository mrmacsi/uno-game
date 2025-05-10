"use client";

import { useEffect, useRef } from "react";
import { useGame } from "@/components/providers/game-context";
import { getBotPlay } from "@/lib/game-logic";
import type { GameState } from "@/lib/types";
import { executeAutomatedTurnAction } from "@/lib/auto-play-utils"; // Import the new utility

const BOT_TURN_DELAY_MS = 500;

export default function BotTurnHandler() {
  const { state: gameState } = useGame();
  const isBotTurnInProgress = useRef(false);

  useEffect(() => {
    const currentPlayerInContext = gameState.players.find(player => player.id === gameState.currentPlayer);

    const handleBotTurn = async () => {
      if (isBotTurnInProgress.current) {
        console.log("BotTurnHandler: Bot turn already in progress. Skipping this execution.");
        return;
      }

      if (!gameState.currentPlayer) {
        console.error("BotTurnHandler: No current player ID in game state for bot turn.");
        return;
      }
      
      // Verify the current player is still the same when the timeout executes
      if (gameState.currentPlayer !== currentPlayerInContext?.id) {
        console.log(`BotTurnHandler: Current player changed from ${currentPlayerInContext?.id} to ${gameState.currentPlayer}. Aborting bot action.`);
        return;
      }
      
      const botPlayer = gameState.players.find(p => p.id === gameState.currentPlayer);
      if (!botPlayer) {
        console.error(`BotTurnHandler: Bot player with ID ${gameState.currentPlayer} not found in game state.`);
        return;
      }

      if (!botPlayer.isBot) {
        console.log(`BotTurnHandler: Current player ${gameState.currentPlayer} (${botPlayer.name}) is not a bot. Aborting bot action.`);
        return;
      }

      try {
        isBotTurnInProgress.current = true;
        console.log("BotTurnHandler: GameState at bot turn execution:", JSON.parse(JSON.stringify(gameState)));
        console.log("BotTurnHandler: Bot player object:", JSON.parse(JSON.stringify(botPlayer)));
        
        // Get the bot's intended play
        const botPlayResult = getBotPlay(gameState as GameState, gameState.currentPlayer);
        console.log("BotTurnHandler: botPlayResult from getBotPlay:", JSON.parse(JSON.stringify(botPlayResult)));

        // Execute the determined action using the new utility function
        await executeAutomatedTurnAction(gameState, gameState.currentPlayer, botPlayResult);
      } finally {
        isBotTurnInProgress.current = false;
      }
    };

    let turnTimeoutId: NodeJS.Timeout | undefined;

    if (currentPlayerInContext?.isBot && gameState.status === "playing") {
      if (gameState.currentPlayer !== currentPlayerInContext.id) {
        console.log(`BotTurnHandler: Stale timeout. Current player ${gameState.currentPlayer}, scheduled for ${currentPlayerInContext.id}. Clearing old timeout.`);
        if (turnTimeoutId) clearTimeout(turnTimeoutId); 
        return;
      }

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
