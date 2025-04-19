import { createClient } from 'redis'
import type { GameState } from "./types"

const redis = createClient({ url: process.env.REDIS_URL })
redis.connect()

export { redis } // Export the client instance

// Initialize database
export const initializeGameState = (gameState: GameState) => {
  // The isValidPlay logic should live on the client-side (e.g., in GameProvider or useGame hook)
  // Do not attach functions to the state object that gets serialized from the server.
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