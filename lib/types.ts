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
  avatarIndex: number
  saidUno?: boolean
  points?: number
}

export interface MatchResult {
  winner: string
  date: string
  playerResults: {
    playerId: string
    playerName: string
    avatar_index: number | null
    points: number
    totalScore: number
  }[]
  finalScore: number
}

export interface LogEntry {
  id: string
  message: string
  timestamp: number
  player?: string
  eventType?: 'play' | 'draw' | 'skip' | 'reverse' | 'uno' | 'uno_fail' | 'system' | 'join' | 'leave' | 'win' | 'message'
  cardType?: CardType
  cardValue?: number
  cardColor?: CardColor
  avatarIndex?: number
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
  gameStartTime?: number
  rematchRequestedBy?: string | null
  rematchConfirmedBy?: string[]
  winningScore?: number
}

export type GameAction = { type: "UPDATE_GAME_STATE"; payload: GameState }
  | { type: "SET_PLAYER_ID"; payload: string | null }
  | { type: "SET_ERROR"; payload: string | null }

export type UserProfile = {
  player_id: string
  username: string
  display_name: string | null
  admin: boolean
  created_at: string
  avatar_name: string | null
  avatar_index: number | null
  updated_at: string | null
}
