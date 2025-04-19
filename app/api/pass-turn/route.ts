import { NextRequest, NextResponse } from "next/server"
import { passTurn } from "@/lib/game-actions"

// Basic request body validation
async function validateRequestBody(request: NextRequest): Promise<{ roomId?: string; playerId?: string; error?: string; status?: number }> {
  try {
    const body = await request.json();
    if (!body.roomId || typeof body.roomId !== 'string') {
      return { error: "Room ID is required and must be a string", status: 400 };
    }
    if (!body.playerId || typeof body.playerId !== 'string') {
      return { error: "Player ID is required and must be a string", status: 400 };
    }
    return { roomId: body.roomId, playerId: body.playerId };
  } catch (e) {
    console.error('Invalid JSON body:', e);
    return { error: "Invalid JSON body", status: 400 };
  }
}

export async function POST(request: NextRequest) {
  const validation = await validateRequestBody(request);
  if (validation.error) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { roomId, playerId } = validation;

  try {
    // Use the passTurn server action
    const updatedGameState = await passTurn(roomId!, playerId!);
    
    return NextResponse.json({ 
      message: `Player ${playerId} passed turn successfully in room ${roomId}`,
      gameState: updatedGameState
    }, { status: 200 });

  } catch (error: unknown) {
    console.error(`[API Pass Turn Error] Room: ${roomId}, Player: ${playerId}`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    // Determine appropriate status code based on error message
    let status = 500;
    if (errorMessage.includes("Not your turn") || 
        errorMessage.includes("Cannot pass unless") || 
        errorMessage.includes("Game is not active")) {
      status = 400; // Bad request from client
    } else if (errorMessage.includes("Room not found") || errorMessage.includes("Player not found")) {
      status = 404; // Resource not found
    }

    return NextResponse.json(
      { error: `Failed to pass turn: ${errorMessage}` },
      { status }
    );
  }
} 