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
  } catch (error: any) {
    console.error("Error ending turn:", error)
    return NextResponse.json(
      { error: error.message || "Failed to end turn" },
      { status: 500 }
    )
  }
} 