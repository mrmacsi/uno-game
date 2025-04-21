"use server"

import type { GameState, Card, CardColor, Player } from "./types"
import { getGameState, updateGameState } from "./db-actions"
import { 
  dealCards,
  checkPlayValidity,
  calculatePoints, 
  applyCardEffects, 
  reshuffleIfNeeded, 
  getNextPlayerIndex
} from "./game-logic"
import { pusherServer } from "@/lib/pusher-server"
import { stripFunctionsFromGameState } from "./utils"
import { v4 as uuidv4 } from "uuid"

const BROADCAST_DELAY_MS = 150

async function fetchAndValidateGameState(roomId: string, playerId?: string): Promise<GameState> {
  const gameState = await getGameState(roomId)
  if (!gameState) {
    throw new Error(`Room ${roomId} not found`)
  }
  if (playerId && !gameState.players.find((p: Player) => p.id === playerId)) {
    throw new Error("Player not found in room")
  }
  return gameState
}

async function broadcastUpdate(roomId: string, gameState: GameState) {
  // Create a copy of the state to modify for broadcasting
  const broadcastState = { ...gameState };

  // Remove the large drawPile array to reduce payload size
  // Clients should rely on drawPileCount
  broadcastState.drawPile = []; // Set to empty array or null

  // Strip any remaining functions (if any were added back temporarily)
  const strippedState = stripFunctionsFromGameState(broadcastState);
  
  await new Promise(resolve => setTimeout(resolve, BROADCAST_DELAY_MS));

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 150;
  let attempt = 0;
  let success = false;

  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    try {
      await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
      success = true;
      console.log(`Broadcast update sent for room ${roomId} on attempt ${attempt}. Payload size (approx estimate): ${JSON.stringify(strippedState).length} bytes`);
    } catch (error) {
      console.error(`Pusher trigger attempt ${attempt} failed for room ${roomId}:`, error);
      // Log specific errors
      if (error instanceof Error && error.message.includes('413')) {
          console.error("PUSHER PAYLOAD TOO LARGE - Even after removing drawPile. State snapshot:", JSON.stringify(strippedState).substring(0, 500)); // Log first 500 chars
          // Don't retry for payload size errors
          break; 
      }
      // Check if it's a retryable error (like ECONNRESET) and if we haven't reached max retries
      const isRetryable = error instanceof Error && typeof (error as { code?: string }) === "object" && (error as { code?: string }).code === 'ECONNRESET';
      if (isRetryable && attempt < MAX_RETRIES) {
          console.log(`Retrying Pusher trigger for room ${roomId} in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
          // Log final failure but don't throw, as the main action might have succeeded
          console.error(`Pusher trigger failed definitively for room ${roomId} after ${attempt} attempts.`);
          break; // Exit the loop
      }
    }
  }
}

export async function createGame(hostId: string, hostName: string, hostAvatarIndex: number): Promise<GameState> {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const initialPlayer: Player = { id: hostId, name: hostName, avatar_index: hostAvatarIndex, cards: [], isHost: true };
  const initialState: GameState = {
    roomId,
    status: "waiting",
    players: [initialPlayer],
    currentPlayer: hostId,
    direction: 1,
    drawPile: [],
    discardPile: [],
    currentColor: "black",
    winner: null,
    log: [{
      id: uuidv4(),
      message: `Room ${roomId} created by ${hostName}`,
      timestamp: Date.now(),
      player: hostName,
      avatarIndex: hostAvatarIndex
    }],
  };
  await updateGameState(roomId, initialState);
  console.log(`Game created successfully: ${roomId}`);
  return initialState;
}

export async function addPlayer(roomId: string, playerId: string, playerName: string, avatarIndex: number): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId);
  if (gameState.status !== "waiting") {
    throw new Error("Cannot join game that has already started");
  }
  if (gameState.players.length >= 4) {
    throw new Error("Room is full");
  }
  if (gameState.players.find((p: Player) => p.id === playerId)) {
    console.warn(`Player ${playerId} already in room ${roomId}`);
    return gameState;
  }

  const newPlayer: Player = { id: playerId, name: playerName, avatar_index: avatarIndex, cards: [], isHost: false };
  gameState.players.push(newPlayer);
  gameState.log.push({
    id: uuidv4(),
    message: `${playerName} joined the room.`,
    timestamp: Date.now(),
    player: playerName,
    avatarIndex: avatarIndex,
    eventType: 'join'
  });

  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState);

  console.log(`Player ${playerName} added to room ${roomId}`);
  return gameState;
}

export async function startGame(roomId: string, playerId: string, gameStartTime?: number): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);
  const player = gameState.players.find((p: Player) => p.id === playerId);

  if (!player || !player.isHost) {
    throw new Error("Only the host can start the game");
  }
  if (gameState.status !== "waiting") {
    throw new Error("Game has already started or finished");
  }
  if (gameState.players.length < 2) {
    throw new Error("Need at least 2 players to start");
  }

  const { drawPile, hands } = dealCards(gameState.players.length);
  gameState.players.forEach((player: Player, index: number) => {
    player.cards = hands[index];
  });

  const firstCardIndex = drawPile.findIndex((card: Card) => card.type === "number");
  if (firstCardIndex === -1) {
    throw new Error("Deck error: No initial number card found");
  }
  const firstCard = drawPile.splice(firstCardIndex, 1)[0];
  
  gameState.discardPile = [firstCard];
  gameState.drawPile = drawPile;
  gameState.drawPileCount = drawPile.length;
  gameState.currentColor = firstCard.color;
  gameState.currentPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)].id;
  gameState.status = "playing";
  gameState.gameStartTime = gameStartTime || Date.now();
  
  if (!gameState.log) {
      gameState.log = [];
  }
  
  gameState.log.push({
    id: uuidv4(),
    message: `Game started by ${player.name}! First card: ${firstCard.color} ${firstCard.type === 'number' ? firstCard.value : firstCard.type}. ${gameState.players.find((p: Player)=>p.id === gameState.currentPlayer)?.name}'s turn.`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatar_index,
    eventType: 'system',
    cardType: firstCard.type,
    cardValue: firstCard.type === 'number' ? firstCard.value : undefined,
    cardColor: firstCard.color
  });

  console.log(`Game started successfully for room ${roomId}. Current player: ${gameState.currentPlayer}`);
  await updateGameState(roomId, gameState);

  await broadcastUpdate(roomId, gameState);

  return gameState;
}

export async function playCard(roomId: string, playerId: string, cardId: string, chosenColor?: CardColor): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  if (gameState.status !== "playing") {
    throw new Error("Game is not active");
  }
  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn");
  }

  const player = gameState.players.find((p: Player) => p.id === playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  // UNO Check - must be handled before card is played
  if (player.cards.length === 2 && !player.saidUno) {
    console.log(`${player.name} attempted to play second-to-last card without declaring UNO. Turn passed.`);
    gameState.log.push({
      id: uuidv4(),
      message: `${player.name} forgot to declare UNO! Turn passed.`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatar_index
    });
    
    // Pass turn as penalty for not declaring UNO
    const currentPlayerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    gameState.hasDrawnThisTurn = false;
    
    await updateGameState(roomId, gameState);
    await broadcastUpdate(roomId, gameState);
    
    throw new Error("You must declare UNO before playing your second-to-last card!");
  }

  const cardIndex = player.cards.findIndex((c: Card) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Card not found in player's hand")
  }
  
  const cardToPlay = player.cards[cardIndex];

  if (!checkPlayValidity(gameState, cardToPlay)) {
     const topCard = gameState.discardPile[gameState.discardPile.length - 1];
     console.error(
       `Invalid Play Attempt: Player ${playerId}, Card ${cardToPlay.color} ${cardToPlay.type} ${cardToPlay.value ?? ''} on Top Card ${topCard?.color} ${topCard?.type} ${topCard?.value ?? ''}, Current Color: ${gameState.currentColor}`
     );
    throw new Error("Invalid card play")
  }

  if (cardToPlay.type === "wild" || cardToPlay.type === "wild4") {
    if (!chosenColor || chosenColor === "black" || chosenColor === "wild") {
      throw new Error("Must choose a color for wild card")
    }
    gameState.currentColor = chosenColor;
    gameState.log.push({
      id: uuidv4(),
      message: `${player.name} played a ${cardToPlay.type} and chose ${chosenColor}`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatar_index,
      eventType: 'play',
      cardType: cardToPlay.type,
      cardValue: undefined,
      cardColor: chosenColor
    });
  }
  
  player.cards.splice(cardIndex, 1);
  gameState.discardPile.push(cardToPlay);

  if (cardToPlay.type !== "wild" && cardToPlay.type !== "wild4") {
    gameState.currentColor = cardToPlay.color;
  }

  if (player.cards.length === 0) {
    gameState.status = "finished";
    gameState.winner = playerId;
    gameState.log.push({
      id: uuidv4(),
      message: `${player.name} won the game!`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatar_index
    });
    calculatePoints(gameState);
    await updateGameState(roomId, gameState);
    await broadcastUpdate(roomId, gameState);
    console.log(`Game finished in room ${roomId}. Winner: ${playerId}`);
    return gameState;
  }
  
  if (player.cards.length === 1 && !player.saidUno) {
      console.log(`${player.name} forgot to say UNO!`);
       gameState.log.push({
        id: uuidv4(),
        message: `${player.name} forgot to say UNO!`,
        timestamp: Date.now(),
        player: player.name,
        avatarIndex: player.avatar_index
      });
  }
   if (player.cards.length > 1) {
      player.saidUno = false;
   }

  applyCardEffects(gameState, cardToPlay);
  gameState.hasDrawnThisTurn = false;

  gameState.drawPileCount = gameState.drawPile.length;

  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState);

  return gameState;
}

