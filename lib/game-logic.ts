import type { GameState, Card, CardColor, CardType, MatchResult, LogEntry, BotPlayDecision } from "./types"; 
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
    gameState.drawPile = shuffle(gameState.discardPile.filter(card => card.id !== topCard.id)); 
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
  if (numPlayers === 0) return 0; 
  const validDirection = gameState.direction === -1 ? -1 : 1;
  const nextIndex = (currentIndex + validDirection + numPlayers) % numPlayers;
  return nextIndex;
}

export function isWildDraw4PlayLegal(
  handOfPlayerWhoPlayedW4: Card[], 
  currentColorBeforePlay: CardColor 
): boolean {
  return !handOfPlayerWhoPlayedW4.some(
    card => card.color === currentColorBeforePlay && card.type !== 'wild' && card.type !== 'wild4'
  );
}

export function checkPlayValidity(gameState: GameState, card: Card): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  if (!topCard) return true; // First card of the game

  if (gameState.pendingDrawStack) {
    return card.type === gameState.pendingDrawStack.type && (card.type === "draw2" || card.type === "wild4");
  }

  // For Wild Draw 4, its playability regarding player's hand is checked by isWildDraw4PlayLegal if challenged.
  // For basic validity (can it be put on discard pile?), Wild and Wild Draw 4 are always valid if no stack.
  if (card.type === "wild" || card.type === "wild4") return true;

  // Standard matching rules
  if (card.color === gameState.currentColor) return true; 
  if (card.color === topCard.color) return true; // Removed && topCard.color !== "black" as per target
  if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) return true; 
  // Match action type (e.g. skip on skip), ensuring not to misinterpret wild cards here.
  if (card.type !== "number" && card.type === topCard.type) return true; // Simplified from the more explicit check
  
  return false;
}
        
