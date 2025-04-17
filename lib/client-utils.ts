'use client'

import type { GameState, Card } from "@/lib/types"

/**
 * Stores player ID in localStorage
 */
export function storePlayerIdInLocalStorage(playerId: string): void {
  if (typeof window !== "undefined") {
    console.log("Storing player ID in localStorage:", playerId)
    localStorage.setItem("playerId", playerId)
    
    // Force a storage event so other tabs can detect the change
    window.dispatchEvent(new Event('storage'))
  }
}

/**
 * Retrieves player ID from localStorage
 */
export function getPlayerIdFromLocalStorage(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("playerId")
  }
  return null
}

/**
 * Clears player ID from localStorage
 */
export function clearPlayerIdFromLocalStorage(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("playerId")
  }
}

/**
 * Generates a UUID on the client side
 */
export function generateClientUUID(): string {
  return crypto.randomUUID()
}

/**
 * Adds the isValidPlay function to a game state object received from the server
 */
export function addIsValidPlayFunction(gameState: GameState): GameState {
  if (gameState.status === 'playing' && !gameState.isValidPlay) {
    // Add the isValidPlay function
    gameState.isValidPlay = function(card: Card) {
      const topCard = this.discardPile[this.discardPile.length - 1]
      const currentPlayer = this.players.find(p => p.id === this.currentPlayer)
      
      if (!currentPlayer) return false

      // Wild cards can be played with some restrictions
      if (card.type === "wild" || card.type === "wildSwap") {
        return true
      }
      
      // Wild Draw Four can be played on any card, but with restrictions
      if (card.type === "wild4") {
        // If the top card is a Draw 2, we can play a Wild Draw 4 without color restrictions
        if (topCard.type === "draw2") {
          return true
        }
        
        // Otherwise, follow the standard rule that you can only play it if you don't have matching color
        const hasMatchingColor = currentPlayer.cards.some(c => c.id !== card.id && c.color === this.currentColor)
        return !hasMatchingColor
      }
      
      // Draw Two can only be played on a matching color or another Draw Two
      if (card.type === "draw2") {
        return card.color === this.currentColor || topCard.type === "draw2"
      }

      // Cards must match color or value/type for number cards
      return (
        card.color === this.currentColor ||
        (card.type === "number" && topCard.type === "number" && card.value === topCard.value)
      )
    }
  }
  
  return gameState
} 