export async function drawCard(roomId: string, playerId: string): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  // Reset saidUno status at turn start
  const player = gameState.players.find((p: Player) => p.id === playerId);
  if (player) {
      player.saidUno = false; 
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not active")
  }
  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn")
  }
  if (gameState.hasDrawnThisTurn) {
     throw new Error("Already drew a card this turn");
  }

  reshuffleIfNeeded(gameState);

  if (gameState.drawPile.length === 0) {
    throw new Error("Draw pile is empty!");
  }

  const drawnCard = gameState.drawPile.pop()!;
  if (!player) {
      throw new Error("Player not found");
  }
  player.cards.push(drawnCard);
  gameState.hasDrawnThisTurn = true;
  gameState.log.push({
    id: uuidv4(),
    message: `${player.name} drew a card.`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatar_index
  });

  // Check if ANY card in the hand is playable (including the drawn one)
  const hasAnyPlayableCard = player.cards.some(card => checkPlayValidity(gameState, card));

  if (!hasAnyPlayableCard) {
    // NO playable cards, automatically end the turn
    gameState.log.push({
      id: uuidv4(),
      message: `${player.name} has no playable cards after drawing. Turn passes.`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatar_index
    });
    const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    gameState.hasDrawnThisTurn = false; // Reset draw status for next player
    
    // Reset saidUno status for the next player
    const nextPlayer = gameState.players[nextPlayerIndex];
    if (nextPlayer && nextPlayer.cards.length !== 1) {
        nextPlayer.saidUno = false;
    }
    
    console.log(`Player ${playerId} drew an unplayable card. Turn automatically passed to ${gameState.currentPlayer}.`);
    // Save the state *after* advancing the turn
    await updateGameState(roomId, gameState);
    await broadcastUpdate(roomId, gameState); 
    
  } else {
    // Player HAS playable cards. Do NOT pass turn. 
    // Just update state with the drawn card and let player decide.
    console.log(`Player ${playerId} drew a card and has playable options.`);
    await updateGameState(roomId, gameState); 
    await broadcastUpdate(roomId, gameState); 
    // Remove the specific drawn-card-playable event, it's not needed anymore
    // await pusherServer.trigger(`game-${roomId}`, "drawn-card-playable", { playerId, card: drawnCard });
  }

  return gameState;
}

