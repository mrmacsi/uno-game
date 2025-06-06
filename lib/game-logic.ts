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

  const _chooseBestColorForBot = (cardsInHand: Card[], cardToExcludeId: string): CardColor => {
    const relevantCards = cardsInHand.filter(c => c.id !== cardToExcludeId);
    const colorPoints: { [key in CardColor]?: number } = {};
    const validColors: CardColor[] = ["red", "blue", "green", "yellow"];

    relevantCards.forEach(cardInHand => {
      if (cardInHand.color !== "black" && validColors.includes(cardInHand.color)) {
        colorPoints[cardInHand.color] = (colorPoints[cardInHand.color] || 0) + getCardPointValue(cardInHand);
      }
    });

    let chosenColor: CardColor = validColors[Math.floor(Math.random() * validColors.length)]; // Default random choice

    const sortedColorEntriesByPoints = Object.entries(colorPoints)
      .filter(([, points]) => points !== undefined && points > 0) // Consider only colors with points
      .sort(([, pointsA], [, pointsB]) => (pointsB as number) - (pointsA as number));

    if (sortedColorEntriesByPoints.length > 0) {
      const maxPoints = sortedColorEntriesByPoints[0][1] as number;
      const topColors = sortedColorEntriesByPoints
        .filter(([, points]) => points === maxPoints)
        .map(([color]) => color as CardColor);
      
      // If we have multiple colors with the same (max) points, prioritize current game color
      if (topColors.includes(gameState.currentColor)) {
        chosenColor = gameState.currentColor;
      } else {
        // Otherwise, pick the first one (highest points) from the sorted array
        chosenColor = topColors[0];
      }
    }
    
    return chosenColor;
  };
  
  if (gameState.hasDrawnThisTurn) {
    const lastCard = botPlayer.cards[botPlayer.cards.length - 1];
    const isLastCardPlayable = checkPlayValidity(gameState, lastCard);
    
    if (isLastCardPlayable) {
      const shouldDeclareUno = botPlayer.cards.length === 2;
      if (lastCard.type === "wild" || lastCard.type === "wild4") {
        const chosenColor = _chooseBestColorForBot(botPlayer.cards, lastCard.id);
        return { action: 'play', card: lastCard, chosenColor, shouldDeclareUno };
      }
      return { action: 'play', card: lastCard, shouldDeclareUno };
    }
    return { action: 'draw' }; 
  }

  const allPlayableCards: Card[] = botPlayer.cards.filter(card => checkPlayValidity(gameState, card));
  
  if (allPlayableCards.length === 0) {
    return { action: 'draw' };
  }

  // Rule: Offensive Wild Draw 4 when next player has less than 3 cards
  const offensiveWildDraw4 = botPlayer.cards.find(card => card.type === "wild4" && checkPlayValidity(gameState, card));
  if (offensiveWildDraw4) {
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (currentPlayerIndex !== -1) {
        const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
        const nextPlayer = gameState.players[nextPlayerIndex];

        if (nextPlayer && nextPlayer.cards.length < 3) {
            const chosenColor = _chooseBestColorForBot(botPlayer.cards, offensiveWildDraw4.id);
            const shouldDeclareUnoForThisPlay = botPlayer.cards.length === 2;
            return { action: 'play', card: offensiveWildDraw4, chosenColor, shouldDeclareUno: shouldDeclareUnoForThisPlay };
        }
    } else {
        console.error(`[getBotPlay] Offensive W+4: Bot player ${playerId} not found.`);
    }
  }

  const shouldDeclareUno = botPlayer.cards.length === 2;

  // New strategic check: Prioritize Wild Draw 4 if bot has 2 cards left
  if (botPlayer.cards.length === 2) {
    const wildDraw4 = botPlayer.cards.find(card => card.type === "wild4" && checkPlayValidity(gameState, card));
    if (wildDraw4) {
      const chosenColor = _chooseBestColorForBot(botPlayer.cards, wildDraw4.id);
      return { action: 'play', card: wildDraw4, chosenColor, shouldDeclareUno: true };
    }
  }

  // ---- Enhanced strategy for optimizing card removal ----
  // Group playable cards by type (action cards vs number cards)
  const actionTypes: CardType[] = ["skip", "reverse", "draw2"];
  const nonWildPlayableCards = allPlayableCards.filter(card => card.type !== "wild" && card.type !== "wild4");
  const regularWildPlayable = allPlayableCards.filter(card => card.type === "wild");
  const wild4Playable = allPlayableCards.filter(card => card.type === "wild4");
  
  // Group cards by their types and colors
  const cardsByTypeAndColor: {[key: string]: Card[]} = {};
  
  nonWildPlayableCards.forEach(card => {
    const key = `${card.type}_${card.color}`;
    if (!cardsByTypeAndColor[key]) {
      cardsByTypeAndColor[key] = [];
    }
    cardsByTypeAndColor[key].push(card);
  });
  
  // Check if we have same type cards with different colors
  // These are good candidates for a sequence (like red skip, blue skip, yellow skip)
  const typeGroups: {[key in CardType]?: Card[]} = {};
  nonWildPlayableCards.forEach(card => {
    if (!typeGroups[card.type]) {
      typeGroups[card.type] = [];
    }
    typeGroups[card.type]!.push(card);
  });
  
  // Find types with multiple color cards (good for sequences)
  const typesWithMultipleColors = Object.entries(typeGroups)
    .filter(([, cards]) => {
      const uniqueColors = new Set(cards.map(c => c.color));
      return uniqueColors.size > 1;
    })
    .sort((a, b) => b[1].length - a[1].length); // Sort by number of cards

  // If we have action cards (skip, reverse, draw2) of different colors, prioritize them for sequence play
  if (typesWithMultipleColors.length > 0 && actionTypes.includes(typesWithMultipleColors[0][0] as CardType)) {
    const [, cards] = typesWithMultipleColors[0];
    
    // First look for a card matching the current color - best for starting a sequence
    const matchingCurrentColor = cards.find(c => c.color === gameState.currentColor);
    if (matchingCurrentColor) {
      return { action: 'play', card: matchingCurrentColor, shouldDeclareUno };
    }
    
    // Otherwise play any card of this type
    return { action: 'play', card: cards[0], shouldDeclareUno };
  }
  
  // Check if we have number cards with the same value but different colors
  const numberValues: {[key: number]: Card[]} = {};
  nonWildPlayableCards.forEach(card => {
    if (card.type === "number" && card.value !== undefined) {
      if (!numberValues[card.value]) {
        numberValues[card.value] = [];
      }
      numberValues[card.value].push(card);
    }
  });
  
  const numbersWithMultipleColors = Object.entries(numberValues)
    .filter(([, cards]) => {
      const uniqueColors = new Set(cards.map(c => c.color));
      return uniqueColors.size > 1;
    })
    .sort((a, b) => b[1].length - a[1].length); // Sort by number of cards
  
  if (numbersWithMultipleColors.length > 0) {
    const [, cards] = numbersWithMultipleColors[0];
    
    // First look for a card matching the current color
    const matchingCurrentColor = cards.find(c => c.color === gameState.currentColor);
    if (matchingCurrentColor) {
      return { action: 'play', card: matchingCurrentColor, shouldDeclareUno };
    }
    
    return { action: 'play', card: cards[0], shouldDeclareUno };
  }
  
  // If no good sequence opportunities, fall back to the standard strategy
  const currentColorPlayableNonWildCards = nonWildPlayableCards.filter(card => card.color === gameState.currentColor);
  const matchingNumberCards = nonWildPlayableCards.filter(card => {
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return card.type === "number" && topCard.type === "number" && card.value === topCard.value;
  });
  const matchingTypeCards = nonWildPlayableCards.filter(card => {
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return card.type !== "number" && card.type === topCard.type;
  });

  if (currentColorPlayableNonWildCards.length > 0) {
    // Prioritize higher point value cards
    currentColorPlayableNonWildCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
    return { action: 'play', card: currentColorPlayableNonWildCards[0], shouldDeclareUno };
  }

  const matchingCards = [...matchingNumberCards, ...matchingTypeCards];
  if (matchingCards.length > 0) {
    matchingCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
    return { action: 'play', card: matchingCards[0], shouldDeclareUno };
  }

  if (nonWildPlayableCards.length > 0) {
    nonWildPlayableCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
    return { action: 'play', card: nonWildPlayableCards[0], shouldDeclareUno };
  }

  if (regularWildPlayable.length > 0) {
    const cardToPlay = regularWildPlayable[0];
    const chosenColor = _chooseBestColorForBot(botPlayer.cards, cardToPlay.id);
    return { action: 'play', card: cardToPlay, chosenColor, shouldDeclareUno };
  }

  if (wild4Playable.length > 0) {
    const cardToPlay = wild4Playable[0];
    
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (currentPlayerIndex === -1) { 
        console.error(`[getBotPlay] Critical error: Bot player ${playerId} not found in gameState for W+4 logic.`);
        return { action: 'draw' }; 
    }
    
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    const nextPlayer = gameState.players[nextPlayerIndex];

    if (!nextPlayer) {
        console.error(`[getBotPlay] Critical error: Next player not found for W+4 logic. PlayerID: ${playerId}, NextIndex: ${nextPlayerIndex}`);
        return { action: 'draw' }; 
    }

    if (nextPlayer.cards.length < 3 && botPlayer.cards.length > 2) {
      const chosenColor = _chooseBestColorForBot(botPlayer.cards, cardToPlay.id);
      return { action: 'play', card: cardToPlay, chosenColor, shouldDeclareUno };
    } else if (nextPlayer.cards.length < 3) {
      return { action: 'draw' };
    } else {
      const chosenColor = _chooseBestColorForBot(botPlayer.cards, cardToPlay.id);
      return { action: 'play', card: cardToPlay, chosenColor, shouldDeclareUno };
    }
  }

  return { action: 'draw' };
}
