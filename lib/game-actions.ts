"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player, Card, CardColor } from "./types"
import { pusherServer } from "./pusher-server"
import * as fs from "fs"
import * as path from "path"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { nanoid } from "nanoid"
import { storeGameState, updateGameState, getGameState, gameStates } from "./db"

// Create a new game room
export async function createRoom(playerName: string): Promise<string> {
  const roomId = generateRoomCode()
  const playerId = uuidv4()

  // Create a new player
  const player: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    isHost: true,
  }

  // Create initial game state
  const gameState: Partial<GameState> = {
    roomId,
    status: "waiting",
    players: [player],
    currentPlayer: "",
    direction: 1,
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red",
    winner: null,
  }

  // Store the game state in the database
  await storeGameState(roomId, gameState)

  // Don't attempt to access localStorage from server component
  // The client will handle setting the player ID in localStorage

  console.log(`Created room ${roomId} with player ${playerName}, player ID: ${playerId}`)
  
  // Return both roomId and playerId to the client
  return roomId
}

// Join an existing game room
export async function joinRoom(roomId: string, playerName: string): Promise<string> {
  // Create default room if it doesn't exist
  if (roomId === "DEFAULT" && !gameStates["DEFAULT"]) {
    await createDefaultRoom()
  }
  
  // Get the current game state
  let gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  // For DEFAULT room, reset it if it's not in waiting state
  if (roomId === "DEFAULT" && gameState.status !== "waiting") {
    await resetRoom(roomId)
    // Get the fresh game state after reset
    const refreshedState = await getGameState(roomId)
    if (!refreshedState) {
      throw new Error("Failed to reset room")
    }
    gameState = refreshedState
  } else if (gameState.status !== "waiting") {
    throw new Error("Game has already started")
  }

  if (gameState.players.length >= 4) {
    throw new Error("Room is full")
  }

  // Create a new player
  const playerId = uuidv4()
  const player: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    isHost: gameState.players.length === 0, // Make first player the host
  }

  // Add the player to the game state
  gameState.players.push(player)

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Don't attempt to set localStorage from server component
  // Return playerId to be set on client side

  // Notify other players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
  
  return playerId
}

// Create a default public room that's always available
export async function createDefaultRoom(): Promise<void> {
  const DEFAULT_ROOM_ID = "DEFAULT"
  
  // Check if default room already exists
  if (gameStates[DEFAULT_ROOM_ID]) {
    console.log("Default room already exists")
    return
  }
  
  // Create the default room
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
  
  // Store the game state
  await storeGameState(DEFAULT_ROOM_ID, gameState)
  
  console.log("Created default public room")
}

// Start the game
export async function startGame(roomId: string): Promise<void> {
  // Get the current game state
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  if (gameState.status !== "waiting") {
    throw new Error("Game has already started")
  }

  if (gameState.players.length < 2) {
    throw new Error("Not enough players")
  }

  // Initialize the game
  const { drawPile, hands } = dealCards(gameState.players.length)

  // Assign cards to players
  gameState.players.forEach((player, index) => {
    player.cards = hands[index]
  })

  // Set the first card in the discard pile
  let firstCard = drawPile.pop()

  // Make sure the first card is a number card
  while (firstCard && firstCard.type !== "number") {
    drawPile.unshift(firstCard)
    firstCard = drawPile.pop()
  }

  if (!firstCard) {
    throw new Error("Failed to initialize game")
  }

  gameState.discardPile = [firstCard]
  gameState.drawPileCount = drawPile.length
  gameState.currentColor = firstCard.color
  gameState.currentPlayer = gameState.players[0].id
  gameState.status = "playing"

  // Add the isValidPlay function
  gameState.isValidPlay = function (card: Card) {
    const topCard = this.discardPile[this.discardPile.length - 1]

    // Wild cards can always be played
    if (card.type === "wild" || card.type === "wild4") {
      return true
    }

    // Cards must match color or value/type
    return (
      card.color === this.currentColor ||
      card.type === topCard.type ||
      (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
    )
  }

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
}

// Play a card
export async function playCard(roomId: string, playerId: string, cardId: string): Promise<void> {
  // Get the current game state
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not in progress")
  }

  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn")
  }

  // Find the player
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) {
    throw new Error("Player not found")
  }

  // Find the card
  const cardIndex = gameState.players[playerIndex].cards.findIndex((c) => c.id === cardId)
  if (cardIndex === -1) {
    throw new Error("Card not found")
  }

  const card = gameState.players[playerIndex].cards[cardIndex]

  // Check if the card can be played
  if (!gameState.isValidPlay(card)) {
    throw new Error("Invalid card")
  }

  // Remove the card from the player's hand
  gameState.players[playerIndex].cards.splice(cardIndex, 1)

  // Add the card to the discard pile
  gameState.discardPile.push(card)

  // Update the current color if it's a wild card
  if (card.type === "wild" || card.type === "wild4") {
    // For simplicity, we'll just pick the first non-wild color
    const colors: ("red" | "blue" | "green" | "yellow")[] = ["red", "blue", "green", "yellow"]
    gameState.currentColor = colors[Math.floor(Math.random() * colors.length)]
  } else {
    gameState.currentColor = card.color
  }

  // Check if the player has won
  if (gameState.players[playerIndex].cards.length === 0) {
    gameState.status = "finished"
    gameState.winner = playerId
  } else {
    // Apply card effects
    applyCardEffects(gameState, card)

    // Move to the next player
    const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
    gameState.currentPlayer = gameState.players[nextPlayerIndex].id
  }

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
}

