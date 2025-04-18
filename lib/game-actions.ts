"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player, Card, CardColor, MatchResult } from "./types"
import { pusherServer } from "./pusher-server"
import * as fs from "fs"
import * as path from "path"
import { redirect } from "next/navigation"
import { checkPlayValidity } from "./utils"

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
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
  
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
  const gameState = await getGameState(roomId)
  if (!gameState) throw new Error("Room not found")
  if (gameState.status !== "waiting") throw new Error("Game has already started")
  if (gameState.players.length < 2) throw new Error("Not enough players")
  const { drawPile, hands } = dealCards(gameState.players.length)
  gameState.players.forEach((player, index) => {
    player.cards = hands[index]
  })
  let firstCard = drawPile.pop()
  while (firstCard && firstCard.type !== "number") {
    drawPile.unshift(firstCard)
    firstCard = drawPile.pop()
  }
  if (!firstCard) throw new Error("Failed to initialize game")
  gameState.discardPile = [firstCard]
  gameState.drawPile = drawPile
  gameState.currentColor = firstCard.color
  gameState.currentPlayer = gameState.players[0].id
  gameState.status = "playing"
  gameState.drawPileCount = gameState.drawPile.length
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
}

// Play a card
export async function playCard(roomId: string, playerId: string, cardId: string, selectedColor?: "red" | "blue" | "green" | "yellow"): Promise<void> {
  const gameState = await getGameState(roomId)
  if (!gameState) throw new Error("Room not found")
  if (gameState.status !== "playing") throw new Error("Game is not in progress")
  if (roomId !== "DEFAULT" && gameState.currentPlayer !== playerId) throw new Error("Not your turn")
  if (roomId === "DEFAULT" && gameState.players.length === 1 && gameState.status === "playing") gameState.currentPlayer = playerId
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) throw new Error("Player not found")
  const cardIndex = gameState.players[playerIndex].cards.findIndex((c) => c.id === cardId)
  if (cardIndex === -1) throw new Error(`Card not found: ${cardId}, player has: ${gameState.players[playerIndex].cards.map(c => c.id).join(",")}`)
  const card = gameState.players[playerIndex].cards[cardIndex]
  if (card.type === "wild4") {
    const playerHand = gameState.players[playerIndex].cards
    const hasPlayableColorCard = playerHand.some(c => c.id !== cardId && c.color === gameState.currentColor && c.type !== "wild" && c.type !== "wild4")
    if (hasPlayableColorCard) {
      throw new Error("Cannot play Wild Draw 4 when you have a card matching the current color.")
    }
  }
  if (!checkPlayValidity(gameState, card)) throw new Error("Invalid card")
  gameState.players[playerIndex].cards.splice(cardIndex, 1)
  gameState.discardPile.push(card)
  if (!gameState.log) gameState.log = []
  let actionMsg = `${gameState.players[playerIndex].name} played ${card.type === "number" ? card.value : card.type.toUpperCase()} ${card.color.toUpperCase()}`
  if (card.type === "wild" || card.type === "wild4") {
    if (selectedColor) actionMsg += ` (changed color to ${selectedColor.toUpperCase()})`
  }
  gameState.log.push(actionMsg)
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
  gameState.drawCardEffect = undefined
  if (card.type === "wild" || card.type === "wild4") {
    if (selectedColor) {
      gameState.currentColor = selectedColor
    } else {
      throw new Error("No color selected for wild card")
    }
  } else {
    gameState.currentColor = card.color
  }
  if (gameState.players[playerIndex].cards.length === 1) {
    gameState.players[playerIndex].saidUno = false
    gameState.log.push(`${gameState.players[playerIndex].name} has only ONE card!`)
    if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
  }
  if (gameState.players[playerIndex].cards.length === 0) {
    gameState.status = "finished"
    gameState.winner = playerId
    gameState.log.push(`${gameState.players[playerIndex].name} has won the game!`)
    if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
    calculatePoints(gameState)
    if (!gameState.matchHistory) gameState.matchHistory = []
    const matchResult: MatchResult = {
      winner: playerId,
      date: new Date().toISOString(),
      playerResults: gameState.players.map(player => ({
        playerId: player.id,
        playerName: player.name,
        points: player.points || 0
      }))
    }
    gameState.matchHistory.push(matchResult)
  } else {
    applyCardEffects(gameState, card)
    if (gameState.status === 'playing') {
      let nextPlayerIndex = playerIndex
      if (card.type === 'skip' || card.type === 'draw2' || card.type === 'wild4') {
        const skippedPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
        nextPlayerIndex = getNextPlayerIndex(gameState, skippedPlayerIndex)
        const affectedPlayer = gameState.players[skippedPlayerIndex]
        if (card.type === 'skip') {
          gameState.log.push(`${affectedPlayer.name} was skipped!`)
        } else {
          gameState.log.push(`${affectedPlayer.name} drew cards and was skipped!`)
        }
        if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
      } else if (card.type === 'reverse') {
        if (gameState.players.length === 2) {
          nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
          gameState.log.push(`${gameState.players[nextPlayerIndex].name} was skipped (Reverse with 2 players)!`)
          if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
          nextPlayerIndex = getNextPlayerIndex(gameState, nextPlayerIndex)
        } else {
          nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
        }
      } else {
        nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
      }
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id
      gameState.hasDrawnThisTurn = false
    }
  }
  gameState.drawPileCount = gameState.drawPile.length
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
}

