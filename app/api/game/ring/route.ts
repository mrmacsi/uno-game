import { NextRequest, NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher-server"
import { getGameState } from "@/lib/db-actions"

export async function POST(req: NextRequest) {
  try {
    const { roomId, fromPlayerId, toPlayerId } = await req.json()
    
    if (!roomId || !fromPlayerId || !toPlayerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Get current game state
    const gameState = await getGameState(roomId)
    if (!gameState) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }
    
    // Find both players
    const fromPlayer = gameState.players.find(p => p.id === fromPlayerId)
    const toPlayer = gameState.players.find(p => p.id === toPlayerId)
    
    if (!fromPlayer || !toPlayer) {
      return NextResponse.json({ error: "Player not in room" }, { status: 403 })
    }
    
    // Create a small payload with only the essential data
    const ringPayload = {
      from: {
        id: fromPlayer.id,
        name: fromPlayer.name,
        avatarIndex: fromPlayer.avatarIndex
      },
      timestamp: Date.now()
    }
    
    console.log(`[RING API] Sending ring notification from ${fromPlayer.name} to player ${toPlayerId}`)
    
    // Send ring notification directly via Pusher to specific player
    try {
      const targetChannel = `private-player-${toPlayerId}`
      await pusherServer.trigger(targetChannel, "player-ringed", ringPayload)
      console.log(`[RING API] Successfully sent ring notification to channel: ${targetChannel}`)
      
      return NextResponse.json({ success: true })
    } catch (pusherError) {
      console.error("[RING API] Pusher error:", pusherError)
      return NextResponse.json({ 
        error: "Failed to send notification through Pusher",
        details: pusherError instanceof Error ? pusherError.message : "Unknown Pusher error" 
      }, { status: 500 })
    }
  } catch (error) {
    console.error("[RING API] Error processing ring notification:", error)
    return NextResponse.json({ 
      error: "Failed to send notification",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 