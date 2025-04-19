import { NextResponse } from "next/server"
import { redis } from "@/lib/db" // Import the exported client

function parseRedisInfo(infoString: string): Record<string, string> {
  const lines = infoString.split("\r\n");
  const info: Record<string, string> = {};
  lines.forEach(line => {
    if (line && !line.startsWith("#")) {
      const parts = line.split(":");
      if (parts.length === 2) {
        info[parts[0]] = parts[1];
      }
    }
  });
  return info;
}

export async function GET() {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    const infoString = await redis.info("memory");
    const info = parseRedisInfo(infoString);
    
    // We don't need to keep the client connected after fetching info for this route
    // await redis.disconnect(); // Let's keep it connected as it's shared

    return NextResponse.json({ 
      used_memory_human: info.used_memory_human,
      used_memory_peak_human: info.used_memory_peak_human,
      total_system_memory_human: info.total_system_memory_human
    });
  } catch (error) {
    console.error("Error fetching Redis info:", error);
    // Ensure the client attempts reconnection if needed
    if (redis.isOpen) {
       // await redis.disconnect(); // Disconnect only if it was opened here, but we share it
    } else if (!redis.isReady){
        try { await redis.connect(); } catch (connectErr) { console.error("Error reconnecting redis", connectErr)}
    }
    return NextResponse.json({ error: "Failed to fetch Redis info" }, { status: 500 });
  }
} 