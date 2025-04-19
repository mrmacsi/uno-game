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

// Create a new game room
export async function createRoom(playerName: string): Promise<string> {
  const roomId = generateRoomCode()
  const playerId = uuidv4()

  const player: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    isHost: true,
  }

  const gameState: Partial<GameState> = {
    roomId,
    status: "waiting",
    players: [player],
    currentPlayer: "",
    direction: 1,
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red", // Default color
    winner: null,
  }

  await storeGameState(roomId, gameState)
  console.log(`Created room ${roomId} with player ${playerName}, player ID: ${playerId}`)
  return roomId
}

// Join an existing game room
export async function joinRoom(roomId: string, playerName: string): Promise<string> {
  if (roomId === "DEFAULT") {
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
    await resetRoom(roomId) // Reset the default room if game was ongoing
    const refreshedState = await getGameState(roomId)
    if (!refreshedState) {
      throw new Error("Failed to reset default room")
    }
    gameState = refreshedState
  } else if (gameState.status !== "waiting") {
    throw new Error("Game has already started")
  }

  if (gameState.players.length >= 4) {
    throw new Error("Room is full")
  }

  const playerId = uuidv4()
  const player: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    isHost: gameState.players.length === 0,
  }

  gameState.players.push(player)
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
  return playerId
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