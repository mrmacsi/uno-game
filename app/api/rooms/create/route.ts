import { NextRequest, NextResponse } from "next/server"
import { createRoom } from "@/lib/room-actions"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const player = body?.player as { id: string; name: string; avatarIndex: number } | undefined

    if (!player || !player.id || !player.name || typeof player.avatarIndex !== 'number') {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const { roomId, playerId } = await createRoom(player)
    return NextResponse.json({ roomId, playerId }, { status: 200 })
  } catch (error) {
    console.error("[api/rooms/create] Failed:", error)
    const message = error instanceof Error ? error.message : "Failed to create room"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


