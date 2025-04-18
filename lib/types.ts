export type CardColor = "red" | "blue" | "green" | "yellow" | "black" | "wild"
export type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4"

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
  isValidPlay: (card: Card) => boolean
  drawCardEffect?: {
    active: boolean
    type: "draw2" | "wild4"
  }
  hasDrawnThisTurn?: boolean
  matchHistory?: MatchResult[]
  log?: string[]
  drawPileCount?: number
  isDrawing?: boolean
}

export type GameAction = { type: "UPDATE_GAME_STATE"; payload: GameState }
