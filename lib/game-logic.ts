import type { GameState, Card, CardColor, CardType, MatchResult } from "./types"
import { v4 as uuidv4 } from "uuid"

// --- Deck Creation and Management ---

// Creates a standard UNO deck
function createDeck(): Card[] {
  const colors: CardColor[] = ["red", "blue", "green", "yellow"];
  // Define number values and action types separately
  const numberValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const actionTypes: CardType[] = ["skip", "reverse", "draw2"];
  const deck: Card[] = [];

  colors.forEach(color => {
    // Add number cards (one 0, two of 1-9)
    numberValues.forEach(value => {
      const count = value === 0 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        deck.push({ 
          id: uuidv4(), 
          color, 
          type: "number", // Use the "number" type
          value // Assign the numeric value
        });
      }
    });
    // Add action cards (two of each)
    actionTypes.forEach(type => {
      for (let i = 0; i < 2; i++) {
        deck.push({ 
          id: uuidv4(), 
          color, 
          type // Use the action type directly
        });
      }
    });
  });

  // Add wild cards (four of each)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: uuidv4(), color: "black", type: "wild" });
    deck.push({ id: uuidv4(), color: "black", type: "wild4" });
  }

  return deck;
}

// Shuffles an array using Fisher-Yates algorithm
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

// Deals cards to players
export function dealCards(numPlayers: number): { drawPile: Card[], hands: Card[][] } {
  if (numPlayers < 2 || numPlayers > 4) {
    throw new Error("Invalid number of players (must be 2-4)");
  }
  const deck = shuffle(createDeck());
  const hands: Card[][] = Array(numPlayers).fill(0).map(() => []);
  
  // Deal 7 cards to each player
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < numPlayers; j++) {
      const card = deck.pop();
      if (card) {
        hands[j].push(card);
      } else {
        throw new Error("Not enough cards in deck to deal initial hands");
      }
    }
  }
  return { drawPile: deck, hands };
}

// Reshuffles discard pile into draw pile if needed
export function reshuffleIfNeeded(gameState: GameState): boolean {
  if (gameState.drawPile.length === 0 && gameState.discardPile.length > 1) {
    const topCard = gameState.discardPile.pop()!;
    gameState.drawPile = shuffle(gameState.discardPile);
    gameState.discardPile = [topCard];
    gameState.drawPileCount = gameState.drawPile.length;
    console.log("Reshuffled discard pile into draw pile.")
    return true // Indicates reshuffle happened
  } 
  gameState.drawPileCount = gameState.drawPile.length;
  return false // No reshuffle needed
}

// --- Game Progression --- 

// Determines the index of the next player based on direction
export function getNextPlayerIndex(gameState: GameState, currentIndex: number): number {
  const numPlayers = gameState.players.length;
  // Ensure direction is either 1 or -1
  const validDirection = gameState.direction === -1 ? -1 : 1;
  const nextIndex = (currentIndex + validDirection + numPlayers) % numPlayers;
  return nextIndex;
}

// --- Card Effects and Validation ---

