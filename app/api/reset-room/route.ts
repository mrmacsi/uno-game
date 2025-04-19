import { NextRequest, NextResponse } from "next/server"
import { resetRoom } from "@/lib/room-actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId } = body
    
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      )
    }
    
    // Reset the room
    await resetRoom(roomId)
    
    return NextResponse.json(
      { message: `Room ${roomId} has been reset successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error resetting room:", error)
    return NextResponse.json(
      { error: "Failed to reset room" },
      { status: 500 }
    )
  }
} 