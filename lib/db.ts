import * as fs from "fs"
import * as path from "path"
import type { GameState } from "./types"

// In-memory database
const gameStates: Record<string, GameState> = {}

// File paths for persistent storage
const DATA_DIR = path.join(process.cwd(), '.data')
const GAME_STATES_FILE = path.join(DATA_DIR, 'game-states.json')

// Initialize database
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  
  if (fs.existsSync(GAME_STATES_FILE)) {
    const data = fs.readFileSync(GAME_STATES_FILE, 'utf8')
    const savedStates = JSON.parse(data)
    
    // Restore the game states
    Object.keys(savedStates).forEach(roomId => {
      const gameState = savedStates[roomId]
      if (gameState.status === 'playing') {
        gameState.isValidPlay = function (card: any) {
          const topCard = this.discardPile[this.discardPile.length - 1]
          if (card.type === "wild" || card.type === "wild4") {
            return true
          }
          return (
            card.color === this.currentColor ||
            card.type === topCard.type ||
            (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
          )
        }
      }
      gameStates[roomId] = gameState
    })
    
    console.log(`Loaded ${Object.keys(savedStates).length} game states from persistent storage`)
  }
} catch (error) {
  console.error('Error loading persisted game states:', error)
}

// Database operations
export const db = {
  // Get a room by ID
  getRoom: async (roomId: string): Promise<GameState | null> => {
    return gameStates[roomId] || null
  },
  
  // Store a new game state
  storeRoom: async (roomId: string, gameState: Partial<GameState>): Promise<void> => {
    gameStates[roomId] = gameState as GameState
    await persistGameStates()
  },
  
  // Update an existing game state
  updateRoom: async (roomId: string, gameState: GameState): Promise<void> => {
    gameStates[roomId] = gameState
    await persistGameStates()
  }
}

// Persist game states to file system
async function persistGameStates(): Promise<void> {
  try {
    // Create a serializable copy of the game states
    const serializableStates: Record<string, any> = {}
    
    Object.keys(gameStates).forEach(roomId => {
      // Clone the game state without the function property
      const { isValidPlay, ...rest } = gameStates[roomId]
      serializableStates[roomId] = rest
    })
    
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    
    // Write to file
    fs.writeFileSync(GAME_STATES_FILE, JSON.stringify(serializableStates, null, 2))
  } catch (error) {
    console.error('Error persisting game states:', error)
  }
} 