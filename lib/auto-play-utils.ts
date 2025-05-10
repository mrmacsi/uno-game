import type { GameState, Card, CardColor } from "@/lib/types";
import { getBotPlay } from "@/lib/game-logic"; // Used for type, and potentially directly if a wrapper is made

interface PlayCardRequestBody {
  roomId: string;
  playerId: string;
  card: Card;
  chosenColor?: CardColor;
}

/**
 * Executes an automated turn for a given player based on a pre-determined action.
 * This function handles the API calls for playing a card (including declaring UNO) or drawing a card.
 *
 * @param gameState The current state of the game.
 * @param playerId The ID of the player for whom the turn is being executed.
 * @param determinedAction The action determined by bot logic (e.g., from getBotPlay).
 */
export async function executeAutomatedTurnAction(
  gameState: GameState,
  playerId: string,
  determinedAction: ReturnType<typeof getBotPlay>
) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    console.error(`executeAutomatedTurnAction: Player with ID ${playerId} not found in game state.`);
    return;
  }

  console.log(`executeAutomatedTurnAction: Executing for player ${player.name} (ID: ${playerId})`);
  console.log(`executeAutomatedTurnAction: Action determined:`, JSON.parse(JSON.stringify(determinedAction)));

  try {
    if (determinedAction.action === 'play') {
      const cardToPlay = determinedAction.card;

      if (!cardToPlay || typeof cardToPlay.id !== 'string') {
        console.error("executeAutomatedTurnAction: Invalid card object or missing/invalid card ID from determinedAction.", JSON.parse(JSON.stringify(cardToPlay)));
        return;
      }

      // Verify the card is actually in the player's hand. This is crucial.
      const actualCardInHand = player.cards?.find(c => c.id === cardToPlay.id);
      if (!actualCardInHand) {
        console.error(
          `executeAutomatedTurnAction: Card with ID ${cardToPlay.id} (suggested by logic) not found in player's current hand. Player ID: ${playerId}. Aborting play action.`,
          "Player's current hand:", JSON.parse(JSON.stringify(player.cards)),
          "Card suggested by logic:", JSON.parse(JSON.stringify(cardToPlay))
        );
        // Optionally, you might want to force a draw action here if the bot logic was flawed for a human player.
        // For now, we'll just abort the play action.
        // Consider notifying the user or attempting a draw as a fallback.
        // await executeAutomatedDraw(gameState, playerId); // Example fallback
        return;
      }

      console.log("executeAutomatedTurnAction: Actual card from hand to play (verified):", JSON.parse(JSON.stringify(actualCardInHand)));

      // Declare UNO if needed
      if (determinedAction.shouldDeclareUno) {
        console.log(`executeAutomatedTurnAction: ${player.name} is declaring UNO.`);
        try {
          const unoResponse = await fetch('/api/game/ring', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              roomId: gameState.roomId, 
              playerId: playerId 
            }),
          });
          if (!unoResponse.ok) {
            const errorData = await unoResponse.text();
            console.error('executeAutomatedTurnAction: Failed to declare UNO:', unoResponse.status, unoResponse.statusText, errorData);
            // Even if UNO declaration fails, the bot/player might still try to play the card.
          } else {
            console.log("executeAutomatedTurnAction: Successfully declared UNO.");
          }
        } catch (unoError) {
          console.error('executeAutomatedTurnAction: Exception when declaring UNO:', unoError);
          // Continue with card play even if UNO declaration fails
        }
      }

      const body: PlayCardRequestBody = {
        roomId: gameState.roomId,
        playerId: playerId,
        card: {
          id: actualCardInHand.id,
          type: actualCardInHand.type,
          color: actualCardInHand.color,
          value: actualCardInHand.value
        }
      };
      
      if (determinedAction.chosenColor) {
        body.chosenColor = determinedAction.chosenColor;
      }

      console.log("executeAutomatedTurnAction: Playing card:", actualCardInHand.type, actualCardInHand.color);
      try {
        const playResponse = await fetch('/api/game/play-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!playResponse.ok) {
          const errorData = await playResponse.text();
          console.error('executeAutomatedTurnAction: Failed to play card:', playResponse.status, playResponse.statusText, errorData);
        } else {
          console.log("executeAutomatedTurnAction: Successfully played card.");
        }
      } catch (playError) {
        console.error('executeAutomatedTurnAction: Exception when playing card:', playError);
      }
    } else if (determinedAction.action === 'draw') {
      console.log(`executeAutomatedTurnAction: Player ${playerId} is drawing a card as per determined action.`);
      await executeAutomatedDraw(gameState, playerId);
    }
  } catch (error) {
    console.error('executeAutomatedTurnAction: Error during turn execution:', error);
  }
}

/**
 * Handles the API call for a player to draw a card.
 */
export async function executeAutomatedDraw(gameState: GameState, playerId: string) {
  // Check if the player has already drawn a card this turn
  if (gameState.hasDrawnThisTurn) {
    console.log(`executeAutomatedDraw: Player ${playerId} has already drawn a card this turn. Skipping draw action.`);
    return;
  }

  console.log(`executeAutomatedDraw: Player ${playerId} is drawing a card.`);
  try {
    const response = await fetch('/api/game/draw-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomId: gameState.roomId, 
        playerId: playerId 
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('executeAutomatedDraw: Failed to draw card:', response.status, response.statusText, errorData);
    } else {
      console.log("executeAutomatedDraw: Successfully drew card.");
    }
  } catch (drawError) {
    console.error('executeAutomatedDraw: Exception when drawing card:', drawError);
  }
}
