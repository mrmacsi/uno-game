import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GameState } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility to remove non-serializable functions (like isValidPlay) before sending state via Pusher
export function stripFunctionsFromGameState(gameState: GameState): Omit<GameState, 'isValidPlay'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isValidPlay, ...rest } = gameState
  return rest
}
