export type CardColor = "red" | "blue" | "green" | "yellow" | "black" | "wild"
export type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4" | "wildSwap"

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
}

export interface GameState {
  roomId: string
  status: "waiting" | "playing" | "finished"
  players: Player[]
  currentPlayer: string
  direction: 1 | -1
  drawPileCount: number
  discardPile: Card[]
  currentColor: CardColor
  winner: string | null
  isValidPlay: (card: Card) => boolean
}

export type GameAction = { type: "UPDATE_GAME_STATE"; payload: GameState }
