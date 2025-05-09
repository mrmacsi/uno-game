"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player } from "./types"
import { pusherServer } from "@/lib/pusher-server"
import { storeGameState, getGameState, updateGameState, deleteRoom as dbDeleteRoom, getAllRooms as dbGetAllRooms } from "./db-actions"
import { stripFunctionsFromGameState } from "./utils"

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createRoom(hostPlayerInput: { id: string; name: string; avatarIndex: number }): Promise<{ roomId: string; playerId: string }> {
  console.log("[createRoom] Received input:", hostPlayerInput);
  const roomId = generateRoomCode()

  const hostPlayer: Player = {
    id: hostPlayerInput.id,
    name: hostPlayerInput.name, 
    cards: [],
    isHost: true,
    avatarIndex: hostPlayerInput.avatarIndex,
    isBot: false,
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

export async function joinRoom(roomId: string, joiningPlayerInput: { id: string; name: string; avatarIndex: number }): Promise<string> {
  console.log(`[joinRoom] Received input for room ${roomId}:`, joiningPlayerInput);
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
     await resetRoom(roomId) 
     gameState = (await getGameState(roomId))!;
     if (!gameState) throw new Error("Failed to reset/fetch default room");
  } else if (gameState.status !== "waiting") {
    const isExistingPlayer = gameState.players.some(p => p.id === joiningPlayerInput.id);
    if (!isExistingPlayer) {
      throw new Error("Game has already started")
    }
  }

  if (gameState.players.length >= 4) {
    throw new Error("Room is full")
  }

  if (gameState.players.some(p => p.id === joiningPlayerInput.id)) {
    console.warn(`[joinRoom] Player ${joiningPlayerInput.id} already in room ${roomId}.`);
    return joiningPlayerInput.id; 
  }

  const player: Player = {
    id: joiningPlayerInput.id,
    name: joiningPlayerInput.name,
    cards: [],
    isHost: gameState.players.length === 0, 
    avatarIndex: joiningPlayerInput.avatarIndex,
    isBot: false,
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

  await updateGameState(roomId, gameState)
  console.log(`[joinRoom] Updated GameState in DB for room ${roomId}.`);

  console.log("[joinRoom] GameState BEFORE stripping:", JSON.stringify(gameState, null, 2));
  
  const strippedState = stripFunctionsFromGameState(gameState);
  console.log("[joinRoom] GameState AFTER stripping (for Pusher):", JSON.stringify(strippedState, null, 2));
  
  await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
  console.log(`[joinRoom] Triggered Pusher update for room ${roomId}.`);
  return player.id
}

export async function addBotToRoom(roomId: string): Promise<GameState | { error: string }> {
  console.log(`[addBotToRoom] Attempting to add bot to room ${roomId}`);
  let gameState = await getGameState(roomId);

  if (!gameState) {
    console.error(`[addBotToRoom] Room ${roomId} not found.`);
    return { error: "Room not found" };
  }

  if (gameState.status !== "waiting") {
    console.warn(`[addBotToRoom] Cannot add bot: Room ${roomId} is not in 'waiting' status.`);
    return { error: "Game has already started or ended" };
  }

  if (gameState.players.length >= 4) {
    console.warn(`[addBotToRoom] Cannot add bot: Room ${roomId} is full.`);
    return { error: "Room is full" };
  }

  let botNumber = 1;
  while (gameState.players.some(p => p.name === `Bot ${botNumber}` || p.id === `bot-${botNumber}`)) {
    botNumber++;
  }

  const existingAvatarIndices = gameState.players.map(p => p.avatarIndex);
  let nextAvatarIndex = 0;
  while(existingAvatarIndices.includes(nextAvatarIndex)){
    nextAvatarIndex = (nextAvatarIndex + 1) % 12; // Assuming 12 avatars 0-11
  }
  
  const botPlayer: Player = {
    id: `bot-${uuidv4()}`,
    name: `Bot ${botNumber}`,
    cards: [],
    isHost: false,
    isBot: true,
    avatarIndex: nextAvatarIndex, 
  };

  gameState.players.push(botPlayer);
  gameState.log.push({
    id: uuidv4(),
    message: `${botPlayer.name} (Bot) joined the room.`,
    timestamp: Date.now(),
    player: botPlayer.name,
    avatarIndex: botPlayer.avatarIndex,
    eventType: 'join_bot'
  });

  await updateGameState(roomId, gameState);
  console.log(`[addBotToRoom] Bot ${botPlayer.name} added to room ${roomId}.`);

  const strippedState = stripFunctionsFromGameState(gameState);
  await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
  console.log(`[addBotToRoom] Triggered Pusher update for room ${roomId}.`);

  return strippedState;
}

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
    log: [],
  }

  await storeGameState(DEFAULT_ROOM_ID, gameState)
  console.log("Created default public room")
}

