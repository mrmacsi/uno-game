"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player } from "./types"
import { pusherServer } from "@/lib/pusher-server"
import { storeGameState, getGameState, updateGameState, deleteRoom as dbDeleteRoom, getAllRooms as dbGetAllRooms } from "./db-actions"
import { stripFunctionsFromGameState } from "./utils"
import { generateRandomName } from "@/lib/name-generator"

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createRoom(hostPlayerInput: { id: string; name: string; avatarIndex: number }): Promise<{ roomId: string; playerId: string }> {
  const roomId = generateRoomCode()

  const hostPlayer: Player = {
    id: hostPlayerInput.id,
    name: hostPlayerInput.name, 
    cards: [],
    isHost: true,
    avatarIndex: hostPlayerInput.avatarIndex,
    isBot: false,
  }

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
  return { roomId, playerId: hostPlayer.id } 
}

export async function joinRoom(roomId: string, joiningPlayerInput: { id: string; name: string; avatarIndex: number }): Promise<string> {
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
  
  const strippedState = stripFunctionsFromGameState(gameState);
  try {
    await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
  } catch (pusherError) {
    console.error("[joinRoom] Pusher trigger failed (non-fatal):", pusherError);
  }
  return player.id
}

export async function addBotToRoom(roomId: string): Promise<GameState | { error: string }> {
  const gameState = await getGameState(roomId);

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

  const botName = `${generateRandomName()} (Bot)`;

  const existingAvatarIndices = gameState.players.map(p => p.avatarIndex);
  const totalAvatarCount = 24; // There are 24 avatars in the avatar-config.ts
  let randomAvatarIndex: number;
  
  let attempts = 0;
  do {
    randomAvatarIndex = Math.floor(Math.random() * totalAvatarCount);
    attempts++;
  } while (existingAvatarIndices.includes(randomAvatarIndex) && attempts < 10);
  
  const botPlayer: Player = {
    id: `bot-${uuidv4()}`,
    name: botName,
    cards: [],
    isHost: false,
    isBot: true,
    avatarIndex: randomAvatarIndex, 
  };

  gameState.players.push(botPlayer);
  gameState.log.push({
    id: uuidv4(),
    message: `${botPlayer.name} joined the room.`,
    timestamp: Date.now(),
    player: botPlayer.name,
    avatarIndex: botPlayer.avatarIndex,
    eventType: 'bot'
  });

  await updateGameState(roomId, gameState);

  const strippedState = stripFunctionsFromGameState(gameState);
  try {
    await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
  } catch (pusherError) {
    console.error("[addBotToRoom] Pusher trigger failed (non-fatal):", pusherError);
  }

  return strippedState;
}

export async function removeBotFromRoom(roomId: string, botId: string): Promise<GameState | { error: string }> {
  const gameState = await getGameState(roomId);

  if (!gameState) {
    console.error(`[removeBotFromRoom] Room ${roomId} not found.`);
    return { error: "Room not found" };
  }

  if (gameState.status !== "waiting") {
    console.warn(`[removeBotFromRoom] Cannot remove bot: Room ${roomId} is not in 'waiting' status.`);
    return { error: "Can only remove bots in a waiting room" };
  }

  const botToRemove = gameState.players.find(p => p.id === botId && p.isBot);

  if (!botToRemove) {
    console.warn(`[removeBotFromRoom] Bot ${botId} not found in room ${roomId}.`);
    return { error: "Bot not found" };
  }

  gameState.players = gameState.players.filter(p => p.id !== botId);
  gameState.log.push({
    id: uuidv4(),
    message: `${botToRemove.name} was removed from the room.`,
    timestamp: Date.now(),
    player: botToRemove.name, 
    eventType: 'leave'
  });

  await updateGameState(roomId, gameState);

  const strippedState = stripFunctionsFromGameState(gameState);
  try {
    await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState);
  } catch (pusherError) {
    console.error("[removeBotFromRoom] Pusher trigger failed (non-fatal):", pusherError);
  }

  return strippedState;
}

export async function createDefaultRoom(): Promise<void> {
  const DEFAULT_ROOM_ID = "DEFAULT"
  const existingRoom = await getGameState(DEFAULT_ROOM_ID)
  if (existingRoom) {
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
        log: currentGameState.log.filter(l => l.eventType === 'join' || l.eventType === 'system' || l.eventType === 'bot'),
        gameStartTime: undefined,
        drawCardEffect: undefined,
        hasDrawnThisTurn: false,
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
}

export async function clearMatchHistory(roomId: string): Promise<void> {
  const gameState = await getGameState(roomId);

  if (!gameState) {
    console.warn(`Cannot clear history: Room ${roomId} not found.`);
    return; 
  }

  gameState.matchHistory = [];
  await storeGameState(roomId, gameState);
}
