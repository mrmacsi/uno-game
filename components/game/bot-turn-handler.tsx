"use client"

import { useEffect } from "react";
import { useGame } from "@/components/providers/game-context";
import { getBotPlay } from "@/lib/game-logic";
import type { GameState, Card, CardColor } from "@/lib/types";

const BOT_TURN_DELAY_MS = 500;

interface PlayCardRequestBody {
  roomId: string;
  playerId: string;
  card: Card;
  chosenColor?: CardColor;
}

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

      if (!botPlayer.isBot) {
        console.log(`BotTurnHandler: Current player ${gameState.currentPlayer} (${botPlayer.name}) is not a bot. Aborting bot action.`);
        return;
      }

      console.log("BotTurnHandler: GameState at bot turn execution:", JSON.parse(JSON.stringify(gameState)));
      console.log("BotTurnHandler: Bot player object:", JSON.parse(JSON.stringify(botPlayer)));
      console.log("BotTurnHandler: Bot hand before getBotPlay:", JSON.parse(JSON.stringify(botPlayer.cards)));

      const botPlayResult = getBotPlay(gameState as GameState, gameState.currentPlayer);
      console.log("BotTurnHandler: botPlayResult from getBotPlay:", JSON.parse(JSON.stringify(botPlayResult)));

      try {
        if (botPlayResult.action === 'play') {
          const cardFromBotLogic = botPlayResult.card;
          
          if (!cardFromBotLogic || typeof cardFromBotLogic.id !== 'string') {
            console.error("BotTurnHandler: Invalid card object or missing/invalid card ID from getBotPlay result.", JSON.parse(JSON.stringify(cardFromBotLogic)));
            return; 
          }

          console.log("BotTurnHandler: Card suggested by getBotPlay logic:", JSON.parse(JSON.stringify(cardFromBotLogic)));

          if (!botPlayer.cards || !Array.isArray(botPlayer.cards)) {
             console.error("BotTurnHandler: botPlayer.cards is missing or not an array.", JSON.parse(JSON.stringify(botPlayer)));
             return;
          }

          const actualCardInHand = botPlayer.cards.find(c => c.id === cardFromBotLogic.id);

          if (!actualCardInHand) {
            console.error(
              `BotTurnHandler: Card with ID ${cardFromBotLogic.id} (suggested by bot logic) not found in bot's current hand. Bot logic might be flawed or using stale data.Aborting play action.`, 
              "Bot's current hand:", JSON.parse(JSON.stringify(botPlayer.cards)),
              "Card suggested by logic:", JSON.parse(JSON.stringify(cardFromBotLogic))
            );
            return;
          }
          
          console.log("BotTurnHandler: Actual card from hand to play (verified):", JSON.parse(JSON.stringify(actualCardInHand)));

          // Declare UNO if needed
          if (botPlayResult.shouldDeclareUno) {
            console.log(`BotTurnHandler: ${botPlayer.name} is declaring UNO.`);
            const unoResponse = await fetch('/api/game/ring', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ roomId: gameState.roomId, playerId: gameState.currentPlayer }),
            });
            if (!unoResponse.ok) {
              const errorData = await unoResponse.text();
              console.error('Bot Action: Failed to declare UNO:', unoResponse.status, unoResponse.statusText, errorData);
              // Optionally, decide if the bot should still attempt to play the card or abort the turn.
              // For now, we'll let it try to play the card anyway.
            } else {
              console.log("Bot Action: Successfully declared UNO.");
            }
          }

          const body: PlayCardRequestBody = {
            roomId: gameState.roomId,
            playerId: gameState.currentPlayer,
            card: actualCardInHand, 
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
  }, [gameState.currentPlayer, gameState.status, gameState.roomId, gameState.players]);

  return null; 
}
