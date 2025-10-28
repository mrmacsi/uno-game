import { NextRequest, NextResponse } from "next/server"
import { joinRoom } from "@/lib/room-actions"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const roomId = body?.roomId as string | undefined
    const player = body?.player as { id: string; name: string; avatarIndex: number } | undefined

    if (!roomId || !player || !player.id || !player.name || typeof player.avatarIndex !== 'number') {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const playerId = await joinRoom(roomId, player)
    return NextResponse.json({ playerId }, { status: 200 })
  } catch (error) {
    console.error("[api/rooms/join] Failed:", error)
    const message = error instanceof Error ? error.message : "Failed to join room"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


