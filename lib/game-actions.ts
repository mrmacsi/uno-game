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
  // Create a copy of the state to modify for broadcasting
  const broadcastState = { ...gameState };

  // Remove the large drawPile array to reduce payload size
  broadcastState.drawPile = []; 

  // Strip any remaining functions
  const strippedState = stripFunctionsFromGameState(broadcastState);
  
  // Construct the state to send *without* the log property
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { log, ...stateToSend } = strippedState;
  
  await new Promise(resolve => setTimeout(resolve, BROADCAST_DELAY_MS));

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 150;
  let attempt = 0;
  let success = false;
  let mainUpdateSuccess = false;

  // Try sending the main game-updated event
  while (attempt < MAX_RETRIES && !success) {
    attempt++;
    try {
       // Send state *without* logs
      await pusherServer.trigger(`game-${roomId}`, "game-updated", stateToSend); // Send state without log
      success = true;
      mainUpdateSuccess = true; // Mark main update as successful
      console.log(`Broadcast 'game-updated' sent for room ${roomId} (log excluded) on attempt ${attempt}. Payload size (approx estimate): ${JSON.stringify(stateToSend).length} bytes`);
    } catch (error) {
      // Log specific errors
      if (error instanceof Error && error.message.includes('413')) {
          console.error("PUSHER PAYLOAD TOO LARGE - Even after removing drawPile and logs. State snapshot:", JSON.stringify(stateToSend).substring(0, 500)); // Log first 500 chars
          break; 
      }
      console.error(`Pusher 'game-updated' trigger attempt ${attempt} failed for room ${roomId}:`, error);
      // Check if it's a retryable error (like ECONNRESET) and if we haven't reached max retries
      const isRetryable = error instanceof Error && typeof (error as { code?: string }) === "object" && (error as { code?: string }).code === 'ECONNRESET';
      if (isRetryable && attempt < MAX_RETRIES) {
          console.log(`Retrying Pusher 'game-updated' trigger for room ${roomId} in ${RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      } else {
          console.error(`Pusher 'game-updated' failed definitively for room ${roomId} after ${attempt} attempts.`);
          break; // Exit the loop
      }
    }
  }
  
  // If the main update succeeded AND there are new logs, send them separately
  if (mainUpdateSuccess && newLogs && newLogs.length > 0) {
    attempt = 0; // Reset retry counter for the new event
    success = false;
    while (attempt < MAX_RETRIES && !success) {
        attempt++;
        try {
            await pusherServer.trigger(`game-${roomId}`, "new-log-entries", { logs: newLogs });
            success = true;
            console.log(`Broadcast 'new-log-entries' sent for room ${roomId} (${newLogs.length} entries) on attempt ${attempt}.`);
        } catch (error) {
            console.error(`Pusher 'new-log-entries' trigger attempt ${attempt} failed for room ${roomId}:`, error);
            // Add similar retry logic if desired for log entries, or just log the failure
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

export async function playCard(roomId: string, playerId: string, cardId: string, chosenColor?: CardColor): Promise<GameState> {
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

  // UNO Check - must be handled before card is played
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
    
    // Pass turn as penalty
    const currentPlayerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex);
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id;
    gameState.hasDrawnThisTurn = false;
    
    await updateGameState(roomId, gameState);
    
    newLogs = gameState.log.slice(originalLogLength);
    await broadcastUpdate(roomId, gameState, newLogs);
    
    throw new Error("You must declare UNO before playing your second-to-last card!");
  }

  const playerIndex = gameState.players.findIndex((p: Player) => p.id === playerId);
  const player = gameState.players[playerIndex];
  const cardIndex = player.cards.findIndex((c: Card) => c.id === cardId);
  const card = player.cards[cardIndex];

  if (!card) {
    throw new Error("Card not in hand");
  }
  if (!checkPlayValidity(gameState, card)) {
    throw new Error("Invalid play");
  }
  if ((card.type === "wild" || card.type === "wild4") && !chosenColor) {
    throw new Error("Must choose a color for wild card");
  }

  player.cards.splice(cardIndex, 1);
  gameState.discardPile.push(card);

  if (card.type === "wild" || card.type === "wild4") {
    gameState.currentColor = chosenColor || "red"; // Default chosenColor to red if somehow undefined
  } else {
    gameState.currentColor = card.color;
  }

  player.saidUno = false;

  gameState.log.push({
    id: uuidv4(),
    message: `${player.name} played a ${gameState.currentColor} ${card.type === 'number' ? card.value : card.type}.`,
    timestamp: Date.now(),
    player: player.name,
    avatarIndex: player.avatarIndex,
    eventType: 'play',
    cardType: card.type,
    cardValue: card.value,
    cardColor: card.color // Store original card color too
  });
  
  // Check for winner (player has no cards left)
  if (player.cards.length === 0) {
    const roundWinner = player;
    calculatePoints(gameState);
    
    gameState.winner = roundWinner.id;
    gameState.status = "finished"; // Set status to finished for the *round*

    // Add round results to match history
    if (!gameState.matchHistory) gameState.matchHistory = [];

    // Get previous total scores to calculate new ones
    const previousTotals: Record<string, number> = {};
    if (gameState.matchHistory.length > 0) {
      const lastMatch = gameState.matchHistory[gameState.matchHistory.length - 1];
      lastMatch.playerResults.forEach(p => {
        previousTotals[p.playerId] = p.totalScore; // Get the last known total score
      });
    }
    
    const newMatchResult = {
        winner: roundWinner.id,
        date: new Date().toISOString(),
        playerResults: gameState.players.map(p => {
            // Read the points possibly updated by calculatePoints directly from player object
            const currentRoundPoints = p.id === roundWinner.id ? (gameState.players.find(wp => wp.id === roundWinner.id)?.points || 0) : 0;
            const calculatedTotalScore = (previousTotals[p.id] || 0) + currentRoundPoints;
            return {
                playerId: p.id,
                playerName: p.name,
                avatar_index: p.avatarIndex,
                points: currentRoundPoints, // Points scored in this round
                totalScore: calculatedTotalScore // Add round points to previous total
            };
        }),
        // Read the total points scored by the winner this round from the winner's updated state
        finalScore: gameState.players.find(wp => wp.id === roundWinner.id)?.points || 0
    };
    gameState.matchHistory.push(newMatchResult);

    // Get the winner's new total score
    const winnerResult = newMatchResult.playerResults.find(p => p.playerId === roundWinner.id);
    const winnerTotalScore = winnerResult ? winnerResult.totalScore : 0;
    const pointsThisRound = winnerResult ? winnerResult.points : 0; // Get points calculated for this round

    gameState.log.push({
      id: uuidv4(),
      message: `${roundWinner.name} won the round with a ${gameState.currentColor} ${card.type === 'number' ? card.value : card.type} and gets ${pointsThisRound} points! Total: ${winnerTotalScore}.`,
      timestamp: Date.now(),
      player: roundWinner.name,
      avatarIndex: roundWinner.avatarIndex,
      eventType: 'win',
      cardType: card.type,
      cardValue: card.value,
      cardColor: card.color
    });

    // Check if the winner reached the overall game winning score
    const winningScoreTarget = gameState.winningScore || 500; // Default to 500 if not set
    if (winnerTotalScore >= winningScoreTarget) {
        gameState.log.push({
            id: uuidv4(),
            message: `${roundWinner.name} reached ${winnerTotalScore} points (target: ${winningScoreTarget}) and wins the game!`,
            timestamp: Date.now(),
            eventType: 'system' // Or a new 'game_over' type
        });
        // Keep status as 'finished' - the GameOver component will interpret this
    } else {
        // If target not met, game continues to next round - status remains 'playing'? NO - game over component handles rematch prompt.
        // Status should remain 'finished' for the round, Game Over screen shows, then Rematch starts new round.
        gameState.log.push({
            id: uuidv4(),
            message: `Round finished. Target score: ${winningScoreTarget}. Starting next round options...`,
            timestamp: Date.now(),
            eventType: 'system'
        });
    }
    
    newLogs = gameState.log.slice(originalLogLength);
    await updateGameState(roomId, gameState);
    await broadcastUpdate(roomId, gameState, newLogs);
    return gameState;
  }

  // Apply effects and move to next player if game not won
  applyCardEffects(gameState, card);
  gameState.currentPlayer = gameState.players[getNextPlayerIndex(gameState, playerIndex)].id;
  gameState.hasDrawnThisTurn = false; // Reset draw flag for the new player

  // Reshuffle if draw pile is low
  reshuffleIfNeeded(gameState);

  gameState.log.push({
    id: uuidv4(),
    message: `Next turn: ${gameState.players.find(p => p.id === gameState.currentPlayer)?.name}`,
    timestamp: Date.now(),
    eventType: 'system'
  });

  newLogs = gameState.log.slice(originalLogLength);
  await updateGameState(roomId, gameState);
  await broadcastUpdate(roomId, gameState, newLogs);

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
  if (!forcePass && !gameState.hasDrawnThisTurn) {
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

  gameState.log.push({
    id: uuidv4(),
    message: `${gameState.players[currentPlayerIndex].name} passed their turn after drawing.`,
    timestamp: Date.now(),
    player: gameState.players[currentPlayerIndex].name,
    avatarIndex: gameState.players[currentPlayerIndex].avatarIndex,
    eventType: 'system'
  });

  await updateGameState(roomId, gameState);

  const newLogs = gameState.log.slice(originalLogLength);
  await broadcastUpdate(roomId, gameState, newLogs);
  
  console.log(`Player ${playerId} passed turn. Next player: ${gameState.currentPlayer}`);
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

// --- Utility / Read Actions ---

// (getRoom action is in room-actions.ts)
