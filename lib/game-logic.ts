import type { GameState, Card, CardColor, CardType, MatchResult } from "./types";
import { v4 as uuidv4 } from "uuid";

function createDeck(): Card[] {
  const colors: CardColor[] = ["red", "blue", "green", "yellow"];
  const numberValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const actionTypes: CardType[] = ["skip", "reverse", "draw2"];
  const deck: Card[] = [];

  colors.forEach(color => {
    numberValues.forEach(value => {
      const count = value === 0 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        deck.push({ 
          id: uuidv4(), 
          color, 
          type: "number",
          value
        });
      }
    });
    actionTypes.forEach(type => {
      for (let i = 0; i < 2; i++) {
        deck.push({ 
          id: uuidv4(), 
          color, 
          type
        });
      }
    });
  });

  for (let i = 0; i < 4; i++) {
    deck.push({ id: uuidv4(), color: "black", type: "wild" });
    deck.push({ id: uuidv4(), color: "black", type: "wild4" });
  }

  return deck;
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function dealCards(numPlayers: number): { drawPile: Card[], hands: Card[][] } {
  if (numPlayers < 2 || numPlayers > 4) {
    throw new Error("Invalid number of players (must be 2-4)");
  }
  const deck = shuffle(createDeck());
  const hands: Card[][] = Array(numPlayers).fill(0).map(() => []);
  
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

export function reshuffleIfNeeded(gameState: GameState): boolean {
  if (gameState.drawPile.length === 0 && gameState.discardPile.length > 1) {
    const topCard = gameState.discardPile.pop()!;
    gameState.drawPile = shuffle(gameState.discardPile);
    gameState.discardPile = [topCard];
    gameState.drawPileCount = gameState.drawPile.length;
    console.log("Reshuffled discard pile into draw pile.")
    return true 
  } 
  gameState.drawPileCount = gameState.drawPile.length;
  return false 
}

export function getNextPlayerIndex(gameState: GameState, currentIndex: number): number {
  const numPlayers = gameState.players.length;
  const validDirection = gameState.direction === -1 ? -1 : 1;
  const nextIndex = (currentIndex + validDirection + numPlayers) % numPlayers;
  return nextIndex;
}
export function applyCardEffects(gameState: GameState, card: Card): void {
  const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer);
  const playerWhoPlayed = gameState.players[currentPlayerIndex];
  let nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);

  if (!gameState.log) { gameState.log = []; } 
  let logMessage = `${playerWhoPlayed.name} played a ${card.color} ${card.type}`;
  if (card.type === "number" && card.value !== undefined) {
      logMessage += ` ${card.value}`;
  } else if (card.type === "wild" || card.type === "wild4") {
      logMessage += ` (chose ${gameState.currentColor})`; 
  }
  gameState.log.push({
    id: uuidv4(),
    eventType: 'play',
    message: logMessage,
    timestamp: Date.now(),
    player: playerWhoPlayed.name,
    cardType: card.type,
    cardColor: card.color,
    cardValue: card.type === "number" ? card.value : undefined,
    avatarIndex: playerWhoPlayed.avatarIndex
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
        avatarIndex: gameState.players[nextPlayerIndex].avatarIndex
      })
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); 
      break;
    case "reverse":
       gameState.direction *= -1;
       if (gameState.players.length === 2) {
         gameState.log.push({
           id: uuidv4(),
           eventType: 'skip', 
           message: `Direction reversed! ${gameState.players[nextPlayerIndex].name} was skipped!`,
           timestamp: Date.now(),
           player: gameState.players[nextPlayerIndex].name,
           cardType: card.type,
           cardColor: card.color,
           avatarIndex: gameState.players[nextPlayerIndex].avatarIndex
         })
         nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); 
       } else {
          gameState.log.push({
            id: uuidv4(),
            eventType: 'reverse',
            message: `Direction reversed!`,
            timestamp: Date.now(),
            player: playerWhoPlayed.name, 
            cardType: card.type,
            cardColor: card.color,
            avatarIndex: playerWhoPlayed.avatarIndex
          })
          nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
       }
      break;
    case "draw2":
      reshuffleIfNeeded(gameState);
      const cardsToDraw2 = gameState.drawPile.splice(0, 2);
      gameState.players[nextPlayerIndex].cards.push(...cardsToDraw2);
      gameState.drawCardEffect = { playerId: gameState.players[nextPlayerIndex].id, count: 2 };
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
      break;
    case "wild4":
      reshuffleIfNeeded(gameState);
      const cardsToDraw4 = gameState.drawPile.splice(0, 4);
      gameState.players[nextPlayerIndex].cards.push(...cardsToDraw4);
      gameState.drawCardEffect = { playerId: gameState.players[nextPlayerIndex].id, count: 4 };
      nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
      break;
  }

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
          avatarIndex: playerWhoPlayed.avatarIndex
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
          avatarIndex: playerWhoPlayed.avatarIndex
        });
    }
  }

  gameState.drawPileCount = gameState.drawPile.length;
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id;

  const nextPlayer = gameState.players[nextPlayerIndex];
  if (nextPlayer && nextPlayer.cards.length !== 1) { 
      nextPlayer.saidUno = false;
  }
}

