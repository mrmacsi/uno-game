"use server"

import type { GameState, Card, CardColor, Player, LogEntry, BotPlayDecision } from "./types" 
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
    currentColor: "black", // Initial color, will be set by first card
    winner: null,
    log: [{
      id: uuidv4(),
      message: `Room ${roomId} created by ${hostName}`,
      timestamp: Date.now(),
      player: hostName,
      avatarIndex: hostAvatarIndex
    }],
    pendingDrawStack: null, // Initialize pendingDrawStack
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
  gameState.pendingDrawStack = null; // Ensure stack is clear at game start
  
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
  console.log("[playCard Action] Received cardDetails:", JSON.stringify(cardDetails), "chosenColor:", chosenColor);

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

  const playerForCard = gameState.players.find((p: Player) => p.id === playerId);
  if (!playerForCard) throw new Error("Player not found when finding card");
  
  if (playerForCard.cards.length === 2 && !playerForCard.saidUno) {
    console.log(`${playerForCard.name} attempted to play second-to-last card without declaring UNO. Turn passed.`);
    gameState.log.push({
      id: uuidv4(),
      message: `${playerForCard.name} forgot to declare UNO! Turn passed.`,
      timestamp: Date.now(),
      player: playerForCard.name,
      avatarIndex: playerForCard.avatarIndex,
      eventType: 'uno_fail'
    });
    
    const currentPlayerIndexVal = gameState.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndexVal = getNextPlayerIndex(gameState, currentPlayerIndexVal);
    gameState.currentPlayer = gameState.players[nextPlayerIndexVal].id;
    gameState.hasDrawnThisTurn = false;
    
    await updateGameState(roomId, gameState);
    
    newLogs = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs);
    
    throw new Error("You must declare UNO before playing your second-to-last card!");
  }

  const cardIndex = playerForCard.cards.findIndex((c: Card) => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error("Card not found in player's hand")
  }
  
  const cardToPlay = { ...playerForCard.cards[cardIndex] }; 

  // Assign chosenColor to the card object itself if it's a wild card.
  if (cardToPlay.type === "wild" || cardToPlay.type === "wild4") {
    if (!chosenColor || chosenColor === "black" || chosenColor === "wild") {
      throw new Error("Must choose a valid color for wild card (Red, Yellow, Green, or Blue).");
    }
    cardToPlay.chosenColor = chosenColor; 
  }
  
  const isValidForPlay = checkPlayValidity(gameState, cardToPlay);
  
  if (!isValidForPlay) {
    // If a stack is active, and the card is not playable on the stack (e.g. different type),
    // this implies the player is "breaking" the stack and will be forced to draw.
    // The card is still "played" (added to discard pile), and then applyCardEffects handles the drawing.
    if (gameState.pendingDrawStack && cardToPlay.type !== gameState.pendingDrawStack.type) {
      console.log(`[playCard Action] Player ${playerId} is breaking an active draw stack with card ${cardToPlay.color} ${cardToPlay.type}. They will draw the stack.`);
      // Allow execution to continue. applyCardEffects will handle the drawing consequence.
    } else {
      // No stack active, or card is of same type as stack but still invalid (e.g. Wild Draw 4 illegal play)
      // This constitutes a truly invalid move.
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      console.error(
        `Invalid Play Attempt: Player ${playerId}, Card ${cardToPlay.color} ${cardToPlay.type} ${cardToPlay.value ?? ''} on Top Card ${topCard?.color} ${topCard?.type} ${topCard?.value ?? ''}, Current Color: ${gameState.currentColor}`
      );
      throw new Error("Invalid card play");
    }
  }
  
  playerForCard.cards.splice(cardIndex, 1);
  gameState.discardPile.push(cardToPlay); 
  
  // gameState.currentColor assignment is now primarily handled within applyCardEffects.
  // The specific log for wild card choice is also now part of applyCardEffects.
  
  if (playerForCard.cards.length === 0) {
    gameState.status = "finished";
    gameState.winner = playerId;
    
    let winLogMessage = `${playerForCard.name} won the game with a ${cardToPlay.color} ${cardToPlay.type}`;
    if (cardToPlay.type === "number" && cardToPlay.value !== undefined) winLogMessage += ` ${cardToPlay.value}`;
    if (cardToPlay.chosenColor) winLogMessage += ` (chosen ${cardToPlay.chosenColor})`;
    winLogMessage += `!`;

    gameState.log.push({ 
      id: uuidv4(), message: winLogMessage, timestamp: Date.now(),
      player: playerForCard.name, avatarIndex: playerForCard.avatarIndex,
      eventType: 'win', cardType: cardToPlay.type, cardValue: cardToPlay.value,
      cardColor: cardToPlay.chosenColor || cardToPlay.color 
    });
    
    calculatePoints(gameState); 
    applyCardEffects(gameState, cardToPlay); 
    
    await updateGameState(roomId, gameState);
    newLogs = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs);
    
    console.log(`Game finished in room ${roomId}. Winner: ${playerId}`);
    return gameState;
  }
  
  if (playerForCard.cards.length === 1 && !playerForCard.saidUno) {
      console.log(`${playerForCard.name} forgot to say UNO!`);
       gameState.log.push({
        id: uuidv4(), message: `${playerForCard.name} forgot to declare UNO!`,
        timestamp: Date.now(), player: playerForCard.name,
        avatarIndex: playerForCard.avatarIndex, eventType: 'uno_fail'
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
  
  const originalLogLength = gameState.log ? gameState.log.length : 0;
  if (!gameState.log) gameState.log = [];

  // --- Handle drawing from pendingDrawStack ---
  if (gameState.pendingDrawStack) {
    console.log(`[drawCard Action] Player ${playerId} is drawing from active stack of ${gameState.pendingDrawStack.count}.`);
    reshuffleIfNeeded(gameState);
    const cardsToDrawCount = gameState.pendingDrawStack.count;
    const drawnCards = gameState.drawPile.splice(0, cardsToDrawCount);
    
    if (!player) throw new Error("Player not found for drawing from stack");
    player.cards.push(...drawnCards);
    
    gameState.log.push({
      id: uuidv4(), eventType: 'draw_stack',
      message: `${player.name} drew ${cardsToDrawCount} cards from the stack.`,
      timestamp: Date.now(), player: player.name, avatarIndex: player.avatarIndex
    });
    
    gameState.drawCardEffect = { playerId: player.id, count: cardsToDrawCount };
    gameState.pendingDrawStack = null; // Clear the stack

    // Turn moves to the next player
    const currentPlayerIndexVal = gameState.players.findIndex((p) => p.id === playerId); 
    const nextPlayerIndexVal = getNextPlayerIndex(gameState, currentPlayerIndexVal);
    gameState.currentPlayer = gameState.players[nextPlayerIndexVal].id;
    gameState.hasDrawnThisTurn = false; // Drawing from stack is not the "one draw per turn"

    await updateGameState(roomId, gameState);
    const newLogsStack = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogsStack);
    return gameState;
  }
  // --- End of handle drawing from pendingDrawStack ---

  if (gameState.hasDrawnThisTurn) {
     throw new Error("Already drew a card this turn");
  }

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
     const currentPlayerIndexVal = gameState.players.findIndex((p: Player) => p.id === playerId);
     const nextPlayerIndexVal = getNextPlayerIndex(gameState, currentPlayerIndexVal);
     gameState.currentPlayer = gameState.players[nextPlayerIndexVal].id;
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

  // Check if the drawn card is playable (considering no active stack here)
  const isDrawnCardPlayable = checkPlayValidity(gameState, drawnCard);

  if (!isDrawnCardPlayable) {
    gameState.log.push({
      id: uuidv4(),
      message: `${player.name} has no playable cards after drawing. Turn passes.`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatarIndex,
      eventType: 'system'
    });
    const currentPlayerIndexVal = gameState.players.findIndex((p: Player) => p.id === playerId);
    const nextPlayerIndexVal = getNextPlayerIndex(gameState, currentPlayerIndexVal);
    gameState.currentPlayer = gameState.players[nextPlayerIndexVal].id;
    gameState.hasDrawnThisTurn = false; // Reset for next player
    
    const nextPlayerToPlay = gameState.players[nextPlayerIndexVal];
    if (nextPlayerToPlay && nextPlayerToPlay.cards.length !== 1) {
        nextPlayerToPlay.saidUno = false;
    }
    
    console.log(`Player ${playerId} drew an unplayable card. Turn automatically passed to ${gameState.currentPlayer}.`);
  } else {
    console.log(`Player ${playerId} drew a card and has playable options.`);
    // Player keeps the turn, hasDrawnThisTurn remains true
  }
  
  gameState.drawPileCount = gameState.drawPile.length;
  await updateGameState(roomId, gameState);
  
  const newLogs_draw = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs_draw);
  
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

  if (player.cards.length !== 2) { // Should be 2 before playing the card that leaves them with 1
    console.warn(`${player.name} tried to declare UNO with ${player.cards.length} cards.`);
    // Potentially add a penalty or just ignore, current behavior is to ignore.
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
  
  // If a draw stack is active, the player cannot "pass" to avoid it; they must draw.
  // This action should ideally be called "acceptStack" or similar from client.
  // For now, if passTurn is called and stack is active, we assume they are drawing the stack.
  if (gameState.pendingDrawStack) {
      console.log(`[passTurn as drawStack] Player ${playerId} is "passing" on an active stack of ${gameState.pendingDrawStack.count}. They will draw.`);
      reshuffleIfNeeded(gameState);
      const cardsToDrawCount = gameState.pendingDrawStack.count;
      const drawnCards = gameState.drawPile.splice(0, cardsToDrawCount);
      player.cards.push(...drawnCards);
      
      const originalLogLength = gameState.log ? gameState.log.length : 0;
      if (!gameState.log) gameState.log = [];
      gameState.log.push({
        id: uuidv4(), eventType: 'draw_stack',
        message: `${player.name} drew ${cardsToDrawCount} cards from the stack (by passing).`,
        timestamp: Date.now(), player: player.name, avatarIndex: player.avatarIndex
      });
      
      gameState.drawCardEffect = { playerId: player.id, count: cardsToDrawCount };
      gameState.pendingDrawStack = null; // Clear the stack

      const currentPlayerIndexVal = gameState.players.findIndex((p) => p.id === playerId);
      const nextPlayerIndexVal = getNextPlayerIndex(gameState, currentPlayerIndexVal);
      gameState.currentPlayer = gameState.players[nextPlayerIndexVal].id;
      gameState.hasDrawnThisTurn = false; // Reset for next player

      await updateGameState(roomId, gameState);
      const newLogsStackPass = gameState.log.slice(originalLogLength);
      await broadcastUpdate(roomId, gameState, newLogsStackPass);
      return gameState;
  }


  // Original pass logic: Only allow pass if player has drawn and cannot play
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
  gameState.drawPileCount = gameState.drawPile.length;
  gameState.currentColor = firstCard.color;
  gameState.currentPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)].id;
  gameState.status = "playing";
  gameState.gameStartTime = Date.now();
  gameState.winner = null;
  gameState.direction = 1;
  gameState.hasDrawnThisTurn = false;
  gameState.pendingDrawStack = null; // Reset stack for rematch
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
