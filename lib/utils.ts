import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GameState, Card } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function checkPlayValidity(gameState: GameState, card: Card): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1]
  if (!topCard) return true
  if (card.type === "wild" || card.type === "wild4") return true
  if (card.type === "reverse" && topCard.type === "reverse") return true
  if (card.type === "skip" && topCard.type === "skip") return true
  if (card.color === gameState.currentColor) return true
  if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) return true
  if (card.type !== "number" && card.type === topCard.type) return true
  return false
}
