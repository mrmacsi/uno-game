import { NextResponse } from "next/server"
import { clearDb, storeGameState, getGameState } from "@/lib/db-actions"

export async function POST() {
  try {
    const deletedKeys = await clearDb()
    const defaultRoom = await getGameState("DEFAULT")
    if (defaultRoom) {
      defaultRoom.players = []
      defaultRoom.matchHistory = []
      defaultRoom.log = []
      await storeGameState("DEFAULT", defaultRoom)
    }
    return NextResponse.json({ message: `Cleared ${deletedKeys.length} rooms from Redis and emptied DEFAULT room.`, deleted: deletedKeys.length }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to clear Redis" }, { status: 500 })
  }
} 