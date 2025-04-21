import { NextRequest, NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher-server"
import { getGameState, updateGameState } from "@/lib/db-actions"
import { v4 as uuidv4 } from "uuid"
import type { LogEntry } from "@/lib/types"
import { stripFunctionsFromGameState } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId, message } = await req.json()
    
    if (!roomId || !playerId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Get current game state
    const gameState = await getGameState(roomId)
    if (!gameState) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }
    
    // Find player
    const player = gameState.players.find(p => p.id === playerId)
    if (!player) {
      return NextResponse.json({ error: "Player not in room" }, { status: 403 })
    }
    
    // Create message log entry
    const newLogEntry: LogEntry = {
      id: uuidv4(),
      message: message,
      timestamp: Date.now(),
      player: player.name,
      avatarIndex: player.avatarIndex,
      eventType: 'message'
    }
    
    // Add to game log
    gameState.log.push(newLogEntry)
    
    // Limit log size
    if (gameState.log.length > 15) {
      gameState.log = gameState.log.slice(-15)
    }
    
    // Update game state
    await updateGameState(roomId, gameState)
    
    // Create a stripped down version of the state for broadcasting
    const broadcastState = { ...gameState }
    
    // Remove the large drawPile array to reduce payload size
    broadcastState.drawPile = []
    
    // Strip any functions to make it serializable
    const strippedState = stripFunctionsFromGameState(broadcastState)
    
    // Broadcast message to all clients with the stripped state
    try {
      await pusherServer.trigger(`game-${roomId}`, "game-updated", strippedState)
    } catch (error) {
      console.error("Error broadcasting game update:", error)
      // Message was still saved even if broadcast failed
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending game message:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
} 