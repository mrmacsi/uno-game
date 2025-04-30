"use server"

import { redis } from "./db" // Import the redis client instance
import type { GameState } from "./types"
import { initializeGameState } from "./db" // Import the initializer

const ROOM_PREFIX = "room:"

// Store or overwrite the game state in the database
export async function storeGameState(roomId: string, gameState: Partial<GameState>): Promise<void> {
  await redis.set(`${ROOM_PREFIX}${roomId}`, JSON.stringify(gameState))
}

// Update the game state (assumes state exists)
export async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
  await redis.set(`${ROOM_PREFIX}${roomId}`, JSON.stringify(gameState))
}

// Get the game state from the database
export async function getGameState(roomId: string): Promise<GameState | null> {
  const data = await redis.get(`${ROOM_PREFIX}${roomId}`)
  if (!data) return null
  
  let parsedData;
  try {
    parsedData = JSON.parse(data);
  } catch (error) {
    console.error(`[getGameState] Failed to parse JSON for room ${roomId}:`, error, data);
    return null; // Return null if parsing fails
  }

  // Pass the parsed data to initializeGameState which should handle potential missing fields like gameStartTime
  return initializeGameState(parsedData);
}

// Get all room keys (Export this)
export async function dbKeys(): Promise<string[]> { 
  return await redis.keys(`${ROOM_PREFIX}*`)
}

// Get all room states
export async function getAllRooms(): Promise<GameState[]> {
    const keys = await dbKeys();
    // Don't filter out DEFAULT room key here; let the status filter handle visibility.
    // const filteredKeys = keys.filter(key => key !== `${ROOM_PREFIX}DEFAULT`);
    if (keys.length === 0) return []; // Return early if no keys at all

    // Use mGet (multi-get) for efficiency, fetching all rooms including DEFAULT
    const roomsData = await redis.mGet(keys);
    
    const rooms = roomsData
        // Add type annotation for the data parameter in map
        .map((data: string | null) => { 
            if (!data) return null;
            try {
                const room = initializeGameState(JSON.parse(data)) as GameState;
                // Always include DEFAULT room regardless of status, or other rooms that are waiting/playing
                if (room && (room.roomId === "DEFAULT" || room.status === 'waiting' || room.status === 'playing')) {
                    return room;
                }
            } catch (error) {
                console.error("Failed to parse room data:", error, data);
            }
            return null;
        })
        // Explicitly type the filter predicate parameter
        .filter((room: GameState | null): room is GameState => room !== null);

    return rooms;
}

// Delete a room from the database
export async function deleteRoom(roomId: string): Promise<void> {
    if (roomId === "DEFAULT") { // Add check here too for safety
        console.warn("Attempted to delete DEFAULT room via dbDeleteRoom. Skipped.");
        return;
    }
    await redis.del(`${ROOM_PREFIX}${roomId}`)
}

// Function to clear all rooms except DEFAULT
export async function clearDb(): Promise<string[]> {
    const keys = await dbKeys();
    const keysToDelete = keys.filter(key => key !== `${ROOM_PREFIX}DEFAULT`);
    if (keysToDelete.length > 0) {
        await redis.del(keysToDelete);
        console.log(`Cleared ${keysToDelete.length} rooms from DB.`);
    } else {
        console.log("No rooms to clear from DB (excluding DEFAULT).");
    }
    // Also clear DEFAULT room players, matchHistory, and log
    const defaultRoomRaw = await redis.get(`${ROOM_PREFIX}DEFAULT`);
    if (defaultRoomRaw) {
        const defaultRoom = JSON.parse(defaultRoomRaw);
        defaultRoom.players = [];
        defaultRoom.matchHistory = [];
        defaultRoom.log = [];
        await redis.set(`${ROOM_PREFIX}DEFAULT`, JSON.stringify(defaultRoom));
    }
    return keysToDelete;
} 