"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player } from "./types"
import { pusherServer } from "@/lib/pusher-server"
import { storeGameState, getGameState, updateGameState, deleteRoom as dbDeleteRoom, getAllRooms as dbGetAllRooms } from "./db-actions"
import { stripFunctionsFromGameState } from "./utils"

// Function to generate a room code (e.g., 4 uppercase letters)
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create a new game room - Accepts host player object and optional winning score
export async function createRoom(
  hostPlayerInput: { id: string; name: string; avatarIndex: number },
  winningScore: number = 500 // Default to 500 if not provided
): Promise<{ roomId: string; playerId: string }> {
  console.log("[createRoom] Received input:", hostPlayerInput, "Winning Score:", winningScore);
  const roomId = generateRoomCode()

  // Create Player object directly from input
  const hostPlayer: Player = {
    id: hostPlayerInput.id,
    name: hostPlayerInput.name, 
    cards: [],
    isHost: true,
    avatarIndex: hostPlayerInput.avatarIndex,
  }
  console.log("[createRoom] Created hostPlayer object:", hostPlayer);

  const gameState: Partial<GameState> = {
    roomId,
    status: "waiting",
    players: [hostPlayer],
    currentPlayer: "",
    direction: 1,
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red",
    winner: null,
    log: [{ 
      id: uuidv4(),
      message: `Room ${roomId} created by ${hostPlayer.name}`,
      timestamp: Date.now(),
      player: hostPlayer.name,
      eventType: 'system'
    }], 
    winningScore: winningScore, // Set the winning score 
  }

  await storeGameState(roomId, gameState)
  console.log(`[createRoom] Stored initial GameState for room ${roomId}`);
  return { roomId, playerId: hostPlayer.id } 
}

// Join an existing game room - Accepts joining player object and optional winning score for DEFAULT room
export async function joinRoom(
  roomId: string, 
  joiningPlayerInput: { id: string; name: string; avatarIndex: number },
  winningScore?: number // Optional: Only relevant for DEFAULT room setup
): Promise<string> {
  console.log(`[joinRoom] Received input for room ${roomId}:`, joiningPlayerInput, `Winning Score (if DEFAULT): ${winningScore}`);
  
  let needsUpdate = false; // Flag to check if we need to update the state later
  
  if (roomId === "DEFAULT") {
     const defaultRoomState = await getGameState("DEFAULT")
     if (!defaultRoomState) {
       console.log("[joinRoom] Default room doesn't exist, creating...");
       // createDefaultRoom already sets the winning score
       await createDefaultRoom() 
       needsUpdate = true; // Needs update after player is added
     }
  }

  let gameState = await getGameState(roomId)
  if (!gameState) {
    throw new Error("Room not found")
  }

  // Logic for resetting DEFAULT room or setting winning score on first join
  if (roomId === "DEFAULT") {
      if (gameState.status !== "waiting") {
          console.log("[joinRoom] Default room is active, resetting...")
          await resetRoom(roomId) // Reset first
          gameState = (await getGameState(roomId))!; // Re-fetch state after reset
          if (!gameState) throw new Error("Failed to reset/fetch default room");
          // Set the winning score provided by the joining player after reset
          gameState.winningScore = winningScore || 500; 
          needsUpdate = true;
      } else if (gameState.players.length === 0 && winningScore) {
          // If room is waiting and empty, set the winning score provided by the first player
          console.log(`[joinRoom] Default room is empty, setting winning score to ${winningScore}`);
          gameState.winningScore = winningScore;
          needsUpdate = true;
      } else if (!gameState.winningScore) {
          // Safety: Ensure default room always has a winning score
          console.warn("[joinRoom] Default room state missing winningScore, setting default (500).");
          gameState.winningScore = 500;
          needsUpdate = true;
      }
  } 
  // Logic for non-DEFAULT rooms (unchanged)
  else if (gameState.status !== "waiting") {
    const isExistingPlayer = gameState.players.some(p => p.id === joiningPlayerInput.id);
    if (!isExistingPlayer) {
      throw new Error("Game has already started")
    }
  }

  if (gameState.players.length >= 4) {
    throw new Error("Room is full")
  }

  // Check if player already exists by ID
  if (gameState.players.some(p => p.id === joiningPlayerInput.id)) {
    console.warn(`[joinRoom] Player ${joiningPlayerInput.id} already in room ${roomId}.`);
    return joiningPlayerInput.id; 
  }

  // Create the Player object directly from input
  const player: Player = {
    id: joiningPlayerInput.id,
    name: joiningPlayerInput.name,
    cards: [],
    isHost: gameState.players.length === 0, 
    avatarIndex: joiningPlayerInput.avatarIndex,
  }
  console.log("[joinRoom] Created joining player object:", player);

  gameState.players.push(player)
  gameState.log.push({ 
      id: uuidv4(),
      message: `${player.name} joined the room.`,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatarIndex,
      eventType: 'join'
  });

  // Perform the update only if needed (avoids unnecessary writes)
  if (needsUpdate || !gameState.players.some(p => p.id === joiningPlayerInput.id)) { // Also update if player wasn't already present
    await updateGameState(roomId, gameState)
    console.log(`[joinRoom] Updated GameState in DB for room ${roomId} (Update needed: ${needsUpdate}).`);
  } else {
    console.log(`[joinRoom] No state update needed for room ${roomId}.`);
  }

  // Log the state *before* stripping and triggering Pusher
  console.log("[joinRoom] GameState BEFORE stripping:", JSON.stringify(gameState, null, 2));
  
  const strippedState = stripFunctionsFromGameState(gameState);
  console.log("[joinRoom] GameState AFTER stripping (for Pusher):", JSON.stringify(strippedState, null, 2));
  
  await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
  console.log(`[joinRoom] Triggered Pusher update for room ${roomId}.`);
  return player.id
}

