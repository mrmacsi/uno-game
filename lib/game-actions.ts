"use server"

import { v4 as uuidv4 } from "uuid"
import type { GameState, Player, Card, CardColor } from "./types"
import { pusherServer } from "./pusher-server"

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

  // Store the player ID in the client's local storage
  if (typeof window !== "undefined") {
    localStorage.setItem("playerId", playerId)
  }

  return roomId
}

// Join an existing game room
export async function joinRoom(roomId: string, playerName: string): Promise<void> {
  // Get the current game state
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  if (gameState.status !== "waiting") {
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
    isHost: false,
  }

  // Add the player to the game state
  gameState.players.push(player)

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Store the player ID in the client's local storage
  if (typeof window !== "undefined") {
    localStorage.setItem("playerId", playerId)
  }

  // Notify other players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
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

  // Check if the player has exactly 2 cards
  if (gameState.players[playerIndex].cards.length !== 2) {
    throw new Error("You can only say UNO when you have 2 cards left")
  }

  // For now, we'll just acknowledge the UNO call
  // In a real game, we would implement penalties for not saying UNO

  // Update the game state in the database
  await updateGameState(roomId, gameState)

  // Notify players
  await pusherServer.trigger(`game-${roomId}`, "game-updated", gameState)
}

// Get room data
export async function getRoom(roomId: string): Promise<GameState> {
  const gameState = await getGameState(roomId)

  if (!gameState) {
    throw new Error("Room not found")
  }

  return gameState
}

// Helper functions

// Generate a random room code
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Deal cards to players
function dealCards(numPlayers: number) {
  const deck = createDeck()
  const hands: Card[][] = Array(numPlayers)
    .fill(null)
    .map(() => [])

  // Deal 7 cards to each player
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < numPlayers; j++) {
      if (deck.length > 0) {
        const card = deck.pop()
        if (card) {
          hands[j].push(card)
        }
      }
    }
  }

  return { drawPile: deck, hands }
}

// Create a deck of UNO cards
function createDeck(): Card[] {
  const deck: Card[] = []
  const colors: CardColor[] = ["red", "blue", "green", "yellow"]

  // Add number cards (0-9) for each color
  colors.forEach((color) => {
    // One 0 card per color
    deck.push({
      id: uuidv4(),
      type: "number",
      color,
      value: 0,
    })

    // Two of each 1-9 card per color
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

    // Two of each special card per color
    for (let i = 0; i < 2; i++) {
      deck.push({
        id: uuidv4(),
        type: "skip",
        color,
      })

      deck.push({
        id: uuidv4(),
        type: "reverse",
        color,
      })

      deck.push({
        id: uuidv4(),
        type: "draw2",
        color,
      })
    }
  })

  // Add wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: uuidv4(),
      type: "wild",
      color: "wild",
    })

    deck.push({
      id: uuidv4(),
      type: "wild4",
      color: "wild",
    })
  }

  // Shuffle the deck
  return shuffle(deck)
}

// Shuffle an array
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array]
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

// Draw a card from the pile
function drawCardFromPile(): Card {
  // In a real implementation, we would draw from the actual draw pile
  // For simplicity, we'll just generate a random card
  const colors: CardColor[] = ["red", "blue", "green", "yellow"]
  const color = colors[Math.floor(Math.random() * colors.length)]
  const value = Math.floor(Math.random() * 10)

  return {
    id: uuidv4(),
    type: "number",
    color,
    value,
  }
}

// Apply card effects
function applyCardEffects(gameState: GameState, card: Card): void {
  switch (card.type) {
    case "skip":
      // Skip the next player
      // This is handled by getNextPlayerIndex being called twice
      const playerIndex = gameState.players.findIndex((p) => p.id === gameState.currentPlayer)
      const nextPlayerIndex = getNextPlayerIndex(gameState, playerIndex)
      gameState.currentPlayer = gameState.players[nextPlayerIndex].id
      break

    case "reverse":
      // Reverse the direction
      gameState.direction = gameState.direction === 1 ? -1 : 1
      break

    case "draw2":
      // Next player draws 2 cards
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

async function storeGameState(roomId: string, gameState: Partial<GameState>): Promise<void> {
  gameStates[roomId] = gameState as GameState
}

async function updateGameState(roomId: string, gameState: GameState): Promise<void> {
  gameStates[roomId] = gameState
}

async function getGameState(roomId: string): Promise<GameState | null> {
  return gameStates[roomId] || null
}
