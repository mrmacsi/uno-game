import { NextResponse } from "next/server"
import { getAllRooms } from "@/lib/room-actions"

export async function GET() {
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