// Draw a card
export async function drawCard(roomId: string, playerId: string): Promise<void> {
  // Get the current game state
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not in progress")
  }

  if (gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn")
  }

  // Find the player
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) {
    throw new Error("Player not found")
  }

  // Draw a card
  const newCard = drawCardFromPile()
  gameState.players[playerIndex].cards.push(newCard)
  gameState.drawPileCount--

  // Move to the next player
  const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
}

// Say UNO
export async function sayUno(roomId: string, playerId: string): Promise<void> {
  // Get the current game state
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not in progress")
  }

  // Find the player
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) {
    throw new Error("Player not found")
  }

  // This would be more complex in a real game, adding penalties, etc.
  // For this example, we're just saying UNO without consequences

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
}

// Get room data
export async function getRoom(roomId: string): Promise<GameState> {
  const room = await getGameState(roomId)
  if (!room) {
    redirect("/join-room")
  }

  // If isValidPlay exists, create a serializable version without it
  let serializableGameState: GameState;
  
  if (typeof room.isValidPlay === 'function') {
    const { isValidPlay, ...rest } = room;
    serializableGameState = rest as GameState;
  } else {
    serializableGameState = room;
  }

  return serializableGameState
}

// Helper functions

// Generate a random room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function dealCards(numPlayers: number) {
  const deck = createDeck()
  shuffle(deck)

  // Initialize hands
  const hands: Card[][] = Array(numPlayers)
    .fill(null)
    .map(() => [])

  // Deal 7 cards to each player
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < numPlayers; j++) {
      hands[j].push(deck.pop()!)
    }
  }

  return {
    drawPile: deck,
    hands,
  }
}

function createDeck(): Card[] {
  const deck: Card[] = []
  const colors: CardColor[] = ["red", "blue", "green", "yellow"]

  // Add number cards
  for (const color of colors) {
    // 0 cards - one per color
    deck.push({
      id: uuidv4(),
      type: "number",
      color,
      value: 0,
    })

    // 1-9 cards - two per color
    for (let i = 1; i <= 9; i++) {
      for (let j = 0; j < 2; j++) {
        deck.push({
          id: uuidv4(),
          type: "number",
          color,
          value: i,
        })
      }
    }

    // Skip cards - two per color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: uuidv4(),
        type: "skip",
        color,
      })
    }

    // Reverse cards - two per color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: uuidv4(),
        type: "reverse",
        color,
      })
    }

    // Draw Two cards - two per color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: uuidv4(),
        type: "draw2",
        color,
      })
    }
  }

  // Wild cards - 4
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: uuidv4(),
      type: "wild",
      color: "black",
    })
  }

  // Wild Draw Four cards - 4
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: uuidv4(),
      type: "wild4",
      color: "black",
    })
  }

  return deck
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

