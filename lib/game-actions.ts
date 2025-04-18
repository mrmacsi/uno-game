"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player, Card, CardColor, MatchResult } from "./types"
import { pusherServer } from "./pusher-server"
import * as fs from "fs"
import * as path from "path"
import { redirect } from "next/navigation"

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
  gameState.isValidPlay = function (card: Card) {
    const topCard = this.discardPile[this.discardPile.length - 1]
    const currentPlayer = this.players.find((p: Player) => p.id === this.currentPlayer)
    if (!currentPlayer) return false
    if (card.type === "wild") return true
    if (card.type === "wild4") {
      const hasMatchingColor = currentPlayer.cards.some((c: Card) => c.id !== card.id && c.color === this.currentColor)
      return !hasMatchingColor
    }
    if (card.type === "draw2") return card.color === this.currentColor
    return (
      card.color === this.currentColor ||
      (card.type === topCard.type) ||
      (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
    )
  }
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
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
  if (cardIndex === -1) throw new Error("Card not found")
  const card = gameState.players[playerIndex].cards[cardIndex]
  if (!gameState.isValidPlay(card)) throw new Error("Invalid card")
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
    if (card.type === "wild4") {
    }
    if (card.type !== "skip" && card.type !== "reverse" && card.type !== "draw2" && card.type !== "wild4") {
      const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id
    }
  }
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
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
  const topCard = gameState.discardPile[gameState.discardPile.length - 1]
  const isDrawEffect = topCard && (topCard.type === "draw2" || topCard.type === "wild4")
  reshuffleIfNeeded(gameState)
  if (gameState.drawPile.length === 0) throw new Error("No cards left to draw")
  const newCard = gameState.drawPile.pop()!
  gameState.players[playerIndex].cards.push(newCard)
  if (!gameState.log) gameState.log = []
  const drawMsg = `${gameState.players[playerIndex].name} drew a card`
  gameState.log.push(drawMsg)
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
  if (isDrawEffect) {
    gameState.drawCardEffect = {
      active: true,
      type: topCard.type as "draw2" | "wild4"
    }
    await updateGameState(roomId, gameState)
    await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
    return
  }
  gameState.hasDrawnThisTurn = true
  gameState.drawCardEffect = undefined
  if (gameState.isValidPlay(newCard)) {
    await updateGameState(roomId, gameState)
    await pusherServer.trigger(`game-${roomId}`, "drawn-card-playable", { card: newCard })
    return
  }
  const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
  gameState.currentPlayer = gameState.players[nextPlayerIndex].id
  gameState.hasDrawnThisTurn = false
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
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
  
  // Mark that the player has said UNO
  gameState.players[playerIndex].saidUno = true

  // Log the action
  if (!gameState.log) gameState.log = []
  gameState.log.push(`${gameState.players[playerIndex].name} said UNO!`)
  if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
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
    for (let i = 0; i < 2; i++) {
      reshuffleIfNeeded(gameState)
      if (gameState.drawPile.length === 0) throw new Error("No cards left to draw")
      targetPlayer.cards.push(gameState.drawPile.pop()!)
    }
    targetPlayer.saidUno = false
    if (!gameState.log) gameState.log = []
    gameState.log.push(`${targetPlayer.name} was caught not saying UNO and drew 2 cards!`)
    if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
  } else {
    throw new Error("Cannot call UNO on this player")
  }
  await updateGameState(roomId, gameState)
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
}

// Get room data
export async function getRoom(roomId: string): Promise<GameState> {
  const room = await getGameState(roomId)
  if (!room) {
    redirect("/join-room")
  }

  // Create a serializable version without the isValidPlay function
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isValidPlay, ...serializableGameState } = room;
  
  return serializableGameState as GameState;
}

// Helper functions

