import { createClient } from 'redis'
import type { GameState, Card } from "./types"

const redis = createClient({ url: process.env.REDIS_URL })
redis.connect()

// Initialize database with isValidPlay function
export const initializeGameState = (gameState: GameState) => {
  if (gameState.status === 'playing') {
    gameState.isValidPlay = function (card: Card) {
      const topCard = this.discardPile[this.discardPile.length - 1]
      
      // Wild cards can always be played
      if (card.type === "wild" || card.type === "wild4") {
        return true
      }
      
      // Reverse cards can be played on any other reverse card regardless of color
      if (card.type === "reverse" && topCard.type === "reverse") {
        return true
      }
      
      // Skip cards can be played on any other skip card regardless of color
      if (card.type === "skip" && topCard.type === "skip") {
        return true
      }
      
      // Standard matching rules
      return (
        card.color === this.currentColor ||
        card.type === topCard.type ||
        (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
      )
    }
  }
  return gameState
}

// Database operations
export const db = {
  // Get a room by ID
  getRoom: async (roomId: string): Promise<GameState | null> => {
    const data = await redis.get(`room:${roomId}`)
    if (!data) return null
    return initializeGameState(JSON.parse(data))
  },
  
  // Store a new game state
  storeRoom: async (roomId: string, gameState: Partial<GameState>): Promise<void> => {
    await redis.set(`room:${roomId}`, JSON.stringify(gameState))
  },
  
  // Update an existing game state
  updateRoom: async (roomId: string, gameState: GameState): Promise<void> => {
    await redis.set(`room:${roomId}`, JSON.stringify(gameState))
  }
} 