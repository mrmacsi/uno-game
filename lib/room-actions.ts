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
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10);

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

// Reset a room to its initial waiting state
export async function resetRoom(roomId: string): Promise<void> {
  console.log(`Resetting room: ${roomId}`)
  const initialState: Partial<GameState> = {
    roomId,
    status: "waiting",
    players: [],
    currentPlayer: "",
    direction: 1,
    drawPile: [],
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red",
    winner: null,
    log: [],
    matchHistory: [], // Optionally clear history or handle differently
  }

  const currentRoom = await getGameState(roomId)
  if (currentRoom) {
    // Preserve players if resetting a normal room, clear if it's DEFAULT
    // Or always clear players? Let's clear for simplicity now.
    // initialState.players = roomId === "DEFAULT" ? [] : currentRoom.players.map(p => ({ ...p, cards: [] }));
    initialState.players = [] // Clear players on reset
    initialState.matchHistory = currentRoom.matchHistory // Keep match history
  }
  
  await storeGameState(roomId, initialState) // Use storeGameState to overwrite
  await pusherServer.trigger(`game-${roomId}`, "game-reset", { message: "Room has been reset." })
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(initialState as GameState)) // Send stripped initial state
  console.log(`Room ${roomId} reset successfully.`)
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