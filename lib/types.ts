export type CardColor = "red" | "blue" | "green" | "yellow" | "black" | "wild"
export type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4" | "back"

export interface Card {
  id: string
  type: CardType
  color: CardColor
  value?: number
}

export interface Player {
  id: string
  name: string
  cards: Card[]
  isHost: boolean
  saidUno?: boolean
  points?: number
}

export interface MatchResult {
  winner: string
  date: string
  playerResults: {
    playerId: string
    playerName: string
    points: number
  }[]
  finalScore: number
}

export interface GameState {
  roomId: string
  status: "waiting" | "playing" | "finished"
  players: Player[]
  currentPlayer: string
  direction: 1 | -1
  drawPile: Card[]
  discardPile: Card[]
  currentColor: CardColor
  winner: string | null
  drawCardEffect?: {
    playerId: string
    count: number
  }
  hasDrawnThisTurn?: boolean
  log: string[]
  matchHistory?: MatchResult[]
  drawPileCount?: number
  isDrawing?: boolean
  isValidPlay?: (card: Card) => boolean
}

export type GameAction = { type: "UPDATE_GAME_STATE"; payload: GameState }