export const resetRoom = async (roomId: string) => {
  const currentGameState = await getGameState(roomId);
  if (!currentGameState && roomId !== "DEFAULT") {
    throw new Error(`Room ${roomId} not found`);
  }

  if (roomId === "DEFAULT") {
    const newState: GameState = {
      roomId: "DEFAULT",
      status: "waiting", 
      players: [], 
      currentPlayer: "", 
      direction: 1,
      drawPile: [], 
      discardPile: [], 
      currentColor: "red", 
      winner: null, 
      drawPileCount: 0, 
      log: [], 
      gameStartTime: undefined, 
      drawCardEffect: undefined,
      hasDrawnThisTurn: false,
      matchHistory: [], 
      isDrawing: false,
      rematchRequestedBy: null,
      rematchConfirmedBy: []
    };
    await updateGameState("DEFAULT", newState);
  } else {
    if (currentGameState) { 
      const initialNonDefaultState: GameState = {
        ...currentGameState, 
        status: "waiting",
        currentPlayer: "",
        direction: 1,
        drawPile: [], 
        discardPile: [],
        currentColor: "red",
        winner: null,
        drawPileCount: 0,
        log: currentGameState.log.filter(l => l.eventType === 'join' || l.eventType === 'system' || l.eventType === 'join_bot'),
        gameStartTime: undefined,
        drawCardEffect: undefined,
        hasDrawnThisTurn: false,
        isDrawing: false,
        rematchRequestedBy: null,
        rematchConfirmedBy: []
      };
      await updateGameState(roomId, initialNonDefaultState);
      console.warn(`[resetRoom] Non-DEFAULT room ${roomId} reset using temporary logic due to missing createInitialGameState.`);
    }
  }

  const finalState = await getGameState(roomId);
  if (finalState) {
    const strippedState = stripFunctionsFromGameState(finalState);
    await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
    console.log(`[resetRoom] Triggered Pusher update for room ${roomId} after reset.`);
  }
};

export async function getRoom(roomId: string): Promise<GameState | null> {
  return await getGameState(roomId)
}

export async function getAllRooms(): Promise<GameState[]> {
  return await dbGetAllRooms()
}

export async function deleteRoom(roomId: string): Promise<void> {
    if (roomId === "DEFAULT") {
        console.warn("Attempted to delete the default room. Operation skipped.")
        return
    }
    await dbDeleteRoom(roomId)
    await pusherServer.trigger(`lobby`, "room-deleted", { roomId })
    console.log(`Deleted room ${roomId}`)
}

export async function clearMatchHistory(roomId: string): Promise<void> {
  console.log(`Clearing match history for room: ${roomId}`)
  const gameState = await getGameState(roomId);

  if (!gameState) {
    console.warn(`Cannot clear history: Room ${roomId} not found.`);
    return; 
  }

  gameState.matchHistory = [];

  await storeGameState(roomId, gameState);

  console.log(`Match history cleared for room ${roomId}.`);
}
