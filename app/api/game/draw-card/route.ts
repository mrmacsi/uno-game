import { NextRequest, NextResponse } from "next/server"
import { drawCard } from "@/lib/game-actions"

async function validateRequestBody(request: NextRequest): Promise<{ 
  roomId?: string; 
  playerId?: string; 
  error?: string; 
  status?: number 
}> {
  try {
    const body = await request.json();
    if (!body.roomId || typeof body.roomId !== 'string') {
      return { error: "Room ID is required and must be a string", status: 400 };
    }
    if (!body.playerId || typeof body.playerId !== 'string') {
      return { error: "Player ID is required and must be a string", status: 400 };
    }
    return { 
      roomId: body.roomId, 
      playerId: body.playerId 
    };
  } catch (e) {
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
    const updatedGameState = await drawCard(roomId!, playerId!);
    
    return NextResponse.json({ 
      message: `Player ${playerId} drew a card successfully in room ${roomId}`,
      gameState: updatedGameState
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    let status = 500;
    if (errorMessage.includes("Not your turn") || 
        errorMessage.includes("Already drew a card") ||
        errorMessage.includes("Game is not active")) {
      status = 400; 
    } else if (errorMessage.includes("Room not found") || errorMessage.includes("Player not found")) {
      status = 404;
    }

    return NextResponse.json(
      { error: `Failed to draw card: ${errorMessage}` },
      { status }
    );
  }
}
