'use server'

import { redis } from "./db" // Import the configured Redis client
import type { GameState, MatchResult } from "./types" // Import necessary types

const ROOM_PREFIX = "room:"

/**
 * Fetches all keys matching the room prefix from Redis using SCAN for better performance.
 * @returns An array of room keys (e.g., ["room:ABCDEF", "room:GHIJKL"])
 */
export async function getAllGameRoomKeys(): Promise<string[]> {
  const keys: string[] = [];
  let cursor: number = 0; // Use number for cursor

  do {
    // Pass MATCH and COUNT within an options object
    const reply = await redis.scan(cursor, {
      MATCH: `${ROOM_PREFIX}*`,
      COUNT: 100
    });
    cursor = reply.cursor; // Get cursor from the reply object
    keys.push(...reply.keys); // Get keys array from the reply object
  } while (cursor !== 0); // Compare cursor to 0

  return keys;
}

/**
 * Fetches the raw string value for a given key from Redis.
 * @param key The Redis key (e.g., "room:ABCDEF")
 * @returns The raw string value or null if the key doesn't exist.
 */
export async function getRedisValue(key: string): Promise<string | null> {
  if (!key) {
    console.error("getRedisValue called with empty key");
    return null;
  }
  try {
    const value = await redis.get(key);
    return value;
  } catch (error) {
    console.error(`Error fetching value for key ${key} from Redis:`, error);
    throw new Error("Failed to fetch value from Redis.");
  }
}

/**
 * Fetches and parses the GameState, specifically extracting the match history.
 * @param key The Redis key for the game room.
 * @returns The match history array or null if not found/error.
 */
export async function getMatchHistoryFromRedis(key: string): Promise<MatchResult[] | null> {
   if (!key) return null;
   try {
     const value = await redis.get(key);
     if (!value) return null;
     const gameState: Partial<GameState> = JSON.parse(value);
     return gameState.matchHistory || null;
   } catch (error) {
     console.error(`Error parsing match history for key ${key}:`, error);
     return null; // Return null on parsing error
   }
} 