export function applyCardEffects(gameState: GameState, card: Card): void {
  const currentPlayerIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer);
  if (currentPlayerIndex === -1) {
    console.error("Current player not found in applyCardEffects. State:", JSON.stringify(gameState));
    throw new Error("Critical error: Current player not found.");
  }
  const playerWhoPlayed = gameState.players[currentPlayerIndex];
  let nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);

  if (!gameState.log) { gameState.log = []; }

  let baseLogMessage = `${playerWhoPlayed.name} played a ${card.color} ${card.type}`;
  if (card.type === "number" && card.value !== undefined) {
    baseLogMessage += ` ${card.value}`;
  } else if ((card.type === "wild" || card.type === "wild4") && card.chosenColor) {
    baseLogMessage += ` (chose ${card.chosenColor})`;
  }
  
  // Avoid double logging for Wild Draw 4 starting a challenge, log is handled inside that block.
  if (!(card.type === "wild4" && !gameState.pendingDrawStack && !gameState.challengeState?.isActive)) { 
      gameState.log.push({
        id: uuidv4(), eventType: 'play', message: baseLogMessage, timestamp: Date.now(),
        player: playerWhoPlayed.name, cardType: card.type, cardColor: card.color, 
        cardValue: card.type === "number" ? card.value : undefined, avatarIndex: playerWhoPlayed.avatarIndex
      });
  }

  if (gameState.challengeState?.isActive) {
    // If a challenge is active, no other card effects (like drawing for W+4 or stacking) apply yet.
    // The turn has already been passed to the challenger in the Wild Draw 4 block below.
    // Challenge resolution will handle further effects.
    console.log(`Challenge is active for card ${gameState.challengeState.cardPlayedId}. applyCardEffects will not apply further standard effects for ${card.id} yet.`);
    return; 
  }
  
  if (gameState.pendingDrawStack) {
    if (card.type === gameState.pendingDrawStack.type && (card.type === "draw2" || card.type === "wild4")) { 
      gameState.pendingDrawStack.count += (card.type === "draw2" ? 2 : 4);
      if (card.type === "wild4") { 
        if (!card.chosenColor) throw new Error("Wild4 card must have a chosenColor when played.");
        gameState.currentColor = card.chosenColor;
      }
      
      gameState.log.push({
        id: uuidv4(), eventType: 'stack', 
        message: `${playerWhoPlayed.name} stacked a ${card.type}! Pending draw is now ${gameState.pendingDrawStack.count}.`,
        timestamp: Date.now(), player: playerWhoPlayed.name, cardType: card.type, cardColor: card.color, avatarIndex: playerWhoPlayed.avatarIndex
      });
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id; 
    } else { 
      reshuffleIfNeeded(gameState);
      const cardsToDrawCount = gameState.pendingDrawStack.count;
      const drawnCards = gameState.drawPile.splice(0, cardsToDrawCount);
      playerWhoPlayed.cards.push(...drawnCards);
      
      gameState.log.push({
        id: uuidv4(), eventType: 'draw_stack',
        message: `${playerWhoPlayed.name} drew ${cardsToDrawCount} cards from stack. Played card ${card.color} ${card.type} is discarded.`,
        timestamp: Date.now(), player: playerWhoPlayed.name, avatarIndex: playerWhoPlayed.avatarIndex
      });
      
      gameState.drawCardEffect = { playerId: playerWhoPlayed.id, count: cardsToDrawCount }; 
      gameState.pendingDrawStack = null; 
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    }
  } else { 
    if (card.type === "draw2") {
      gameState.pendingDrawStack = { count: 2, type: "draw2" };
      gameState.log.push({
        id: uuidv4(), eventType: 'stack_start',
        message: `${baseLogMessage}. Started a Draw 2 stack.`,
        timestamp: Date.now(), player: playerWhoPlayed.name, cardType: card.type, cardColor: card.color, avatarIndex: playerWhoPlayed.avatarIndex
      });
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    } else if (card.type === "wild4") {
      if (!card.chosenColor) throw new Error("Wild4 card must have a chosenColor when played.");
      
      const playerToChallenge = gameState.players[nextPlayerIndex];
      gameState.challengeState = {
        challengerId: playerToChallenge.id,
        challengedPlayerId: playerWhoPlayed.id, 
        cardPlayedId: card.id,
        isActive: true,
        isResolved: false
      };
      gameState.log.push({
        id: uuidv4(), eventType: 'play', 
        message: `${playerWhoPlayed.name} played a Wild Draw 4 (chose ${card.chosenColor}). ${playerToChallenge.name} can now challenge.`,
        timestamp: Date.now(), player: playerWhoPlayed.name, cardType: card.type, cardColor: card.chosenColor, avatarIndex: playerWhoPlayed.avatarIndex
      });
      gameState.currentPlayer = playerToChallenge.id; 
    } else {
      if (card.type === "wild") {
        if (!card.chosenColor) throw new Error("Wild card must have a chosenColor when played.");
        gameState.currentColor = card.chosenColor;
      }
      
      switch (card.type) {
        case "skip":
          const skippedPlayer = gameState.players[nextPlayerIndex];
          gameState.log.push({
            id: uuidv4(), eventType: 'skip', message: `${skippedPlayer.name} was skipped!`,
            timestamp: Date.now(), player: skippedPlayer.name, cardType: card.type, cardColor: card.color, avatarIndex: skippedPlayer.avatarIndex
          });
          nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex); 
          break;
        case "reverse":
          gameState.direction *= -1;
          const eventMessage = gameState.players.length === 2 ?
            `Direction reversed! ${gameState.players[nextPlayerIndex].name} was effectively skipped!` :
            `Direction reversed!`;
          const eventTypeLog: LogEntry['eventType'] = gameState.players.length === 2 ? 'skip' : 'reverse';
          
          gameState.log.push({
            id: uuidv4(), eventType: eventTypeLog, message: eventMessage, timestamp: Date.now(),
            player: playerWhoPlayed.name, cardType: card.type, cardColor: card.color, avatarIndex: playerWhoPlayed.avatarIndex
          });

          if (gameState.players.length === 2) { 
            nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex);
          } else { 
            nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
          }
          break;
      }
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    }
  }

  reshuffleIfNeeded(gameState);
  gameState.drawPileCount = gameState.drawPile.length;

  const playerWhoJustPlayed = gameState.players[currentPlayerIndex]; 
  if (!gameState.challengeState?.isActive && playerWhoJustPlayed.cards.length === 1) { 
    if (playerWhoJustPlayed.saidUno) {
      gameState.log.push({
        id: uuidv4(), eventType: 'uno', message: `UNO! ${playerWhoJustPlayed.name} has one card left!`,
        timestamp: Date.now(), player: playerWhoJustPlayed.name, avatarIndex: playerWhoJustPlayed.avatarIndex
      });
    } else {
      gameState.log.push({
        id: uuidv4(), eventType: 'uno_fail', message: `${playerWhoJustPlayed.name} forgot to declare UNO! (Has 1 card left)`,
        timestamp: Date.now(), player: playerWhoJustPlayed.name, avatarIndex: playerWhoJustPlayed.avatarIndex
      });
    }
  }
  
  const actualCurrentPlayerWhoseTurnItIs = gameState.players.find(p => p.id === gameState.currentPlayer);
  if (actualCurrentPlayerWhoseTurnItIs && actualCurrentPlayerWhoseTurnItIs.cards.length !== 1) { 
      actualCurrentPlayerWhoseTurnItIs.saidUno = false;
  }
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