export async function declareUno(roomId: string, playerId: string): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  if (gameState.status !== "playing") {
    throw new Error("Game is not active");
  }

  const player = gameState.players.find((p: Player) => p.id === playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  // Allow UNO declaration when having exactly 2 cards (before playing second-to-last card)
  if (player.cards.length !== 2) {
    console.warn(`${player.name} tried to declare UNO with ${player.cards.length} cards.`);
    // We don't update state or broadcast if the declaration is invalid
    return gameState;
  }

  if (player.saidUno) {
    console.log(`${player.name} already declared UNO.`);
    return gameState;
  }
  
  player.saidUno = true;
  // Add log entry for UNO declaration
  gameState.log.push({
    id: uuidv4(),
    message: `${player.name} declared UNO!`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatar_index,
    eventType: 'uno' // Add eventType for client-side handling
  });

  await updateGameState(roomId, gameState); 
  await broadcastUpdate(roomId, gameState);
  
  return gameState;
}

export async function passTurn(roomId: string, playerId: string, forcePass: boolean = false): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  // Reset saidUno status at turn start (This might be redundant if handlePlayCard does it, but safe)
  const player = gameState.players.find((p: Player) => p.id === playerId);
  if (player) {
      player.saidUno = false; 
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not active");
  }
  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn");
  }
  // Skip this check if the turn pass is forced (e.g., due to forgetting UNO)
  if (!forcePass && !gameState.hasDrawnThisTurn) {
     throw new Error("Cannot pass turn unless you have drawn a card and cannot play it, or forgot to declare UNO");
  }

  // Determine next player
  const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
  const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
  gameState.hasDrawnThisTurn = false; // Reset draw status for next player

  // Use a different log message if the pass was forced due to forgetting UNO
  if (forcePass) {
    gameState.log.push({
      id: uuidv4(),
      message: `${gameState.players[currentPlayerIndex].name} forgot to declare UNO! Turn passed.`,
      timestamp: Date.now(),
      player: gameState.players[currentPlayerIndex].name,
      avatarIndex: gameState.players[currentPlayerIndex].avatar_index,
      eventType: 'uno_fail'
    });
  } else {
    gameState.log.push({
      id: uuidv4(),
      message: `${gameState.players[currentPlayerIndex].name} passed their turn after drawing.`,
      timestamp: Date.now(),
      player: gameState.players[currentPlayerIndex].name,
      avatarIndex: gameState.players[currentPlayerIndex].avatar_index,
      eventType: 'draw'
    });
  }

  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState);

  return gameState;
}

