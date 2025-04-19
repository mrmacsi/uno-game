import { NextResponse } from "next/server"
// Reuse the exported client from db.ts for consistency
import { redis } from "@/lib/db" 

export async function GET() {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    const keys = await redis.keys("room:*")
    let keyValues: Record<string, string | null> = {};
    if (keys.length > 0) {
      // Use MGET for efficient fetching of multiple values
      const values = await redis.mGet(keys);
      keys.forEach((key, index) => {
        // Attempt to parse JSON, fallback to raw string if error
        try {
           keyValues[key] = values[index] ? JSON.parse(values[index]!) : null;
        } catch (e) {
           keyValues[key] = values[index]; // Store raw string if not JSON
        }
      });
    }
    // Don't disconnect the shared client
    return NextResponse.json({ keyValues });
  } catch (error) {
    console.error("Error fetching Redis keys/values:", error);
    // Attempt to reconnect if necessary
    if (!redis.isReady) {
       try { await redis.connect(); } catch (connectErr) { console.error("Error reconnecting redis", connectErr)}
    }
    return NextResponse.json({ error: "Failed to fetch Redis data" }, { status: 500 });
  }
}

export async function POST() {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    const keys = await redis.keys("room:*")
    let deleted = 0
    if (keys.length > 0) {
       deleted = await redis.del(keys) // DEL can take multiple keys
    }
    // Don't disconnect the shared client
    return NextResponse.json({ cleaned: true, deleted })
  } catch (error) {
     console.error("Error cleaning Redis keys:", error);
     if (!redis.isReady) {
       try { await redis.connect(); } catch (connectErr) { console.error("Error reconnecting redis", connectErr)}
     }
     return NextResponse.json({ error: "Failed to clean Redis data" }, { status: 500 });
  }
} 