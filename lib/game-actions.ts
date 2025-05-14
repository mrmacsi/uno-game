"use server"

import type { GameState, Card, CardColor, Player, LogEntry } from "./types"
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

async function broadcastUpdate(roomId: string, gameState: GameState, newLogs?: LogEntry[]) {
  const broadcastState = { ...gameState };
  broadcastState.drawPile = []; 
  const strippedState = stripFunctionsFromGameState(broadcastState);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { log, ...stateToSend } = strippedState;
  
  await new Promise(resolve => setTimeout(resolve, BROADCAST_DELAY_MS));

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 150;
  let attempt = 0;
  let success = false;
  let mainUpdateSuccess = false;

  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    try {
      await pusherServer.trigger(`game-${roomId}`, "game-updated", stateToSend);
      success = true;
      mainUpdateSuccess = true; 
      console.log(`Broadcast 'game-updated' sent for room ${roomId} (log excluded) on attempt ${attempt}. Payload size (approx estimate): ${JSON.stringify(stateToSend).length} bytes`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('413')) {
          console.error("PUSHER PAYLOAD TOO LARGE - Even after removing drawPile and logs. State snapshot:", JSON.stringify(stateToSend).substring(0, 500)); 
          break; 
      }
      console.error(`Pusher 'game-updated' trigger attempt ${attempt} failed for room ${roomId}:`, error);
      const isRetryable = error instanceof Error && typeof (error as { code?: string }) === "object" && (error as { code?: string }).code === 'ECONNRESET';
      if (isRetryable && attempt < MAX_RETRIES) {
          console.log(`Retrying Pusher 'game-updated' trigger for room ${roomId} in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
          console.error(`Pusher 'game-updated' failed definitively for room ${roomId} after ${attempt} attempts.`);
          break; 
      }
    }
  }
  
  if (mainUpdateSuccess && newLogs && newLogs.length > 0) {
    attempt = 0; 
    success = false;
    while (attempt < MAX_RETRIES && !success) {
        attempt++;
        try {
            await pusherServer.trigger(`game-${roomId}`, "new-log-entries", { logs: newLogs });
            success = true;
            console.log(`Broadcast 'new-log-entries' sent for room ${roomId} (${newLogs.length} entries) on attempt ${attempt}.`);
        } catch (error) {
            console.error(`Pusher 'new-log-entries' trigger attempt ${attempt} failed for room ${roomId}:`, error);
             if (attempt < MAX_RETRIES) {
                 console.log(`Retrying Pusher 'new-log-entries' trigger for room ${roomId} in ${RETRY_DELAY_MS}ms...`);
                 await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
             } else {
                 console.error(`Pusher 'new-log-entries' failed definitively for room ${roomId} after ${attempt} attempts.`);
                 break; 
             }
        }
    }
  }
}

export async function createGame(hostId: string, hostName: string, hostAvatarIndex: number): Promise<GameState> {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const initialPlayer: Player = { id: hostId, name: hostName, avatarIndex: hostAvatarIndex, cards: [], isHost: true };
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
  console.log("[addPlayer] Adding player:", { roomId, playerId, playerName, avatarIndex });
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

  const newPlayer: Player = { id: playerId, name: playerName, avatarIndex: avatarIndex, cards: [], isHost: false };
  
  const originalLogLength = gameState.log ? gameState.log.length : 0;
  
  gameState.players.push(newPlayer);
  if (!gameState.log) gameState.log = []; 
  gameState.log.push({
    id: uuidv4(),
    message: `${playerName} joined the room.`,
    timestamp: Date.now(),
    player: playerName,
    avatarIndex: avatarIndex,
    eventType: 'join'
  });

  await updateGameState(roomId, gameState);

  const newLogs = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs);

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
  
  const originalLogLength = gameState.log ? gameState.log.length : 0;
  
  if (!gameState.log) {
      gameState.log = [];
  }
  
  gameState.log.push({
    id: uuidv4(),
    message: `Game started by ${player.name}! First card: ${firstCard.color} ${firstCard.type === 'number' ? firstCard.value : firstCard.type}. ${gameState.players.find((p: Player)=>p.id === gameState.currentPlayer)?.name}'s turn.`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatarIndex,
    eventType: 'system',
    cardType: firstCard.type,
    cardValue: firstCard.type === 'number' ? firstCard.value : undefined,
    cardColor: firstCard.color
  });

  console.log(`Game started successfully for room ${roomId}. Current player: ${gameState.currentPlayer}`);
  await updateGameState(roomId, gameState);

  const newLogs = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs);

  return gameState;
}

