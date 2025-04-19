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
  const strippedState = stripFunctionsFromGameState(gameState);
  await new Promise(resolve => setTimeout(resolve, BROADCAST_DELAY_MS));
  await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
}

export async function createGame(hostId: string, hostName: string): Promise<GameState> {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const initialPlayer: Player = { id: hostId, name: hostName, cards: [], isHost: true };
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
    log: [`Room ${roomId} created by ${hostName}`],
  };
  await updateGameState(roomId, initialState);
  console.log(`Game created successfully: ${roomId}`);
  return initialState;
}

export async function addPlayer(roomId: string, playerId: string, playerName: string): Promise<GameState> {
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

  const newPlayer: Player = { id: playerId, name: playerName, cards: [], isHost: false };
  gameState.players.push(newPlayer);
  gameState.log.push(`${playerName} joined the room.`);
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);

  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState);

  console.log(`Player ${playerName} added to room ${roomId}`);
  return gameState;
}

export async function startGame(roomId: string, playerId: string): Promise<GameState> {
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
  
  // Ensure log array exists before pushing
  if (!gameState.log) {
      gameState.log = [];
  }
  
  gameState.log.push(`Game started by ${player.name}! First card: ${firstCard.color} ${firstCard.value}. ${gameState.players.find((p: Player)=>p.id === gameState.currentPlayer)?.name}'s turn.`);
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);

  console.log(`Game started successfully for room ${roomId}. Current player: ${gameState.currentPlayer}`);
  await updateGameState(roomId, gameState);

  await broadcastUpdate(roomId, gameState);

  return gameState;
}

export async function playCard(roomId: string, playerId: string, cardId: string, chosenColor?: CardColor): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  // Reset saidUno status at turn start
  const playerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
  const player = gameState.players[playerIndex];
  if (player) {
      player.saidUno = false; 
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not active")
  }
  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn")
  }

  if (!player) {
    throw new Error("Player not found");
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
    gameState.log.push(`${player.name} played a ${cardToPlay.type} and chose ${chosenColor}`);
  }
  
  player.cards.splice(cardIndex, 1);
  gameState.discardPile.push(cardToPlay);

  if (cardToPlay.type !== "wild" && cardToPlay.type !== "wild4") {
    gameState.currentColor = cardToPlay.color;
  }

  if (player.cards.length === 0) {
    gameState.status = "finished";
    gameState.winner = playerId;
    gameState.log.push(`${player.name} won the game!`);
    calculatePoints(gameState);
    await updateGameState(roomId, gameState);
    await broadcastUpdate(roomId, gameState);
    console.log(`Game finished in room ${roomId}. Winner: ${playerId}`);
    return gameState;
  }
  
  if (player.cards.length === 1 && !player.saidUno) {
      console.log(`${player.name} forgot to say UNO!`);
       gameState.log.push(`${player.name} forgot to say UNO!`);
  }
   if (player.cards.length > 1) {
      player.saidUno = false;
   }

  applyCardEffects(gameState, cardToPlay);
  gameState.hasDrawnThisTurn = false;

  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);
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
  gameState.log.push(`${player.name} drew a card.`);
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);
  gameState.drawPileCount = gameState.drawPile.length;

  // Check if the drawn card is playable
  const isPlayable = checkPlayValidity(gameState, drawnCard);

  if (!isPlayable) {
    // Drawn card is not playable, automatically end the turn
    gameState.log.push(`${player.name}'s drawn card wasn't playable. Turn passes.`);
    const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    gameState.hasDrawnThisTurn = false; // Reset draw status for next player
    
    // Reset saidUno status for the next player
    const nextPlayer = gameState.players[nextPlayerIndex];
    if (nextPlayer && nextPlayer.cards.length !== 1) {
        nextPlayer.saidUno = false;
    }
    
    if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10); // Ensure log limit again after adding pass message
    
    console.log(`Player ${playerId} drew an unplayable card. Turn automatically passed to ${gameState.currentPlayer}.`);
    // Save the state *after* advancing the turn
    await updateGameState(roomId, gameState);
    await broadcastUpdate(roomId, gameState); 
    
  } else {
    // Drawn card is playable, save state and notify player
    console.log(`Player ${playerId} drew a playable card: ${drawnCard.color} ${drawnCard.type}`);
    // Save the state *before* sending the playable event
    await updateGameState(roomId, gameState); 
    await broadcastUpdate(roomId, gameState); // Update everyone first
    // Send specific event to the drawing player
    await pusherServer.trigger(`game-${roomId}`, "drawn-card-playable", { playerId, card: drawnCard });
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

  // Player must have exactly one card left to declare UNO
  if (player.cards.length !== 1) {
    console.warn(`${player.name} tried to declare UNO with ${player.cards.length} cards.`);
    // Optionally add a penalty here? For now, just ignore the declaration.
    // gameState.log.push(`${player.name} incorrectly declared UNO!`);
    // if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);
    // We don't update state or broadcast if the declaration is invalid
    return gameState;
  }

  if (player.saidUno) {
    console.log(`${player.name} already declared UNO.`);
    return gameState;
  }
  
  player.saidUno = true;
  gameState.log.push(`${player.name} declared UNO!`);
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);
  console.log(`Player ${playerId} declared UNO.`);

  await updateGameState(roomId, gameState); // Use updateGameState
  await broadcastUpdate(roomId, gameState);
  
  return gameState;
}

export async function passTurn(roomId: string, playerId: string): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  // Reset saidUno status at turn start
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
  if (!gameState.hasDrawnThisTurn) {
     throw new Error("Cannot pass turn unless you have drawn a card and cannot play it");
  }

  // Determine next player
  const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
  const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
  gameState.hasDrawnThisTurn = false; // Reset draw status for next player

  gameState.log.push(`${gameState.players[currentPlayerIndex].name} passed their turn.`);
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);
  
  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState);

  return gameState;
}

// --- Utility / Read Actions ---

// (getRoom action is in room-actions.ts)
