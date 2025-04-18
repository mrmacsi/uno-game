import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { GameState, Card } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function checkPlayValidity(gameState: GameState, card: Card): boolean {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1]
  
  // Debug log for validation
  console.log("[checkPlayValidity]", {
    cardToPlay: card,
    topCard,
    currentColor: gameState.currentColor
  })
  
  if (!topCard) return true
  
  // Wild cards can always be played
  if (card.type === "wild" || card.type === "wild4") return true
  
  // Match by current color (most common rule)
  if (card.color === gameState.currentColor) return true
  
  // Match by number value (if both are numbers)
  if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) {
    console.log("[checkPlayValidity] Card allowed due to matching number:", card.value)
    return true
  }
  
  // Match by card type (special cards on same type)
  if (card.type !== "number" && card.type === topCard.type) {
    console.log("[checkPlayValidity] Card allowed due to matching type:", card.type)
    return true
  }
  
  // No match found
  console.log("[checkPlayValidity] Card not allowed:", card)
  return false
}