export async function rematchGame(roomId: string, playerId: string): Promise<GameState> {
  console.log(`Rematch initiated by ${playerId} for room ${roomId}`);
  const gameState = await fetchAndValidateGameState(roomId, playerId);
  const initiatorPlayer = gameState.players.find((p: Player) => p.id === playerId);

  if (!initiatorPlayer || !initiatorPlayer.isHost) {
    throw new Error("Only the host can initiate a rematch");
  }
  if (gameState.status !== "finished") {
    throw new Error("Can only rematch a finished game");
  }
  if (gameState.players.length < 2) {
    throw new Error("Need at least 2 players for a rematch");
  }

  // Reset player hands and saidUno status
  gameState.players.forEach((p: Player) => {
    p.cards = [];
    p.saidUno = false;
  });

  // Deal new cards
  const { drawPile, hands } = dealCards(gameState.players.length);
  gameState.players.forEach((player: Player, index: number) => {
    player.cards = hands[index];
  });

  // Find a valid starting card
  const firstCardIndex = drawPile.findIndex((card: Card) => card.type === "number");
  if (firstCardIndex === -1) {
    // Should be rare, but handle shuffling and trying again if no number card found initially
    console.warn("No number card found in initial deal for rematch, reshuffling...");
    // A more robust solution might involve a full deck reset and reshuffle here
    // For simplicity, we'll assume dealCards provides a playable deck
    throw new Error("Deck error during rematch: No initial number card found");
  }
  const firstCard = drawPile.splice(firstCardIndex, 1)[0];
  
  // Reset game state variables
  gameState.discardPile = [firstCard];
  gameState.drawPile = drawPile;
  gameState.drawPileCount = drawPile.length;
  gameState.currentColor = firstCard.color;
  gameState.currentPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)].id; // Random start player
  gameState.status = "playing";
  gameState.gameStartTime = Date.now(); // New start time
  gameState.winner = null;
  gameState.direction = 1; // Reset direction
  gameState.hasDrawnThisTurn = false;

  // Clear previous log and add rematch entry
  gameState.log = [{
    id: uuidv4(),
    message: `Rematch started by ${initiatorPlayer.name}! First card: ${firstCard.color} ${firstCard.type === 'number' ? firstCard.value : firstCard.type}. ${gameState.players.find((p: Player)=>p.id === gameState.currentPlayer)?.name}'s turn.`,
    timestamp: Date.now(),
    player: initiatorPlayer.name,
    avatarIndex: initiatorPlayer.avatar_index,
    eventType: 'system',
    cardType: firstCard.type,
    cardValue: firstCard.type === 'number' ? firstCard.value : undefined,
    cardColor: firstCard.color
  }];

  console.log(`Rematch successful for room ${roomId}. Current player: ${gameState.currentPlayer}`);
  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState);

  return gameState;
}

// --- Utility / Read Actions ---

// (getRoom action is in room-actions.ts)
