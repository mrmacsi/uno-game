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
  isHost?: boolean
  avatarIndex: number
  saidUno?: boolean
  points?: number
  isBot?: boolean
}

export interface MatchResult {
  winner: string
  date: string
  playerResults: {
    playerId: string
    playerName: string
    avatar_index: number | null
    points: number
  }[]
  finalScore: number
}

export interface LogEntry {
  id: string
  message: string
  timestamp: number
  player?: string
  avatarIndex?: number
  eventType?: 'play' | 'draw' | 'uno' | 'skip' | 'reverse' | 'draw2' | 'win' | 'join' | 'leave' | 'bot' | 'system' | 'uno_fail'
  cardType?: CardType
  cardValue?: number
  cardColor?: CardColor
}

export interface GameState {
  roomId: string
  status: "waiting" | "playing" | "finished"
  players: Player[]
  currentPlayer: string
  direction: number
  drawPile: Card[]
  discardPile: Card[]
  currentColor: CardColor
  winner: string | null
  log: LogEntry[]
  drawPileCount?: number
  gameStartTime?: number
  hasDrawnThisTurn?: boolean
  saidUno?: boolean
  rematchRequestedBy?: string | null
  rematchConfirmedBy?: string[]
  socket?: unknown // Use unknown instead of any
  drawCardEffect?: { playerId: string; count: number }
  matchHistory?: MatchResult[]
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

export interface BotPlayDecision {
  action: "play" | "draw"
  card?: Card
  chosenColor?: CardColor
  shouldDeclareUno?: boolean
}
