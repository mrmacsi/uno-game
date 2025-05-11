"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/components/providers/game-context";
import { getBotPlay } from "@/lib/game-logic";
import type { GameState } from "@/lib/types";
import { executeAutomatedTurnAction } from "@/lib/auto-play-utils";

const BOT_TURN_DELAY_MS = 500;

export default function BotTurnHandler() {
  const { state: gameState } = useGame();
  const isBotTurnInProgress = useRef(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  const lastPlayerIdRef = useRef("");

  useEffect(() => {
    const currentPlayerInContext = gameState.players.find(player => player.id === gameState.currentPlayer);

    // Safety check - ensure we don't process turns too rapidly
    const now = Date.now();
    if (now - lastActionTime < 300) {
      return;
    }

    // If the current player hasn't changed but we recently took action for this player, skip
    if (lastPlayerIdRef.current === gameState.currentPlayer && now - lastActionTime < 1000) {
      return;
    }

    const handleBotTurn = async () => {
      // Update tracking references
      lastPlayerIdRef.current = gameState.currentPlayer;
      setLastActionTime(Date.now());

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
        
        // Create a minimal game state to avoid payload size issues
        const minimalGameState: Partial<GameState> = {
          roomId: gameState.roomId,
          players: gameState.players.map(p => ({
            id: p.id,
            name: p.name,
            cards: p.cards,
            avatarIndex: p.avatarIndex,
            isBot: p.isBot || false,
            saidUno: p.saidUno || false,
            isHost: p.isHost || false
          })),
          currentPlayer: gameState.currentPlayer,
          direction: gameState.direction,
          drawPile: [],  // We don't need the full draw pile for the bot decision
          drawPileCount: gameState.drawPileCount,
          discardPile: gameState.discardPile.slice(-1), // Only need the top card
          currentColor: gameState.currentColor,
          status: gameState.status,
          hasDrawnThisTurn: gameState.hasDrawnThisTurn,
          winner: gameState.winner,
          log: []  // We don't need the logs for the bot decision
        };
        
        console.log("BotTurnHandler: Processing bot turn with minimal state");
        
        // Check if bot has already drawn and needs to pass
        if (gameState.hasDrawnThisTurn) {
          console.log(`BotTurnHandler: Bot ${botPlayer.name} has already drawn this turn, checking if pass is needed`);
          
          // First determine if the drawn card can be played
          const botPlayResult = getBotPlay(minimalGameState as GameState, gameState.currentPlayer);
          
          if (botPlayResult.action === 'draw') {
            // If the bot logic suggests drawing again, it means we should pass instead
            console.log(`BotTurnHandler: Bot ${botPlayer.name} needs to pass after drawing`);
            try {
              const response = await fetch('/api/game/pass-turn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomId: gameState.roomId,
                  playerId: gameState.currentPlayer,
                  forcePass: true
                }),
              });
              
              if (response.ok) {
                console.log(`BotTurnHandler: Successfully passed turn for bot ${botPlayer.name}`);
                return; // Exit early, we've handled the turn by passing
              } else {
                const errorText = await response.text();
                console.error(`BotTurnHandler: Failed to pass turn, status: ${response.status}`, errorText);
              }
            } catch (passError) {
              console.error("BotTurnHandler: Error passing turn:", passError);
            }
          } else {
            // The bot can play the drawn card
            await executeAutomatedTurnAction(minimalGameState as GameState, gameState.currentPlayer, botPlayResult);
          }
        } else {
          // Normal play - get the bot's intended play and execute it
          const botPlayResult = getBotPlay(minimalGameState as GameState, gameState.currentPlayer);
          await executeAutomatedTurnAction(minimalGameState as GameState, gameState.currentPlayer, botPlayResult);
        }
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
  }, [gameState.currentPlayer, gameState.status, gameState.roomId, gameState.players, gameState.hasDrawnThisTurn, lastActionTime]);

  return null; 
}