// Draw a card
export async function drawCard(roomId: string, playerId: string): Promise<void> {
  const gameState = await getGameState(roomId)
  if (!gameState) throw new Error("Room not found")
  if (gameState.status !== "playing") throw new Error("Game is not in progress")
  if (roomId !== "DEFAULT" && gameState.currentPlayer !== playerId) throw new Error("Not your turn")
  if (roomId === "DEFAULT" && gameState.players.length === 1 && gameState.status === "playing") gameState.currentPlayer = playerId
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) throw new Error("Player not found")
  if (gameState.isDrawing) throw new Error("Already drawing a card")
  if (gameState.hasDrawnThisTurn) throw new Error("You have already drawn a card this turn.")
  gameState.isDrawing = true
  await updateGameState(roomId, gameState)
  try {
    reshuffleIfNeeded(gameState)
    if (!gameState.drawPile || gameState.drawPile.length === 0) {
      gameState.isDrawing = false
      await endTurn(roomId, playerId)
      return
    }
    const newCard = gameState.drawPile.pop()!
    gameState.players[playerIndex].cards.push(newCard)
    if (!gameState.log) gameState.log = []
    gameState.log.push(`${gameState.players[playerIndex].name} drew a card`)
    if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
    gameState.drawPileCount = gameState.drawPile.length
    gameState.hasDrawnThisTurn = true
    if (checkPlayValidity(gameState, newCard)) {
      gameState.isDrawing = false
      await updateGameState(roomId, gameState)
      await pusherServer.trigger(`game-${roomId}`, "drawn-card-playable", { playerId: playerId, card: newCard })
    } else {
      gameState.isDrawing = false
      await updateGameState(roomId, gameState)
      await endTurn(roomId, playerId)
    }
  } catch (error) {
    gameState.isDrawing = false
    await updateGameState(roomId, gameState)
    throw error
  }
}

// End turn (pass to next player)
export async function endTurn(roomId: string, playerId: string): Promise<void> {
  // Get the current game state
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  if (gameState.status !== "playing") {
    throw new Error("Game is not in progress")
  }

  if (roomId !== "DEFAULT" && gameState.currentPlayer !== playerId) {
    throw new Error("Not your turn")
  }
  if (roomId === "DEFAULT" && gameState.players.length === 1 && gameState.status === "playing") {
    gameState.currentPlayer = playerId
  }

  // Find the player
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId)
  if (playerIndex === -1) {
    throw new Error("Player not found")
  }

  // Move to the next player
  const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id
  
  // Reset the draw flag for next turn
  gameState.hasDrawnThisTurn = false

  // Log the action
  if (!gameState.log) gameState.log = []
  gameState.log.push(`${gameState.players[playerIndex].name} ended their turn`)
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
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
  
  // Mark that the player has said UNO
  gameState.players[playerIndex].saidUno = true

  // Log the action
  if (!gameState.log) gameState.log = []
  gameState.log.push(`${gameState.players[playerIndex].name} said UNO!`)
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
}