export async function playCard(roomId: string, playerId: string, cardDetails: Card, chosenColor?: CardColor): Promise<GameState> {
  console.log("[playCard Action] Received chosenColor:", chosenColor);

  const cardId = cardDetails?.id;
  if (typeof cardId !== 'string') {
      console.error("[playCard Action] Error: Card ID is missing or not a string from cardDetails.", cardDetails);
      throw new Error("Card ID is required and must be a string.");
  }

  const gameState = await fetchAndValidateGameState(roomId, playerId);

  if (gameState.status !== "playing") {
    throw new Error("Game is not active");
  }
  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn");
  }

  const originalLogLength = gameState.log ? gameState.log.length : 0;
  let newLogs: LogEntry[] = [];

  if (!gameState.log) gameState.log = [];

  const checkingPlayer = gameState.players.find((p: Player) => p.id === playerId);
  if (checkingPlayer && checkingPlayer.cards.length === 2 && !checkingPlayer.saidUno) {
    console.log(`${checkingPlayer.name} attempted to play second-to-last card without declaring UNO. Turn passed.`);
    gameState.log.push({
      id: uuidv4(),
      message: `${checkingPlayer.name} forgot to declare UNO! Turn passed.`,
      timestamp: Date.now(),
      player: checkingPlayer.name,
      avatarIndex: checkingPlayer.avatarIndex,
      eventType: 'uno_fail'
    });
    
    const currentPlayerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    gameState.hasDrawnThisTurn = false;
    
    await updateGameState(roomId, gameState);
    
    newLogs = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs);
    
    throw new Error("You must declare UNO before playing your second-to-last card!");
  }

  const playerForCard = gameState.players.find((p: Player) => p.id === playerId);
  if (!playerForCard) throw new Error("Player not found when finding card");
  const cardIndex = playerForCard.cards.findIndex((c: Card) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Card not found in player's hand")
  }
  
  const cardToPlay = playerForCard.cards[cardIndex];

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
    console.log(`[playCard:Log] About to add log for wild card play. Player: ${playerForCard.name}, Card: ${cardToPlay.type}, Chosen: ${chosenColor}, Log count: ${gameState.log.length}`);
    gameState.log.push({ 
      id: uuidv4(),
      message: `${playerForCard.name} played a ${cardToPlay.type} and chose ${chosenColor}`,
      timestamp: Date.now(),
      player: playerForCard.name,
      avatarIndex: playerForCard.avatarIndex,
      eventType: 'play',
      cardType: cardToPlay.type,
      cardValue: undefined,
      cardColor: chosenColor
    });
  }
  
  playerForCard.cards.splice(cardIndex, 1);
  gameState.discardPile.push(cardToPlay);

  if (cardToPlay.type !== "wild" && cardToPlay.type !== "wild4" && cardToPlay.color) {
    gameState.currentColor = cardToPlay.color;
  }

  if (playerForCard.cards.length === 0) {
    gameState.status = "finished";
    gameState.winner = playerId;
    gameState.log.push({ 
      id: uuidv4(),
      message: `${playerForCard.name} won the game with a ${cardToPlay.color || ''} ${cardToPlay.value || ''} ${cardToPlay.type}!`,
      timestamp: Date.now(),
      player: playerForCard.name,
      avatarIndex: playerForCard.avatarIndex,
      eventType: 'win',
      cardType: cardToPlay.type,
      cardValue: cardToPlay.value,
      cardColor: cardToPlay.color
    });
    
    calculatePoints(gameState); 
    
    await updateGameState(roomId, gameState);
    
    newLogs = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs);
    
    console.log(`Game finished in room ${roomId}. Winner: ${playerId}`);
    return gameState;
  }
  
  if (playerForCard.cards.length === 1 && !playerForCard.saidUno) {
      console.log(`${playerForCard.name} forgot to say UNO!`);
       gameState.log.push({
        id: uuidv4(),
        message: `${playerForCard.name} forgot to say UNO!`,
        timestamp: Date.now(),
        player: playerForCard.name,
        avatarIndex: playerForCard.avatarIndex,
        eventType: 'uno_fail'
      });
  }
  
  if (playerForCard.cards.length > 1) {
      playerForCard.saidUno = false;
  }

  applyCardEffects(gameState, cardToPlay); 
  
  gameState.hasDrawnThisTurn = false;
  gameState.drawPileCount = gameState.drawPile.length;

  await updateGameState(roomId, gameState);

  newLogs = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs);

  return gameState;
}