export function checkPlayValidity(gameState: GameState, card: Card): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  if (!topCard) return true; 

  if (card.type === "wild" || card.type === "wild4") return true;

  if (card.color === gameState.currentColor) return true;
  
  if (card.color === topCard.color) return true;

  if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) return true;
  
  if (card.type !== "number" && card.type === topCard.type) return true; 

  return false;
}

export function getCardPointValue(card: Card): number {
  if (card.type === "number" && card.value !== undefined) {
    return card.value;
  } else if (card.type === "skip" || card.type === "reverse" || card.type === "draw2") {
    return 20;
  } else if (card.type === "wild" || card.type === "wild4") {
    return 50;
  }
  return 0; 
}

export const calculateHandPoints = (cards: Card[]): number => {
  let points = 0;
  cards.forEach(card => {
    points += getCardPointValue(card);
  });
  return points;
};

export function calculatePoints(gameState: GameState): void {
  if (gameState.status !== "finished" || !gameState.winner) return;

  if (!gameState.matchHistory) gameState.matchHistory = [];

  const matchResult: MatchResult = {
    winner: gameState.winner,
    date: new Date().toISOString(),
    playerResults: gameState.players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      avatar_index: player.avatarIndex,
      points: player.id === gameState.winner ? 0 : calculateHandPoints(player.cards)
    })),
    finalScore: gameState.players
      .filter(player => player.id !== gameState.winner)
      .reduce((acc, player) => acc + calculateHandPoints(player.cards), 0)
  };
  gameState.matchHistory.push(matchResult);
  console.log(`Round finished. Winner: ${gameState.winner}. All losers' points summed: ${matchResult.finalScore}`);
}

type BotPlayDecision = 
  | { action: 'play', card: Card, chosenColor?: CardColor, shouldDeclareUno?: boolean } 
  | { action: 'draw' };

