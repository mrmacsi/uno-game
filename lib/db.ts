import type { GameState, Card } from "./types"

// In-memory database
const gameStates: Record<string, GameState> = {}

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
    return gameStates[roomId] || null
  },
  
  // Store a new game state
  storeRoom: async (roomId: string, gameState: Partial<GameState>): Promise<void> => {
    gameStates[roomId] = initializeGameState(gameState as GameState)
    await persistGameStates()
  },
  
  // Update an existing game state
  updateRoom: async (roomId: string, gameState: GameState): Promise<void> => {
    gameStates[roomId] = initializeGameState(gameState)
    await persistGameStates()
  }
}

// No-op function for Vercel compatibility
async function persistGameStates(): Promise<void> {
  // In-memory only storage for Vercel compatibility
  console.log('Game state updated in memory')
  return Promise.resolve()
} 