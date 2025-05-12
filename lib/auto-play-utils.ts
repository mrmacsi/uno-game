import type { GameState, Card, CardColor, BotPlayDecision } from "./types";
import { declareUno as declareUnoAction } from "@/lib/game-actions"; // Import the server action

/**
 * Executes an automated turn for a given player based on a pre-determined action.
 * This function handles the API calls for playing a card (including declaring UNO) or drawing a card.
 *
 * @param gameState The current state of the game.
 * @param playerId The ID of the player for whom the turn is being executed.
 * @param botPlayDecision The decision made by the bot for the player's turn.
 */
export async function executeAutomatedTurnAction(
  gameState: GameState,
  playerId: string,
  botPlayDecision: BotPlayDecision
): Promise<void> {
  // First verify it's still this player's turn
  if (gameState.currentPlayer !== playerId) {
    return;
  }

  if (gameState.status !== "playing") {
    return;
  }
  
  if (botPlayDecision.action === "play") {
    if (!botPlayDecision.card) {
      console.error("executeAutomatedTurnAction: Card missing from bot play decision");
      return;
    }

    // Bot has decided to play a card
    await executeAutomatedCardPlay(
      gameState,
      playerId,
      botPlayDecision.card,
      botPlayDecision.chosenColor,
      botPlayDecision.shouldDeclareUno
    );
  } else if (botPlayDecision.action === "draw") {
    // Bot has decided to draw a card
    
    // Check if player has already drawn this turn
    if (gameState.hasDrawnThisTurn) {
      await executeAutomatedPassTurn(gameState, playerId);
      return;
    }
    
    await executeAutomatedDraw(gameState, playerId);
  }
}

export async function executeAutomatedCardPlay(
  gameState: GameState,
  playerId: string,
  cardToPlay: Card,
  chosenColor?: CardColor,
  shouldDeclareUno?: boolean
): Promise<void> {
  // Double-check it's still this player's turn
  if (gameState.currentPlayer !== playerId) {
    return;
  }

  // Find the actual card from the player's hand that matches the chosen card
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    console.error(`executeAutomatedCardPlay: Player ${playerId} not found in game state`);
    return;
  }

  const actualCard = player.cards.find(c => 
    c.color === cardToPlay.color && 
    c.type === cardToPlay.type && 
    (c.type === 'number' ? c.value === cardToPlay.value : true)
  );

  if (!actualCard) {
    console.error(`executeAutomatedCardPlay: Could not find matching card in player's hand`, 
      {cardToPlay, playerCards: player.cards});
    return;
  }
  
  // If the bot should declare UNO first, do that before playing the card
  if (shouldDeclareUno && player.cards.length === 2) {
    try {
      // Call the server action directly
      await declareUnoAction(gameState.roomId, playerId);
    } catch (unoError) {
      console.error(`executeAutomatedCardPlay: Error declaring UNO:`, unoError);
      // Continue with play, as UNO is not essential
    }
  }

  // Now play the card
  try {
    // Final verification before API call
    if (gameState.currentPlayer !== playerId) {
      return;
    }
    
    const response = await fetch('/api/game/play-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: gameState.roomId,
        playerId: playerId,
        card: actualCard,
        chosenColor: chosenColor || actualCard.color,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`executeAutomatedTurnAction: Failed to play card: ${response.status} ${response.statusText}`, errorText);
    }
  } catch (error) {
    console.error(`executeAutomatedTurnAction: Error playing card:`, error);
  }
}

export async function executeAutomatedDraw(
  gameState: GameState,
  playerId: string
): Promise<void> {
  // Verify it's still this player's turn
  if (gameState.currentPlayer !== playerId) {
    return;
  }
  
  if (gameState.hasDrawnThisTurn) {
    await executeAutomatedPassTurn(gameState, playerId);
    return;
  }

  try {
    const response = await fetch('/api/game/draw-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: gameState.roomId,
        playerId: playerId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`executeAutomatedDraw: Failed to draw card: ${response.status} ${response.statusText}`, errorText);
    }
  } catch (error) {
    console.error(`executeAutomatedDraw: Error drawing card:`, error);
  }
}

export async function executeAutomatedPassTurn(
  gameState: GameState,
  playerId: string
): Promise<void> {
  // Verify it's still this player's turn
  if (gameState.currentPlayer !== playerId) {
    return;
  }

  try {
    const response = await fetch('/api/game/pass-turn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: gameState.roomId,
        playerId: playerId,
        forcePass: true, // Force the pass for bots
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`executeAutomatedPassTurn: Failed to pass turn: ${response.status} ${response.statusText}`, errorText);
    }
  } catch (error) {
    console.error(`executeAutomatedPassTurn: Error passing turn:`, error);
  }
}