export function getBotPlay(gameState: GameState, playerId: string): BotPlayDecision {
  const botPlayer = gameState.players.find(p => p.id === playerId);
  if (!botPlayer || botPlayer.cards.length === 0) return { action: 'draw' };

  const currentColor = gameState.currentColor;
  const playableCards: Card[] = botPlayer.cards.filter(card => checkPlayValidity(gameState, card));

  if (playableCards.length === 0) return { action: 'draw' };

  const nonWildPlayableCards = playableCards.filter(card => card.type !== "wild" && card.type !== "wild4");
  const wildCards = playableCards.filter(card => card.type === "wild" || card.type === "wild4");
  const currentColorCards = nonWildPlayableCards.filter(card => card.color === currentColor);

  const hasPlayableNonWildCards = nonWildPlayableCards.length > 0;
  const hasCurrentColorCards = currentColorCards.length > 0;

  // Only use wild cards if necessary (no other playable cards) or strategic
  if (hasCurrentColorCards) {
    // We have cards matching the current color, prioritize those over wild cards
    currentColorCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
    const bestCardToPlay = currentColorCards[0];
    const shouldDeclareUno = botPlayer.cards.length === 2;
    
    return { 
      action: 'play', 
      card: bestCardToPlay,
      shouldDeclareUno
    };
  } else if (hasPlayableNonWildCards) {
    // We have non-wild playable cards (but not current color)
    nonWildPlayableCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
    const bestCardToPlay = nonWildPlayableCards[0];
    const shouldDeclareUno = botPlayer.cards.length === 2;
    
    return { 
      action: 'play', 
      card: bestCardToPlay,
      shouldDeclareUno
    };
  } else if (wildCards.length > 0) {
    // Use wild cards only when necessary
    // Sort to prefer normal wild over wild+4 when possible
    wildCards.sort((a, b) => {
      // If both are the same type, doesn't matter
      if ((a.type === "wild" && b.type === "wild") || 
          (a.type === "wild4" && b.type === "wild4")) return 0;
      
      // Prefer regular wild over wild+4 when not urgent
      return a.type === "wild" ? -1 : 1;
    });
    
    const bestWildCard = wildCards[0];
    const shouldDeclareUno = botPlayer.cards.length === 2;
    
    // For wild cards, choose the color strategically
    const colorCounts: { [key in CardColor]?: number } = {};
    const validColors: CardColor[] = ["red", "blue", "green", "yellow"];

    // Count cards by color (excluding the wild card being played)
    botPlayer.cards.forEach(cardInHand => {
      if (cardInHand.id === bestWildCard.id) return; 
      if (cardInHand.color !== "black" && validColors.includes(cardInHand.color)) {
        colorCounts[cardInHand.color] = (colorCounts[cardInHand.color] || 0) + 1;
      }
    });

    let chosenColor: CardColor = "red"; // Default
    let maxCount = 0;

    // Choose color with the most cards in hand
    if (Object.keys(colorCounts).length > 0) {
      for (const color of validColors) {
        const count = colorCounts[color] || 0;
        if (count > maxCount) {
          maxCount = count;
          chosenColor = color;
        }
      }
    } else {
      // If no other colored cards, pick a random color
      chosenColor = validColors[Math.floor(Math.random() * validColors.length)];
    }
    
    return { 
      action: 'play', 
      card: bestWildCard, 
      chosenColor, 
      shouldDeclareUno
    };
  }

  // Fallback - shouldn't reach here since we checked if playableCards is empty
  playableCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
  const bestCardToPlay = playableCards[0];
  const shouldDeclareUno = botPlayer.cards.length === 2;
  
  let decision: BotPlayDecision;

  if (bestCardToPlay.type === "wild" || bestCardToPlay.type === "wild4") {
    const colorCounts: { [key in CardColor]?: number } = {};
    const validColors: CardColor[] = ["red", "blue", "green", "yellow"];

    botPlayer.cards.forEach(cardInHand => {
      if (cardInHand.id === bestCardToPlay.id) return; 
      if (cardInHand.color !== "black" && validColors.includes(cardInHand.color)) {
        colorCounts[cardInHand.color] = (colorCounts[cardInHand.color] || 0) + 1;
      }
    });

    let chosenColor: CardColor = "red"; 
    let maxCount = 0;

    if (Object.keys(colorCounts).length > 0) {
      for (const color of validColors) {
        const count = colorCounts[color] || 0;
        if (count > maxCount) {
          maxCount = count;
          chosenColor = color;
        }
      }
    } else {
      chosenColor = validColors[Math.floor(Math.random() * validColors.length)];
    }
    
    decision = { action: 'play', card: bestCardToPlay, chosenColor };
  } else {
    decision = { action: 'play', card: bestCardToPlay };
  }

  if (decision.action === 'play' && shouldDeclareUno) {
    decision.shouldDeclareUno = true;
  }

  return decision;
}