function drawCardFromPile(): Card {
  // In a real game, we would draw from the actual pile
  // For this simplified example, we'll just create a new random card
  const colors: CardColor[] = ["red", "blue", "green", "yellow"]
  const types = ["number", "skip", "reverse", "draw2", "wild", "wild4"]
  const type = types[Math.floor(Math.random() * types.length)] as
    | "number"
    | "skip"
    | "reverse"
    | "draw2"
    | "wild"
    | "wild4"

  if (type === "wild" || type === "wild4") {
    return {
      id: uuidv4(),
      type,
      color: "black",
    }
  } else if (type === "number") {
    return {
      id: uuidv4(),
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
      value: Math.floor(Math.random() * 10),
    }
  } else {
    return {
      id: uuidv4(),
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  }
}

function applyCardEffects(gameState: GameState, card: Card): void {
  switch (card.type) {
    case "skip":
      // No action needed, the next player's turn will be skipped
      // by moving the current player forward by 2
      gameState.currentPlayer =
        gameState.players[
          getNextPlayerIndex(
            gameState,
            getNextPlayerIndex(
              gameState,
              gameState.players.findIndex((p) => p.id === gameState.currentPlayer),
            ),
          )
        ].id
      break

    case "reverse":
      // Reverse the direction of play
      gameState.direction *= -1
      break

    case "draw2":
      // Next player draws 2 cards and loses their turn
      const nextPlayer = getNextPlayerIndex(
        gameState,
        gameState.players.findIndex((p) => p.id === gameState.currentPlayer),
      )
      for (let i = 0; i < 2; i++) {
        gameState.players[nextPlayer].cards.push(drawCardFromPile())
        gameState.drawPileCount--
      }
      break

    case "wild4":
      // Next player draws 4 cards
      const nextPlayerIdx = getNextPlayerIndex(
        gameState,
        gameState.players.findIndex((p) => p.id === gameState.currentPlayer),
      )
      for (let i = 0; i < 4; i++) {
        gameState.players[nextPlayerIdx].cards.push(drawCardFromPile())
        gameState.drawPileCount--
      }
      break
  }
}

// Get the index of the next player
function getNextPlayerIndex(gameState: GameState, currentIndex: number): number {
  const numPlayers = gameState.players.length
  return (currentIndex + gameState.direction + numPlayers) % numPlayers
}

// Database operations (simplified for this example)
// In a real application, you would use a database like MongoDB, PostgreSQL, etc.

// In-memory database for this example
const gameStates: Record<string, GameState> = {}

// File path for persistent storage
const DATA_DIR = path.join(process.cwd(), '.data');
const GAME_STATES_FILE = path.join(DATA_DIR, 'game-states.json');

// Load persisted game states on server start
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (fs.existsSync(GAME_STATES_FILE)) {
    const data = fs.readFileSync(GAME_STATES_FILE, 'utf8');
    const savedStates = JSON.parse(data);
    
    // Restore the isValidPlay function which can't be serialized
    Object.keys(savedStates).forEach(roomId => {
      const gameState = savedStates[roomId];
      if (gameState.status === 'playing') {
        gameState.isValidPlay = function (card: Card) {
          const topCard = this.discardPile[this.discardPile.length - 1];
          if (card.type === "wild" || card.type === "wild4") {
            return true;
          }
          return (
            card.color === this.currentColor ||
            card.type === topCard.type ||
            (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
          );
        };
      }
      gameStates[roomId] = gameState;
    });
    
    console.log(`Loaded ${Object.keys(savedStates).length} game states from persistent storage`);
  }
  
  // Create default room on server start
  createDefaultRoom().catch(err => console.error("Failed to create default room:", err));
  
} catch (error) {
  console.error('Error loading persisted game states:', error);
}

async function storeGameState(roomId: string, gameState: Partial<GameState>): Promise<void> {
  gameStates[roomId] = gameState as GameState;
  await persistGameStates();
}

async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
  gameStates[roomId] = gameState;
  await persistGameStates();
}

async function getGameState(roomId: string): Promise<GameState | null> {
  console.log(`getGameState called for room ${roomId}. Current gameStates keys: ${Object.keys(gameStates)}`);
  return gameStates[roomId] || null;
}

// Persist game states to file system
async function persistGameStates(): Promise<void> {
  try {
    // Create a serializable copy of the game states
    const serializableStates: Record<string, any> = {};
    
    Object.keys(gameStates).forEach(roomId => {
      // Clone the game state without the function property
      const { isValidPlay, ...rest } = gameStates[roomId];
      serializableStates[roomId] = rest;
    });
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(GAME_STATES_FILE, JSON.stringify(serializableStates, null, 2));
  } catch (error) {
    console.error('Error persisting game states:', error);
  }
}

// Reset a game room to initial state
export async function resetRoom(roomId: string): Promise<void> {
  console.log(`Resetting room ${roomId} to initial state`)
  
  // Get current game state to preserve players if needed
  const currentGameState = await getGameState(roomId)
  
  // Create a fresh game state
  const gameState: Partial<GameState> = {
    roomId,
    status: "waiting",
    players: [], // Start with empty players list
    currentPlayer: "",
    direction: 1,
    drawPileCount: 0,
    discardPile: [],
    currentColor: "red",
    winner: null,
  }
  
  // Store the reset game state
  await storeGameState(roomId, gameState)
  
  // Notify connected clients if it's a room with active players
  if (currentGameState) {
    await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
  }
  
  console.log(`Room ${roomId} has been reset to waiting state`)
}
