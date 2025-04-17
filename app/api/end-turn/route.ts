import { NextRequest, NextResponse } from "next/server"
import { endTurn } from "@/lib/game-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, playerId } = body
    
    if (!roomId || !playerId) {
      return NextResponse.json(
        { error: "Room ID and Player ID are required" },
        { status: 400 }
      )
    }
    
    await endTurn(roomId, playerId)
    
    return NextResponse.json(
      { message: "Turn ended successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error ending turn:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to end turn"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 