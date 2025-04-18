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
  
  // Match by color (most common)
  if (card.color === gameState.currentColor) return true
  
  // Number match - allow any card with same number, regardless of color
  if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) {
    console.log("[checkPlayValidity] Card allowed due to matching number:", card.value)
    return true
  }
  
  // Special cards matching rules
  if (card.type === "reverse" && topCard.type === "reverse") return true
  if (card.type === "skip" && topCard.type === "skip") return true
  if (card.type !== "number" && card.type === topCard.type) return true
  
  // No match found
  console.log("[checkPlayValidity] Card not allowed:", card)
  return false
}