// Call UNO on another player who didn't say UNO
export async function callUnoOnPlayer(roomId: string, callerId: string, targetPlayerId: string): Promise<void> {
  const gameState = await getGameState(roomId)
  if (!gameState) throw new Error("Room not found")
  if (gameState.status !== "playing") throw new Error("Game is not in progress")
  const targetPlayerIndex = gameState.players.findIndex((p) => p.id === targetPlayerId)
  if (targetPlayerIndex === -1) throw new Error("Target player not found")
  const targetPlayer = gameState.players[targetPlayerIndex]
  if (targetPlayer.cards.length === 1 && !targetPlayer.saidUno) {
    // Draw 2 cards for not saying UNO
    for (let i = 0; i < 2; i++) {
      reshuffleIfNeeded(gameState)
      if (!gameState.drawPile || gameState.drawPile.length === 0) {
        // If still no cards, break out of loop - player draws as many as are available
        break
      }
      targetPlayer.cards.push(gameState.drawPile.pop()!)
    }
    
    // Update the draw pile count
    gameState.drawPileCount = gameState.drawPile ? gameState.drawPile.length : 0
    
    targetPlayer.saidUno = false
    if (!gameState.log) gameState.log = []
    gameState.log.push(`${targetPlayer.name} was caught not saying UNO and drew penalty cards!`)
    if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
  } else {
    throw new Error("Cannot call UNO on this player")
  }
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState))
}

// Get room data
export async function getRoom(roomId: string): Promise<GameState> {
  const room = await getGameState(roomId)
  if (!room) {
    redirect("/join-room")
  }
  return stripFunctionsFromGameState(room as GameState)
}

// Helper functions

// Calculate points for each player based on cards left in their hands
function calculatePoints(gameState: GameState): void {
  const winner = gameState.players.find(player => player.id === gameState.winner)
  if (!winner) return

  let totalPoints = 0

  gameState.players.forEach(player => {
    // Calculate points based on the cards left in *losing* players' hands
    if (player.id !== gameState.winner) {
      let playerHandPoints = 0
      player.cards.forEach(card => {
        if (card.type === "number") {
          // Number cards: Face value
          playerHandPoints += card.value || 0
        } else if (card.type === "skip" || card.type === "reverse" || card.type === "draw2") {
          // Action cards: 20 points
          playerHandPoints += 20
        } else {
          // Wild cards: 50 points
          playerHandPoints += 50
        }
      })
      // Assign 0 points to losing players (or could remove the property)
      player.points = 0
      totalPoints += playerHandPoints
    }
  })

  // Assign the total accumulated points to the winner
  winner.points = totalPoints
}

// Generate a random room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function dealCards(numPlayers: number) {
  const deck = createDeck()
  shuffle(deck)
  const hands: Card[][] = Array(numPlayers)
    .fill(null)
    .map(() => [])
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

