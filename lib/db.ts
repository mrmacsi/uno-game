import type { GameState } from "./types"
import { Redis as UpstashRedisClient } from "@upstash/redis"
import { createClient, type RedisClientType } from "redis"

// Runtime-agnostic Redis adapter that supports both Node Redis and Upstash (Vercel Redis)
// It avoids connecting during module load to prevent issues in build/static contexts.
type RedisAdapter = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<unknown>
  setEx: (key: string, ttlSeconds: number, value: string) => Promise<unknown>
  del: (keys: string | string[]) => Promise<number>
  mGet: (keys: string[]) => Promise<(string | null)[]>
  scan: (
    cursor: number,
    options?: { MATCH?: string; COUNT?: number }
  ) => Promise<{ cursor: number; keys: string[] }>
  keys: (pattern: string) => Promise<string[]>
  // Compatibility flags for existing code paths
  isOpen: boolean
  isReady: boolean
  connect: () => Promise<void>
  info: (section?: string) => Promise<string>
}

function createRedisAdapter(): RedisAdapter {
  const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

  if (hasUpstash) {
    // Upstash (Vercel Redis/KV) via REST
    const upstash = UpstashRedisClient.fromEnv()

    const upstashScan = async (
      cursor: number,
      options?: { MATCH?: string; COUNT?: number }
    ): Promise<{ cursor: number; keys: string[] }> => {
      // Upstash uses lowercase option keys
      const match = options?.MATCH
      const count = options?.COUNT
      const respUnknown: unknown = await upstash.scan(cursor, {
        match: match,
        count: count,
      })
      // Normalize return shape
      if (Array.isArray(respUnknown)) {
        // Older SDKs might return [nextCursor, keys]
        const [nextCursor, keys] = respUnknown as [number, string[]]
        return { cursor: Number(nextCursor) || 0, keys: keys || [] }
      }
      const respObj = respUnknown as { cursor?: number | string; keys?: unknown }
      const nextCursor = Number(respObj?.cursor ?? 0)
      const keys: string[] = Array.isArray(respObj?.keys) ? (respObj.keys as string[]) : []
      return { cursor: nextCursor, keys }
    }

    const upstashKeys = async (pattern: string): Promise<string[]> => {
      // KEYS is not available in Upstash; emulate with SCAN
      let cursor = 0
      const out: string[] = []
      do {
        const { cursor: next, keys } = await upstashScan(cursor, { MATCH: pattern, COUNT: 100 })
        out.push(...keys)
        cursor = next
      } while (cursor !== 0)
      return out
    }

    const upstashMGet = async (keys: string[]): Promise<(string | null)[]> => {
      if (!keys || keys.length === 0) return []
      const values = await upstash.mget(...keys)
      // Normalize to JSON strings
      return values.map((v: unknown) => {
        if (v === null || v === undefined) return null
        if (typeof v === 'string') return v
        try { return JSON.stringify(v) } catch { return String(v) }
      })
    }

    const upstashDel = async (keys: string | string[]): Promise<number> => {
      if (Array.isArray(keys)) {
        if (keys.length === 0) return 0
        return await upstash.del(...keys)
      }
      return await upstash.del(keys)
    }

    return {
      get: async (key: string) => {
        const vUnknown: unknown = await upstash.get(key)
        if (vUnknown === null || vUnknown === undefined) return null
        if (typeof vUnknown === 'string') return vUnknown
        try { return JSON.stringify(vUnknown) } catch { return String(vUnknown) }
      },
      set: async (key: string, value: string) => upstash.set(key, value),
      setEx: async (key: string, ttlSeconds: number, value: string) => upstash.set(key, value, { ex: ttlSeconds }),
      del: upstashDel,
      mGet: upstashMGet,
      scan: upstashScan,
      keys: upstashKeys,
      isOpen: true,
      isReady: true,
      connect: async () => {
        // No-op for Upstash
      },
      info: async () => {
        // Upstash does not expose INFO memory; return placeholders parsable by existing code
        return [
          "used_memory_human:N/A",
          "used_memory_peak_human:N/A",
          "total_system_memory_human:N/A",
        ].join("\r\n")
      },
    }
  }

  // Fallback: Node Redis client (useful locally or with Redis Cloud)
  const client: RedisClientType = createClient({ url: process.env.REDIS_URL })
  let connecting: Promise<unknown> | null = null

  const ensureConnected = async () => {
    if (client.isOpen) return
    if (!connecting) connecting = client.connect().catch((e: unknown) => { connecting = null; throw e })
    await connecting
  }

  const nodeScan = async (
    _cursor: number,
    options?: { MATCH?: string; COUNT?: number }
  ): Promise<{ cursor: number; keys: string[] }> => {
    await ensureConnected()
    const pattern = options?.MATCH ?? '*'
    const keys = await client.keys(pattern)
    return { cursor: 0, keys }
  }

  const nodeKeys = async (pattern: string): Promise<string[]> => {
    await ensureConnected()
    return await client.keys(pattern)
  }

  const nodeMGet = async (keys: string[]): Promise<(string | null)[]> => {
    await ensureConnected()
    if (!keys || keys.length === 0) return []
    // node-redis v4 supports array argument
    return await client.mGet(keys)
  }

  const nodeDel = async (keys: string | string[]): Promise<number> => {
    await ensureConnected()
    if (Array.isArray(keys)) {
      if (keys.length === 0) return 0
      return await client.del(keys)
    }
    return await client.del(keys)
  }

  return {
    get: async (key: string) => { await ensureConnected(); return await client.get(key) },
    set: async (key: string, value: string) => { await ensureConnected(); return await client.set(key, value) },
    setEx: async (key: string, ttlSeconds: number, value: string) => { await ensureConnected(); return await client.setEx(key, ttlSeconds, value) },
    del: nodeDel,
    mGet: nodeMGet,
    scan: nodeScan,
    keys: nodeKeys,
    get isOpen() { return Boolean(client.isOpen) },
    get isReady() { return Boolean(client.isReady) },
    connect: ensureConnected,
    info: async (section?: string) => { await ensureConnected(); return await client.info(section) },
  }
}

export const redis: RedisAdapter = createRedisAdapter()

// Initialize database
export const initializeGameState = (gameState: Partial<GameState>): GameState => {
  // Merge with default values to ensure all properties exist, especially gameStartTime
  const defaults: Partial<GameState> = {
    gameStartTime: undefined,
    log: [],
    players: [],
    discardPile: [],
    status: 'waiting',
    // Add other necessary defaults here if needed
  };

  return { ...defaults, ...gameState } as GameState;
}

// Database operations
export const db = {
  // Get a room by ID
  getRoom: async (roomId: string): Promise<GameState | null> => {
    const data = await redis.get(`room:${roomId}`)
    if (!data) return null
    return initializeGameState(JSON.parse(data))
  },
  
  // Store a new game state
  storeRoom: async (roomId: string, gameState: Partial<GameState>): Promise<void> => {
    await redis.set(`room:${roomId}`, JSON.stringify(gameState))
  },
  
  // Update an existing game state
  updateRoom: async (roomId: string, gameState: GameState): Promise<void> => {
    await redis.set(`room:${roomId}`, JSON.stringify(gameState))
  }
} 