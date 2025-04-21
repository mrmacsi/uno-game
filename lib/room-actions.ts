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

// Create a new game room - Accepts host player object
export async function createRoom(hostPlayerInput: { id: string; name: string; avatar_index: number }): Promise<{ roomId: string; playerId: string }> {
  console.log("[createRoom] Received input:", hostPlayerInput);
  const roomId = generateRoomCode()

  // Create Player object directly from input
  const hostPlayer: Player = {
    id: hostPlayerInput.id,
    name: hostPlayerInput.name, 
    cards: [],
    isHost: true,
    avatar_index: hostPlayerInput.avatar_index, 
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
  }

  await storeGameState(roomId, gameState)
  console.log(`[createRoom] Stored initial GameState for room ${roomId}`);
  return { roomId, playerId: hostPlayer.id } 
}

// Join an existing game room - Accepts joining player object
export async function joinRoom(roomId: string, joiningPlayerInput: { id: string; name: string; avatar_index: number }): Promise<string> {
  console.log(`[joinRoom] Received input for room ${roomId}:`, joiningPlayerInput);
  if (roomId === "DEFAULT") {
     // ... (handle default room creation/reset) ...
     const defaultRoomExists = await getGameState("DEFAULT")
     if (!defaultRoomExists) {
       await createDefaultRoom()
     }
  }

  let gameState = await getGameState(roomId)
  if (!gameState) {
    throw new Error("Room not found")
  }

  if (roomId === "DEFAULT" && gameState.status !== "waiting") {
     // ... (reset default room if needed) ...
     await resetRoom(roomId) 
     gameState = (await getGameState(roomId))!; // Re-fetch state after reset
     if (!gameState) throw new Error("Failed to reset/fetch default room");
  } else if (gameState.status !== "waiting") {
    throw new Error("Game has already started")
  }

  // Check if player already exists by ID
  if (gameState.players.some(p => p.id === joiningPlayerInput.id)) {
    console.warn(`[joinRoom] Player ${joiningPlayerInput.id} already in room ${roomId}.`);
    return joiningPlayerInput.id; 
  }

  if (gameState.players.length >= 4) {
    throw new Error("Room is full")
  }

  // Create the Player object directly from input
  const player: Player = {
    id: joiningPlayerInput.id,
    name: joiningPlayerInput.name,
    cards: [],
    isHost: gameState.players.length === 0, 
    avatar_index: joiningPlayerInput.avatar_index,
  }
  console.log("[joinRoom] Created joining player object:", player);

  gameState.players.push(player)
  gameState.log.push({ 
      id: uuidv4(),
      message: `${player.name} joined the room.`,
      timestamp: Date.now(),
      player: player.name,
      eventType: 'join'
  });

  await updateGameState(roomId, gameState)
  console.log(`[joinRoom] Updated GameState in DB for room ${roomId}.`);

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
  }

  await storeGameState(DEFAULT_ROOM_ID, gameState)
  console.log("Created default public room")
}

// Reset a room to its initial waiting state, preserving players for a rematch
export async function resetRoom(roomId: string): Promise<void> {
  console.log(`Initiating rematch reset for room: ${roomId}`)
  const currentGameState = await getGameState(roomId);
  if (!currentGameState) {
    console.warn(`Cannot reset: Room ${roomId} not found.`);
    throw new Error(`Room ${roomId} not found, cannot start rematch.`);
  }
  if (roomId === "DEFAULT") {
    const newState: GameState = {
      ...currentGameState,
      status: "waiting",
      players: [],
      currentPlayer: "",
      direction: 1,
      drawPile: [],
      drawPileCount: 0,
      discardPile: [],
      currentColor: "red",
      winner: null,
      drawCardEffect: undefined,
      hasDrawnThisTurn: undefined,
      log: [],
      matchHistory: [],
    };
    await storeGameState(roomId, newState);
    await pusherServer.trigger(`game-${roomId}`, "game-reset", { message: "Room fully reset and emptied." });
    await new Promise(resolve => setTimeout(resolve, 50));
    await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(newState));
    console.log(`Room ${roomId} fully reset and emptied.`);
    return;
  }
  const newState: GameState = {
    ...currentGameState,
    status: "waiting",
    players: currentGameState.players.map(player => ({
      ...player,
      cards: [],
      saidUno: false
    })),
    currentPlayer: "",
    direction: 1,
    drawPile: [],
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red",
    winner: null,
    drawCardEffect: undefined,
    hasDrawnThisTurn: undefined,
    log: [{
      id: uuidv4(),
      message: `Rematch initiated! Waiting for host to start...`,
      timestamp: Date.now(),
      eventType: 'system'
    }],
  };
  if (newState.players.length === 0) {
    console.error(`Room ${roomId} was found but had no players during reset. Aborting reset.`);
    throw new Error("Cannot reset room with no players.");
  }
  await storeGameState(roomId, newState);
  await pusherServer.trigger(`game-${roomId}`, "game-reset", { message: "Rematch starting! Players kept." });
  await new Promise(resolve => setTimeout(resolve, 50));
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(newState));
  console.log(`Room ${roomId} reset for rematch successfully. Status: ${newState.status}, Players: ${newState.players.length}`);
}

// Get game state for a room
export async function getRoom(roomId: string): Promise<GameState | null> {
  return await getGameState(roomId)
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