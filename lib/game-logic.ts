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
  let nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);

  switch (card.type) {
    case "skip":
      gameState.log.push(`${gameState.players[nextPlayerIndex].name} was skipped!`)
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); // Skip the next player
      break;
    case "reverse":
       gameState.direction *= -1;
       if (gameState.players.length === 2) {
         gameState.log.push(`Direction reversed! ${gameState.players[nextPlayerIndex].name} was skipped!`)
         nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); 
       } else {
          gameState.log.push(`Direction reversed!`)
          nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
       }
      break;
    case "draw2":
      reshuffleIfNeeded(gameState);
      const cardsToDraw2 = gameState.drawPile.splice(0, 2);
      gameState.players[nextPlayerIndex].cards.push(...cardsToDraw2);
      gameState.drawCardEffect = { playerId: gameState.players[nextPlayerIndex].id, count: 2 };
      gameState.log.push(`${gameState.players[nextPlayerIndex].name} draws 2 cards and is skipped!`)
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
      break;
    case "wild4":
      reshuffleIfNeeded(gameState);
      const cardsToDraw4 = gameState.drawPile.splice(0, 4);
      gameState.players[nextPlayerIndex].cards.push(...cardsToDraw4);
      gameState.drawCardEffect = { playerId: gameState.players[nextPlayerIndex].id, count: 4 };
      gameState.log.push(`${gameState.players[nextPlayerIndex].name} draws 4 cards and is skipped!`)
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
      break;
  }
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);
  gameState.drawPileCount = gameState.drawPile.length;
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
}

// Checks if a card play is valid based on game state
export function checkPlayValidity(gameState: GameState, card: Card): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  // If discard pile is empty (shouldn't happen mid-game, but safety check)
  if (!topCard) return true; 

  // Wild cards are always valid (color choice handled separately)
  if (card.type === "wild" || card.type === "wild4") return true;

  // Check if the card matches the current effective color OR the top card's actual color, type, or value
  return (
    card.color === gameState.currentColor || // Match the active color (especially after a wild)
    card.color === topCard.color ||        // Match the top card's color
    card.type === topCard.type ||          // Match the top card's type (regardless of color)
    (card.type === "number" && topCard.type === "number" && card.value === topCard.value) // Match number value
  );
}

// --- Scoring ---

// Calculates points at the end of a round
export function calculatePoints(gameState: GameState): void {
  if (gameState.status !== "finished" || !gameState.winner) return;

  let roundScore = 0;
  gameState.players.forEach(player => {
    if (player.id !== gameState.winner) {
      player.cards.forEach(card => {
        if (card.type === "number" && card.value !== undefined) {
          roundScore += card.value;
        } else if (card.type === "skip" || card.type === "reverse" || card.type === "draw2") {
          roundScore += 20;
        } else if (card.type === "wild" || card.type === "wild4") {
          roundScore += 50;
        }
      });
    }
  });

  // Ensure matchHistory exists
  if (!gameState.matchHistory) gameState.matchHistory = [];
  
  const matchResult: MatchResult = {
    winner: gameState.winner,
    date: new Date().toISOString(),
    playerResults: gameState.players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      points: player.id === gameState.winner ? roundScore : 0 
    })),
    finalScore: roundScore
  };
  gameState.matchHistory.push(matchResult);
  console.log(`Round finished. Winner: ${gameState.winner}. Score: ${roundScore}`);
} 