export function getBotPlay(gameState: GameState, playerId: string): BotPlayDecision {
  const botPlayer = gameState.players.find(p => p.id === playerId);
  if (!botPlayer || botPlayer.cards.length === 0) {
    if (gameState.pendingDrawStack || gameState.challengeState?.isActive) return { action: 'draw' }; 
    return { action: 'draw' }; 
  }

  const _chooseBestColorForBot = (cardsInHand: Card[], cardToExcludeId: string): CardColor => {
    const relevantCards = cardsInHand.filter(c => c.id !== cardToExcludeId);
    const colorPoints: { [key in CardColor]?: number } = {};
    const validColors: CardColor[] = ["red", "blue", "green", "yellow"];

    relevantCards.forEach(cardInHand => {
      if (cardInHand.color !== "black" && validColors.includes(cardInHand.color)) {
        colorPoints[cardInHand.color] = (colorPoints[cardInHand.color] || 0) + getCardPointValue(cardInHand);
      }
    });

    let chosenColor: CardColor = validColors[Math.floor(Math.random() * validColors.length)]; 

    const sortedColorEntriesByPoints = Object.entries(colorPoints)
      .filter(([, points]) => points !== undefined && points > 0)
      .sort(([, pointsA], [, pointsB]) => (pointsB as number) - (pointsA as number));

    if (sortedColorEntriesByPoints.length > 0) {
      const maxPoints = sortedColorEntriesByPoints[0][1] as number;
      const topColors = sortedColorEntriesByPoints
        .filter(([, points]) => points === maxPoints)
        .map(([color]) => color as CardColor);
      
      if (topColors.includes(gameState.currentColor)) {
        chosenColor = gameState.currentColor;
      } else {
        chosenColor = topColors[0];
      }
    }
    return chosenColor;
  };
  
  if (gameState.challengeState?.isActive && gameState.challengeState.challengerId === playerId) {
    // Bot logic for deciding whether to challenge or not.
    // For now, bot will not challenge (i.e., will accept the W+4 effect).
    // This means the 'draw' action will trigger the consequence of not challenging.
    return { action: 'draw' }; 
  }

  if (gameState.pendingDrawStack) {
    const stackableCard = botPlayer.cards.find(c => c.type === gameState.pendingDrawStack?.type);
    if (stackableCard && checkPlayValidity(gameState, stackableCard)) { 
      let chosenColorForWildStack: CardColor | undefined = undefined;
      if (stackableCard.type === "wild4") {
        chosenColorForWildStack = _chooseBestColorForBot(botPlayer.cards, stackableCard.id);
      }
      return { action: 'play', card: stackableCard, chosenColor: chosenColorForWildStack, shouldDeclareUno: botPlayer.cards.length === 2 };
    } else {
      return { action: 'draw' }; 
    }
  }

  if (gameState.hasDrawnThisTurn) {
    const lastCard = botPlayer.cards[botPlayer.cards.length - 1];
    if (checkPlayValidity(gameState, lastCard)) {
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

  const offensiveWildDraw4 = allPlayableCards.find(card => card.type === "wild4");
  if (offensiveWildDraw4) {
    const currentPlayerIdx = gameState.players.findIndex(p => p.id === playerId);
    const nextPlayerIdx = getNextPlayerIndex(gameState, currentPlayerIdx);
    const nextPlayer = gameState.players[nextPlayerIdx];
    if (nextPlayer && nextPlayer.cards.length < 3) {
      const chosenColor = _chooseBestColorForBot(botPlayer.cards, offensiveWildDraw4.id);
      return { action: 'play', card: offensiveWildDraw4, chosenColor, shouldDeclareUno: botPlayer.cards.length === 2 };
    }
  }
  
  if (botPlayer.cards.length === 2) {
    const wildDraw4Finish = allPlayableCards.find(card => card.type === "wild4");
    if (wildDraw4Finish) {
      const chosenColor = _chooseBestColorForBot(botPlayer.cards, wildDraw4Finish.id);
      return { action: 'play', card: wildDraw4Finish, chosenColor, shouldDeclareUno: true };
    }
  }

  allPlayableCards.sort((a, b) => getCardPointValue(b) - getCardPointValue(a));
  let cardToPlay = allPlayableCards[0];
  let chosenColorForPlay: CardColor | undefined = undefined;
  if (cardToPlay.type === "wild" || cardToPlay.type === "wild4") {
    chosenColorForPlay = _chooseBestColorForBot(botPlayer.cards, cardToPlay.id);
  }
  return { action: 'play', card: cardToPlay, chosenColor: chosenColorForPlay, shouldDeclareUno: botPlayer.cards.length === 2 };
}