function applyCardEffects(gameState: GameState, card: Card): void {
  switch (card.type) {
    case "skip": {
      break
    }
    case "reverse": {
      gameState.direction *= -1
      break
    }
    case "draw2": {
      const currentPlayerIndex = gameState.players.findIndex((p) => p.id === gameState.currentPlayer)
      const nextPlayer = getNextPlayerIndex(gameState, currentPlayerIndex)
      let cardsDrawn = 0
      for (let i = 0; i < 2; i++) {
        reshuffleIfNeeded(gameState)
        if (!gameState.drawPile || gameState.drawPile.length === 0) {
          break
        }
        gameState.players[nextPlayer].cards.push(gameState.drawPile.pop()!)
        cardsDrawn++
      }
      gameState.drawPileCount = gameState.drawPile ? gameState.drawPile.length : 0
      break
    }
    case "wild4": {
      const currentPlayerIndex = gameState.players.findIndex((p) => p.id === gameState.currentPlayer)
      const wild4NextPlayerIdx = getNextPlayerIndex(gameState, currentPlayerIndex)
      let cardsDrawn = 0
      for (let i = 0; i < 4; i++) {
        reshuffleIfNeeded(gameState)
        if (!gameState.drawPile || gameState.drawPile.length === 0) {
          break
        }
        gameState.players[wild4NextPlayerIdx].cards.push(gameState.drawPile.pop()!)
        cardsDrawn++
      }
      gameState.drawPileCount = gameState.drawPile ? gameState.drawPile.length : 0
      break
    }
    case "wild": {
      break
    }
  }
}

// Get the index of the next player
function getNextPlayerIndex(gameState: GameState, currentIndex: number): number {
  const numPlayers = gameState.players.length
  return (currentIndex + gameState.direction + numPlayers) % numPlayers
}

function reshuffleIfNeeded(gameState: GameState) {
  if (!gameState.drawPile || gameState.drawPile.length === 0) {
    if (gameState.discardPile && gameState.discardPile.length > 1) {
      const topCard = gameState.discardPile.pop()
      if (!topCard) return
      
      const newDrawPile = [...gameState.discardPile]
      gameState.discardPile = []
      
      shuffle(newDrawPile)
      gameState.drawPile = newDrawPile
      gameState.discardPile = [topCard]
      gameState.drawPileCount = newDrawPile.length
      
      if (!gameState.log) gameState.log = []
      gameState.log.push("Draw pile was empty. Discard pile was shuffled to create a new draw pile.")
      if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
    }
  }
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
    
    // Restore game states from JSON
    Object.keys(savedStates).forEach(roomId => {
      gameStates[roomId] = savedStates[roomId];
    });

    console.log(`Loaded ${Object.keys(savedStates).length} game states from persistent storage`);
  }
  
  // Create default room on server start
  createDefaultRoom().catch(err => console.error("Failed to create default room:", err));
} catch (error) {
  console.error('Error loading persisted game states:', error);
}


import { initializeGameState } from "./db"

async function storeGameState(roomId: string, gameState: Partial<GameState>): Promise<void> {
  gameStates[roomId] = initializeGameState(gameState as GameState);
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
    const serializableStates: Record<string, GameState> = {};
    
    Object.keys(gameStates).forEach(roomId => {
      serializableStates[roomId] = gameStates[roomId];
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
    players: roomId === "DEFAULT" ? [] : (currentGameState?.players || []), // Clear players for DEFAULT room
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
    await pusherServer.trigger(`game-${roomId}`, "game-updated", stripFunctionsFromGameState(gameState as GameState))
  }
  
  console.log(`Room ${roomId} has been reset to waiting state`)
}

// Get all rooms
export async function getAllRooms(): Promise<GameState[]> {
  const allRoomIds = Object.keys(gameStates)
  const rooms: GameState[] = []
  
  for (const roomId of allRoomIds) {
    const room = await getGameState(roomId)
    if (room) {
      rooms.push(room as GameState)
    }
  }
  
  return rooms
}

// Delete a game room
export async function deleteRoom(roomId: string): Promise<void> {
  if (roomId === "DEFAULT") {
    // Don't delete the default room, just reset it
    await resetRoom(roomId)
    return
  }
  
  console.log(`Deleting room ${roomId}`)
  
  // Delete the room from memory
  delete gameStates[roomId]
  
  // Persist the changes
  await persistGameStates()
  
  // Notify connected clients
  await pusherServer.trigger(`game-${roomId}`, "room-deleted", { message: "This room has been deleted" })
  
  console.log(`Room ${roomId} has been deleted`)
}

function stripFunctionsFromGameState(gameState: GameState) {
  // No functions expected to be stripped anymore, just return the state
  return gameState;
}
