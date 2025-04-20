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
  avatar_index: number
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

export interface LogEntry {
  id: string
  message: string
  timestamp: number
  player?: string
  eventType?: 'play' | 'draw' | 'skip' | 'reverse' | 'uno' | 'uno_fail' | 'system' | 'join' | 'leave' | 'win'
  cardType?: CardType
  cardValue?: number
  cardColor?: CardColor
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
  log: LogEntry[]
  matchHistory?: MatchResult[]
  drawPileCount?: number
  isDrawing?: boolean
  isValidPlay?: (card: Card) => boolean
}

export type GameAction = { type: "UPDATE_GAME_STATE"; payload: GameState }