export async function drawCard(roomId: string, playerId: string): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

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

  const originalLogLength = gameState.log ? gameState.log.length : 0;
  
  if (!gameState.log) gameState.log = [];

  reshuffleIfNeeded(gameState);

  if (gameState.drawPile.length === 0) {
    gameState.log.push({
        id: uuidv4(),
        message: `${player?.name || 'Player'} tried to draw, but both piles are effectively empty. Turn passes.`,
        timestamp: Date.now(),
        player: player?.name,
        avatarIndex: player?.avatarIndex,
        eventType: 'system' 
     });
     const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
     const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
     gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
     gameState.hasDrawnThisTurn = false; 
     await updateGameState(roomId, gameState);
     const newLogs_emptyDraw = gameState.log.slice(originalLogLength);
     await broadcastUpdate(roomId, gameState, newLogs_emptyDraw);
     return gameState; 
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
    avatarIndex: player.avatarIndex,
    eventType: 'draw'
  });

  const hasAnyPlayableCard = player.cards.some(card => checkPlayValidity(gameState, card));

  if (!hasAnyPlayableCard) {
    gameState.log.push({
      id: uuidv4(),
      message: `${player.name} has no playable cards after drawing. Turn passes.`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatarIndex,
      eventType: 'system'
    });
    const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    gameState.hasDrawnThisTurn = false;
    
    const nextPlayer = gameState.players[nextPlayerIndex];
    if (nextPlayer && nextPlayer.cards.length !== 1) {
        nextPlayer.saidUno = false;
    }
    
    console.log(`Player ${playerId} drew an unplayable card. Turn automatically passed to ${gameState.currentPlayer}.`);
    await updateGameState(roomId, gameState);
    
    const newLogs_drawPass = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs_drawPass);
    
  } else {
    console.log(`Player ${playerId} drew a card and has playable options.`);
    await updateGameState(roomId, gameState);
    
    const newLogs_drawOnly = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs_drawOnly);
  }

  gameState.drawPileCount = gameState.drawPile.length;

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

  if (player.cards.length !== 2) {
    console.warn(`${player.name} tried to declare UNO with ${player.cards.length} cards.`);
    return gameState;
  }

  if (player.saidUno) {
    console.log(`${player.name} already declared UNO.`);
    return gameState;
  }
  
  const originalLogLength = gameState.log ? gameState.log.length : 0;
  
  if (!gameState.log) gameState.log = [];

  player.saidUno = true;
  gameState.log.push({
    id: uuidv4(),
    message: `${player.name} declared UNO!`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatarIndex,
    eventType: 'uno'
  });

  await updateGameState(roomId, gameState);

  const newLogs = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs);
  
  console.log(`Player ${playerId} declared UNO.`);
  return gameState;
}