// Calculate points for each player based on cards left in their hands
function calculatePoints(gameState: GameState): void {
  const winner = gameState.players.find(player => player.id === gameState.winner)
  if (!winner) return
  
  // Reset points for all players
  gameState.players.forEach(player => {
    // Calculate points based on the cards in their hand
    let points = 0
    
    // In UNO, the winner gets points based on cards left in other players' hands
    if (player.id !== gameState.winner) {
      player.cards.forEach(card => {
        if (card.type === "number") {
          // Number cards: Face value
          points += card.value || 0
        } else if (card.type === "skip" || card.type === "reverse" || card.type === "draw2") {
          // Action cards: 20 points
          points += 20
        } else {
          // Wild cards: 50 points
          points += 50
        }
      })
    }
    
    player.points = points
  })
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

function drawCardFromPile(): Card {
  // Create a weighted distribution of card types similar to a real Uno deck
  // In a real Uno deck (108 cards):
  // - 76 Number cards (70.4%)
  // - 8 Skip cards (7.4%)
  // - 8 Reverse cards (7.4%)
  // - 8 Draw Two cards (7.4%)
  // - 4 Wild cards (3.7%)
  // - 4 Wild Draw Four cards (3.7%)
  
  const random = Math.random() * 100;
  
  let type: "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";
  
  if (random < 70.4) {
    type = "number";
  } else if (random < 77.8) {
    type = "skip";
  } else if (random < 85.2) {
    type = "reverse";
  } else if (random < 92.6) {
    type = "draw2";
  } else if (random < 96.3) {
    type = "wild";
  } else {
    type = "wild4";
  }
  
  const colors: CardColor[] = ["red", "blue", "green", "yellow"];
  
  if (type === "wild" || type === "wild4") {
    return {
      id: uuidv4(),
      type,
      color: "black",
    };
  } else if (type === "number") {
    // For number cards, distribute 0-9 with appropriate weights
    // One 0 per color (10%), two each of 1-9 per color (90%)
    const value = Math.random() < 0.1 ? 0 : Math.floor(Math.random() * 9) + 1;
    
    return {
      id: uuidv4(),
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
      value,
    };
  } else {
    return {
      id: uuidv4(),
      type,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }
}

function applyCardEffects(gameState: GameState, card: Card): void {
  switch (card.type) {
    case "skip": {
      const currentPlayerIndex = gameState.players.findIndex((p) => p.id === gameState.currentPlayer)
      const skippedPlayerIndex = getNextPlayerIndex(gameState, currentPlayerIndex)
      gameState.currentPlayer = gameState.players[getNextPlayerIndex(gameState, skippedPlayerIndex)].id
      break
    }
    case "reverse": {
      gameState.direction *= -1
      const currentPlayerIndex = gameState.players.findIndex((p) => p.id === gameState.currentPlayer)
      gameState.currentPlayer = gameState.players[getNextPlayerIndex(gameState, currentPlayerIndex)].id
      break
    }
    case "draw2": {
      const nextPlayer = getNextPlayerIndex(gameState, gameState.players.findIndex((p) => p.id === gameState.currentPlayer))
      if (!gameState.log) gameState.log = []
      gameState.log.push(`${gameState.players[nextPlayer].name} has to draw 2 cards!`)
      if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
      for (let i = 0; i < 2; i++) {
        reshuffleIfNeeded(gameState)
        if (gameState.drawPile.length === 0) throw new Error("No cards left to draw")
        gameState.players[nextPlayer].cards.push(gameState.drawPile.pop()!)
      }
      gameState.currentPlayer = gameState.players[getNextPlayerIndex(gameState, nextPlayer)].id
      break
    }
    case "wild4": {
      const wild4NextPlayerIdx = getNextPlayerIndex(gameState, gameState.players.findIndex((p) => p.id === gameState.currentPlayer))
      if (!gameState.log) gameState.log = []
      gameState.log.push(`${gameState.players[wild4NextPlayerIdx].name} has to draw 4 cards!`)
      if (gameState.log.length > 10) gameState.log = gameState.log.slice(-10)
      for (let i = 0; i < 4; i++) {
        reshuffleIfNeeded(gameState)
        if (gameState.drawPile.length === 0) throw new Error("No cards left to draw")
        gameState.players[wild4NextPlayerIdx].cards.push(gameState.drawPile.pop()!)
      }
      gameState.currentPlayer = gameState.players[getNextPlayerIndex(gameState, wild4NextPlayerIdx)].id
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
  if (gameState.drawPile.length === 0) {
    if (gameState.discardPile.length > 1) {
      const topCard = gameState.discardPile.pop()
      if (!topCard) return
      const newDrawPile = gameState.discardPile
      shuffle(newDrawPile)
      gameState.drawPile = newDrawPile
      gameState.discardPile = [topCard]
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
    
    // Restore the isValidPlay function which can't be serialized
    Object.keys(savedStates).forEach(roomId => {
      const gameState = savedStates[roomId];
      if (gameState.status === 'playing') {
        gameState.isValidPlay = function (card: Card) {
          const topCard = this.discardPile[this.discardPile.length - 1];
          const currentPlayer = this.players.find((p: Player) => p.id === this.currentPlayer);
          
          if (!currentPlayer) return false;
          
          // Rule 0: Special case - If player just drew cards from a draw card effect,
          // they can't play a matching draw card (no stacking in official rules)
          // if (this.drawCardEffect?.active) {
          //   if (this.drawCardEffect.type === "draw2" && card.type === "draw2") {
          //     return true;
          //   }
          //   if (this.drawCardEffect.type === "wild4" && card.type === "wild4") {
          //     return true;
          //   }
          // }
          
          // Rule 1: Pure Wild cards can always be played
          if (card.type === "wild") {
            return true;
          }
          
          // Rule 2: Wild Draw Four has special rules
          if (card.type === "wild4") {
            // Official rule: Wild Draw Four can only be played if no matching color
            const hasMatchingColor = currentPlayer.cards.some((c: Card) => c.id !== card.id && c.color === this.currentColor);
            return !hasMatchingColor;
          }
          
          // Rule 3: Draw Two must match color (no stacking per official rules)
          if (card.type === "draw2") {
            // Regular color matching rule
            return card.color === this.currentColor;
          }

          // Rule 4: Standard cards must match color or type/value
          return (
            card.color === this.currentColor || 
            (card.type === topCard.type) ||
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
    const serializableStates: Record<string, Omit<GameState, 'isValidPlay'>> = {};
    
    Object.keys(gameStates).forEach(roomId => {
      // Clone the game state without the function property
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
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
      // Create a version without the isValidPlay function
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { isValidPlay, ...serializableRoom } = room;
      rooms.push(serializableRoom as GameState)
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
