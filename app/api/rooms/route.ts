import { NextRequest, NextResponse } from "next/server"
import { getAllRooms } from "@/lib/game-actions"

export async function GET(request: NextRequest) {
  try {
    const rooms = await getAllRooms()
    
    return NextResponse.json({ rooms }, { status: 200 })
  } catch (error) {
    console.error("Error getting rooms:", error)
    return NextResponse.json(
      { error: "Failed to get rooms" },
      { status: 500 }
    )
  }
} 