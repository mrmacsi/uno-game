'use client'

import type { GameState, Card } from "@/lib/types"
import { isIOS } from "./browser-utils"

// For iOS devices, use this as a backup if localStorage fails
let inMemoryPlayerIdFallback: string | null = null

/**
 * Stores player ID in localStorage
 */
export function storePlayerIdInLocalStorage(playerId: string): void {
  // Store in memory as a fallback
  inMemoryPlayerIdFallback = playerId

  if (typeof window !== "undefined") {
    try {
      console.log("Storing player ID in localStorage:", playerId)
      localStorage.setItem("playerId", playerId)
      
      // Set a cookie as an additional fallback, especially for iOS
      document.cookie = `playerId=${playerId};path=/;max-age=86400`
      
      // Force a storage event so other tabs can detect the change
      window.dispatchEvent(new Event('storage'))
    } catch (error) {
      console.error("Failed to store playerId in localStorage:", error)
    }
  }
}

/**
 * Retrieves player ID from localStorage
 */
export function getPlayerIdFromLocalStorage(): string | null {
  if (typeof window !== "undefined") {
    try {
      // Try localStorage first
      const playerIdFromStorage = localStorage.getItem("playerId")
      if (playerIdFromStorage) return playerIdFromStorage
      
      // If that fails, try cookies as fallback (especially for iOS)
      const cookies = document.cookie.split(';')
      const playerIdCookie = cookies.find(cookie => cookie.trim().startsWith('playerId='))
      if (playerIdCookie) {
        const playerId = playerIdCookie.trim().substring('playerId='.length)
        return playerId
      }
    } catch (error) {
      console.error("Error retrieving playerId:", error)
    }
  }
  
  // Use memory fallback as last resort
  return inMemoryPlayerIdFallback
}

/**
 * Clears player ID from localStorage
 */
export function clearPlayerIdFromLocalStorage(): void {
  inMemoryPlayerIdFallback = null
  
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("playerId")
      document.cookie = "playerId=;path=/;max-age=0"
    } catch (error) {
      console.error("Failed to clear playerId:", error)
    }
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
  if (gameState.status === 'playing') {
    gameState.isValidPlay = function(card: Card): boolean {
      const topCard = this.discardPile[this.discardPile.length - 1];
      // If discard pile is empty, any card is technically playable (first turn edge case)
      if (!topCard) return true; 

      // Wild cards are always playable
      if (card.type === "wild" || card.type === "wild4") {
        return true;
      }

      // Check if the card's color matches the current required color
      if (card.color === this.currentColor) {
        return true;
      }

      // Check if the card's number matches the top card's number (if both are numbers)
      if (card.type === "number" && topCard.type === "number" && card.value === topCard.value) {
        return true;
      }

      // Check if the card's type matches the top card's type (for action cards: Skip, Reverse, Draw2)
      // This allows playing e.g. a Blue Skip on a Red Skip.
      if (card.type !== "number" && card.type === topCard.type) {
        return true;
      }

      // If none of the above conditions are met, the play is invalid
      return false;
    };
  }
  return gameState;
} 