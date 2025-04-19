export type CardValue = 
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" 
  | "skip" | "reverse" | "draw2" | "wild" | "wild_draw4"

export type CardColor = "red" | "green" | "blue" | "yellow" | "black"

export interface Card {
  id: string
  color: CardColor
  value: CardValue
  isWild?: boolean
}

export interface Player {
  id: string
  name: string
  isBot?: boolean
  cards: Card[]
  hasCalledUno?: boolean
}

export interface LogEntry {
  id: string
  message: string
  timestamp: number
  player?: string
  card?: string
  color?: CardColor
}

export interface GameState {
  gameId: string
  players: Player[]
  currentPlayer: string
  direction: 1 | -1
  drawPile: Card[]
  discardPile: Card[]
  currentColor: CardColor
  currentValue: CardValue
  status: "lobby" | "playing" | "finished"
  winner: string | null
  showColorPicker: boolean
  hasDrawnThisTurn: boolean
  log: LogEntry[]
}

export interface GameActions {
  startGame: () => void
  joinGame: (playerId: string, playerName: string) => void
  playCard: (card: Card) => void
  drawCard: () => Promise<void>
  sayUno: () => void
  callUnoOnPlayer: (playerId: string) => void
  selectWildColor: (color: CardColor) => void
  endTurn: () => void
} 