export async function passTurn(roomId: string, playerId: string, forcePass: boolean = false): Promise<GameState> {
  const gameState = await fetchAndValidateGameState(roomId, playerId);

  const player = gameState.players.find((p: Player) => p.id === playerId);
  if (!player) {
    throw new Error("Player not found");
  }
  
  // Clear UNO status when passing
  player.saidUno = false;

  if (gameState.status !== "playing") {
    throw new Error("Game is not active");
  }
  
  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn");
  }
  
  // Only check if forcePass is false and player is not a bot
  if (!forcePass && !player.isBot && !gameState.hasDrawnThisTurn) {
     throw new Error("Cannot pass turn unless you have drawn a card and cannot play it, or forgot to declare UNO");
  }

  const originalLogLength = gameState.log ? gameState.log.length : 0;
  
  if (!gameState.log) gameState.log = [];

  const currentPlayerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
  const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
  gameState.hasDrawnThisTurn = false;
  
  const nextPlayer = gameState.players[nextPlayerIndex];
  if (nextPlayer && nextPlayer.cards.length !== 1) {
      nextPlayer.saidUno = false;
  }

  const passReason = gameState.hasDrawnThisTurn ? " after drawing" : "";
  gameState.log.push({
    id: uuidv4(),
    message: `${player.name} passed their turn${passReason}.`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatarIndex,
    eventType: 'system'
  });

  console.log(`Player ${playerId} (${player.name}) passed turn. Next player: ${gameState.currentPlayer}`);
  await updateGameState(roomId, gameState);

  const newLogs = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs);
  
  return gameState;
}

export async function rematchGame(roomId: string, playerId: string): Promise<GameState> {
  console.log(`Rematch initiated by ${playerId} for room ${roomId}`);
  const gameState = await fetchAndValidateGameState(roomId, playerId);
  const initiatorPlayer = gameState.players.find((p: Player) => p.id === playerId);

  if (!initiatorPlayer) {
     throw new Error("Player not found, cannot initiate rematch.");
  }
  if (gameState.status !== "finished") {
    throw new Error("Can only rematch a finished game");
  }
  if (gameState.players.length < 2) {
    throw new Error("Need at least 2 players for a rematch");
  }

  gameState.players.forEach((p: Player) => {
    p.cards = [];
    p.saidUno = false;
  });

  const { drawPile, hands } = dealCards(gameState.players.length);
  gameState.players.forEach((player: Player, index: number) => {
    player.cards = hands[index];
  });

  const firstCardIndex = drawPile.findIndex((card: Card) => card.type === "number");
  if (firstCardIndex === -1) {
    console.warn("No number card found in initial deal for rematch, reshuffling...");
    throw new Error("Deck error during rematch: No initial number card found");
  }
  const firstCard = drawPile.splice(firstCardIndex, 1)[0];
  
  gameState.discardPile = [firstCard];
  gameState.drawPile = drawPile;
  gameState.drawPileCount = drawPile.length;
  gameState.currentColor = firstCard.color;
  gameState.currentPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)].id;
  gameState.status = "playing";
  gameState.gameStartTime = Date.now();
  gameState.winner = null;
  gameState.direction = 1;
  gameState.hasDrawnThisTurn = false;
  gameState.rematchRequestedBy = null;
  gameState.rematchConfirmedBy = [];

  gameState.log = [{
    id: uuidv4(),
    message: `Rematch started by ${initiatorPlayer.name}! First card: ${firstCard.color} ${firstCard.type === 'number' ? firstCard.value : firstCard.type}. ${gameState.players.find((p: Player)=>p.id === gameState.currentPlayer)?.name}'s turn.`,
    timestamp: Date.now(),
    player: initiatorPlayer.name,
    avatarIndex: initiatorPlayer.avatarIndex,
    eventType: 'system',
    cardType: firstCard.type,
    cardValue: firstCard.type === 'number' ? firstCard.value : undefined,
    cardColor: firstCard.color
  }];

  console.log(`Rematch successful for room ${roomId}. Current player: ${gameState.currentPlayer}`);
  await updateGameState(roomId, gameState);

  const newLogs = gameState.log;
  await broadcastUpdate(roomId, gameState, newLogs);

  return gameState;
}