// Applies effects of a played card (draws, skips, reverse)
export function applyCardEffects(gameState: GameState, card: Card): void {
  const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer);
  const playerWhoPlayed = gameState.players[currentPlayerIndex];
  let nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);

  // Log the card play itself
  if (!gameState.log) { gameState.log = []; } // Initialize log if it doesn't exist
  let logMessage = `${playerWhoPlayed.name} played a ${card.color} ${card.type}`;
  if (card.type === "number" && card.value !== undefined) {
      logMessage += ` ${card.value}`;
  } else if (card.type === "wild" || card.type === "wild4") {
      logMessage += ` (chose ${gameState.currentColor})`; // Assuming gameState.currentColor is updated *before* calling this
  }
  gameState.log.push({
    id: uuidv4(),
    eventType: 'play',
    message: logMessage,
    timestamp: Date.now(),
    player: playerWhoPlayed.name,
    cardType: card.type,
    cardColor: card.color,
    cardValue: card.type === "number" ? card.value : undefined, // Add value if it's a number card
    avatarIndex: playerWhoPlayed.avatar_index
  });

  switch (card.type) {
    case "skip":
      gameState.log.push({
        id: uuidv4(),
        eventType: 'skip',
        message: `${gameState.players[nextPlayerIndex].name} was skipped!`,
        timestamp: Date.now(),
        player: gameState.players[nextPlayerIndex].name,
        cardType: card.type,
        cardColor: card.color,
        avatarIndex: gameState.players[nextPlayerIndex].avatar_index
      })
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); // Skip the next player
      break;
    case "reverse":
       gameState.direction *= -1;
       if (gameState.players.length === 2) {
         // In a 2-player game, reverse acts like skip
         gameState.log.push({
           id: uuidv4(),
           eventType: 'skip', // Treat as skip log for 2 players
           message: `Direction reversed! ${gameState.players[nextPlayerIndex].name} was skipped!`,
           timestamp: Date.now(),
           player: gameState.players[nextPlayerIndex].name,
           cardType: card.type,
           cardColor: card.color,
           avatarIndex: gameState.players[nextPlayerIndex].avatar_index
         })
         nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); 
       } else {
          gameState.log.push({
            id: uuidv4(),
            eventType: 'reverse',
            message: `Direction reversed!`,
            timestamp: Date.now(),
            player: playerWhoPlayed.name, // Player who played the reverse
            cardType: card.type,
            cardColor: card.color,
            avatarIndex: playerWhoPlayed.avatar_index
          })
          nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
       }
      break;
    case "draw2":
      reshuffleIfNeeded(gameState);
      const cardsToDraw2 = gameState.drawPile.splice(0, 2);
      gameState.players[nextPlayerIndex].cards.push(...cardsToDraw2);
      gameState.drawCardEffect = { playerId: gameState.players[nextPlayerIndex].id, count: 2 };
      // Log is handled by the assumed 'play' event log now
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
      break;
    case "wild4":
      reshuffleIfNeeded(gameState);
      const cardsToDraw4 = gameState.drawPile.splice(0, 4);
      gameState.players[nextPlayerIndex].cards.push(...cardsToDraw4);
      gameState.drawCardEffect = { playerId: gameState.players[nextPlayerIndex].id, count: 4 };
      // Log is handled by the assumed 'play' event log now
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
      break;
  }

  // Check if the player who just played is down to one card
  if (playerWhoPlayed.cards.length === 1) {
    if (playerWhoPlayed.saidUno) {
        console.log(`${playerWhoPlayed.name} successfully declared UNO!`);
        if (!gameState.log) { gameState.log = []; }
        gameState.log.push({
          id: uuidv4(),
          eventType: 'uno',
          message: `UNO! ${playerWhoPlayed.name} has one card left!`,
          timestamp: Date.now(),
          player: playerWhoPlayed.name,
          avatarIndex: playerWhoPlayed.avatar_index
        });
    } else {
        console.log(`${playerWhoPlayed.name} reached 1 card but forgot to declare UNO!`);
        if (!gameState.log) { gameState.log = []; }
        gameState.log.push({
          id: uuidv4(),
          eventType: 'uno_fail',
          message: `${playerWhoPlayed.name} forgot to declare UNO! (Has 1 card left)`,
          timestamp: Date.now(),
          player: playerWhoPlayed.name,
          avatarIndex: playerWhoPlayed.avatar_index
        });
    }
  }

  gameState.drawPileCount = gameState.drawPile.length;
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id;

  // Reset saidUno status for the player whose turn is *about to begin*
  const nextPlayer = gameState.players[nextPlayerIndex];
  if (nextPlayer && nextPlayer.cards.length !== 1) { // Only reset if they don't currently have 1 card
      nextPlayer.saidUno = false;
  }
}

// Checks if a card play is valid based on game state
export function checkPlayValidity(gameState: GameState, card: Card): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  // If discard pile is empty (shouldn't happen mid-game, but safety check)
  if (!topCard) return true; 

  // Wild cards are always valid (color choice handled separately)
  if (card.type === "wild" || card.type === "wild4") return true;

  // Check for valid play conditions:
  // 1. Card color matches the current color (set by previous card or a wild)
  if (card.color === gameState.currentColor) return true;
  
  // 2. Card color matches the actual color of the top card (if not a wild)
  if (card.color === topCard.color) return true;

  // 3. Card type is number and value matches top card's value (if it's a number card)
  if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) return true;
  
  // 4. Card type is action (skip, reverse, draw2) and type matches top card's type (if it's an action card)
  if (card.type !== "number" && card.type === topCard.type) return true; 

  // If none of the above conditions are met, the play is invalid
  return false;
}

// --- Scoring ---

// Calculates points at the end of a round
export function calculatePoints(gameState: GameState): void {
  if (gameState.status !== "finished" || !gameState.winner) return;

  // Ensure matchHistory exists
  if (!gameState.matchHistory) gameState.matchHistory = [];

  const matchResult: MatchResult = {
    winner: gameState.winner,
    date: new Date().toISOString(),
    playerResults: gameState.players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      avatar_index: player.avatar_index,
      points: player.id === gameState.winner ? 0 : calculateHandPoints(player.cards)
    })),
    finalScore: gameState.players
      .filter(player => player.id !== gameState.winner)
      .reduce((acc, player) => acc + calculateHandPoints(player.cards), 0)
  };
  gameState.matchHistory.push(matchResult);
  console.log(`Round finished. Winner: ${gameState.winner}. All losers' points summed: ${matchResult.finalScore}`);
}

// --- Scoring Utilities (Moved from GameOver component) ---

/**
 * Calculates the point value of a single hand of cards.
 * @param cards Array of cards in a player's hand.
 * @returns Total point value of the hand.
 */
export const calculateHandPoints = (cards: Card[]): number => {
  let points = 0;
  cards.forEach(card => {
    if (card.type === "number" && card.value !== undefined) {
      points += card.value;
    } else if (card.type === "skip" || card.type === "reverse" || card.type === "draw2") {
      points += 20;
    } else if (card.type === "wild" || card.type === "wild4") { // Treat Wild Swap Hands (if any) same as Wild
      points += 50;
    }
  });
  return points;
}; 