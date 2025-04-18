import { NextResponse } from "next/server"
import { createClient } from "redis"

export async function GET() {
  const redis = createClient({ url: process.env.REDIS_URL })
  await redis.connect()
  const keys = await redis.keys("room:*")
  await redis.disconnect()
  return NextResponse.json({ keys })
}

export async function POST() {
  const redis = createClient({ url: process.env.REDIS_URL })
  await redis.connect()
  const keys = await redis.keys("room:*")
  let deleted = 0
  for (const key of keys) {
    await redis.del(key)
    deleted++
  }
  await redis.disconnect()
  return NextResponse.json({ cleaned: true, deleted })
} 