// Create a default public room if it doesn't exist
export async function createDefaultRoom(): Promise<void> {
  const DEFAULT_ROOM_ID = "DEFAULT"
  const DEFAULT_WINNING_SCORE = 500;
  const existingRoom = await getGameState(DEFAULT_ROOM_ID)
  if (existingRoom) {
    console.log("Default room already exists")
    return
  }

  const gameState: Partial<GameState> = {
    roomId: DEFAULT_ROOM_ID,
    status: "waiting",
    players: [],
    currentPlayer: "",
    direction: 1,
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red",
    winner: null,
    log: [], // Initialize log array
    winningScore: DEFAULT_WINNING_SCORE, // Set default winning score
  }

  await storeGameState(DEFAULT_ROOM_ID, gameState)
  console.log("Created default public room")
}

// Reset a room to its initial waiting state, preserving players for a rematch
export const resetRoom = async (roomId: string) => {
  const currentGameState = await getGameState(roomId);
  if (!currentGameState && roomId !== "DEFAULT") {
    throw new Error(`Room ${roomId} not found`);
  }

  if (roomId === "DEFAULT") {
    // Explicitly set all fields for a clean reset
    const newState: GameState = {
      roomId: "DEFAULT",
      status: "waiting", // Ensure status is waiting
      players: [], // Clear players
      currentPlayer: "", // Clear current player
      direction: 1,
      drawPile: [], // Initialize drawPile as empty
      discardPile: [], // Clear discard pile
      currentColor: "red", // Default color
      winner: null, // Clear winner
      drawPileCount: 0, // Set drawPileCount to 0
      log: [], // Clear log
      gameStartTime: undefined, // Clear game start time
      drawCardEffect: undefined,
      hasDrawnThisTurn: false,
      matchHistory: [], // Clear match history as well for a full reset
      isDrawing: false,
      rematchRequestedBy: null,
      rematchConfirmedBy: [],
      winningScore: 500, // Reset default room winning score
    };
    await updateGameState("DEFAULT", newState);
  } else {
    // Logic for resetting non-DEFAULT rooms
    if (currentGameState) { // Added check to ensure currentGameState exists
      // TEMPORARY: Reset non-default rooms similarly until createInitialGameState is found/fixed
      const initialNonDefaultState: GameState = {
        ...currentGameState, // Keep existing players, roomId, etc.
        status: "waiting",
        currentPlayer: "",
        direction: 1,
        drawPile: [], // Reset deck
        discardPile: [],
        currentColor: "red",
        winner: null,
        drawPileCount: 0,
        log: currentGameState.log.filter(l => l.eventType === 'join' || l.eventType === 'system'), // Keep join/system logs?
        gameStartTime: undefined,
        drawCardEffect: undefined,
        hasDrawnThisTurn: false,
        isDrawing: false,
        rematchRequestedBy: null,
        rematchConfirmedBy: [],
        // Keep matchHistory for non-default rooms unless specifically cleared
        // Reset winningScore if necessary or keep it?
        // Keeping existing winningScore for non-default rooms on reset
        // winningScore: currentGameState?.winningScore // Keep existing score
      };
      await updateGameState(roomId, initialNonDefaultState);
      console.warn(`[resetRoom] Non-DEFAULT room ${roomId} reset using temporary logic due to missing createInitialGameState.`);
    }
  }

  // Trigger update after reset for both cases
  const finalState = await getGameState(roomId);
  if (finalState) {
    const strippedState = stripFunctionsFromGameState(finalState);
    await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
    console.log(`[resetRoom] Triggered Pusher update for room ${roomId} after reset.`);
  }
};

// Get game state for a room
export async function getRoom(roomId: string): Promise<GameState | null> {
  const gameState = await getGameState(roomId)
  // Ensure default room always has a winning score if fetched
  if (roomId === 'DEFAULT' && gameState && gameState.winningScore === undefined) {
    console.warn("[getRoom] Default room fetched without winningScore. Setting default (500).");
    gameState.winningScore = 500;
    // Optionally update the stored state here too, though it should have been set on creation/reset
    // await updateGameState(roomId, gameState); 
  }
  return gameState;
}

// Get all room states
export async function getAllRooms(): Promise<GameState[]> {
  return await dbGetAllRooms()
}

// Delete a room
export async function deleteRoom(roomId: string): Promise<void> {
    if (roomId === "DEFAULT") {
        console.warn("Attempted to delete the default room. Operation skipped.")
        return // Do not delete the default room
    }
    await dbDeleteRoom(roomId)
    await pusherServer.trigger(`lobby`, "room-deleted", { roomId })
    console.log(`Deleted room ${roomId}`)
}

// Clear only the match history for a specific room
export async function clearMatchHistory(roomId: string): Promise<void> {
  console.log(`Clearing match history for room: ${roomId}`)
  const gameState = await getGameState(roomId);

  if (!gameState) {
    console.warn(`Cannot clear history: Room ${roomId} not found.`);
    // Optionally throw an error or just return if room doesn't exist
    // throw new Error(`Room ${roomId} not found`); 
    return; 
  }

  // Clear the match history array
  gameState.matchHistory = [];

  // Save the updated state
  await storeGameState(roomId, gameState); // Using storeGameState to overwrite

  // Optionally trigger a specific event if clients need to know history cleared,
  // but likely not necessary as it's an admin action.
  // await pusherServer.trigger(`game-${roomId}`, "history-cleared", {}); 

  console.log(`Match history cleared for room ${roomId}.`);
} 