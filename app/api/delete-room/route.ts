import { NextRequest, NextResponse } from "next/server"
import { deleteRoom } from "@/lib/room-actions"

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
    
    // Delete the room
    await deleteRoom(roomId)
    
    return NextResponse.json(
      { message: `Room ${roomId} has been deleted successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting room:", error)
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    )
  }
} 