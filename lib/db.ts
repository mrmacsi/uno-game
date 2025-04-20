import { createClient } from 'redis'
import type { GameState } from "./types"

const redis = createClient({ url: process.env.REDIS_URL })
redis.connect()

export { redis } // Export the client instance

// Initialize database
export const initializeGameState = (gameState: Partial<GameState>): GameState => {
  // Merge with default values to ensure all properties exist, especially gameStartTime
  const defaults: Partial<GameState> = {
    gameStartTime: undefined,
    log: [],
    players: [],
    discardPile: [],
    status: 'waiting',
    // Add other necessary defaults here if needed
  };

  return { ...defaults, ...gameState } as GameState;
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