import { NextRequest, NextResponse } from "next/server"
import { playCard } from "@/lib/game-actions"
import type { CardColor } from "@/lib/types"

const VALID_CHOSEN_COLORS: ReadonlyArray<CardColor> = ["red", "blue", "green", "yellow"];

async function validateRequestBody(request: NextRequest): Promise<{ 
  roomId?: string; 
  playerId?: string; 
  cardId?: string; 
  chosenColor?: CardColor; 
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
    if (!body.cardId || typeof body.cardId !== 'string') {
      return { error: "Card ID is required and must be a string", status: 400 };
    }
    if (body.chosenColor !== undefined) {
      if (typeof body.chosenColor !== 'string' || !VALID_CHOSEN_COLORS.includes(body.chosenColor as CardColor)) {
        return { error: "Chosen color is invalid", status: 400 };
      }
    }
    return { 
      roomId: body.roomId, 
      playerId: body.playerId, 
      cardId: body.cardId, 
      chosenColor: body.chosenColor as CardColor | undefined 
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

  const { roomId, playerId, cardId, chosenColor } = validation;

  try {
    const updatedGameState = await playCard(roomId!, playerId!, cardId!, chosenColor);
    
    return NextResponse.json({ 
      message: `Player ${playerId} played card ${cardId} successfully in room ${roomId}`,
      gameState: updatedGameState
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    let status = 500;
    if (errorMessage.includes("Not your turn") || 
        errorMessage.includes("Invalid card play") ||
        errorMessage.includes("Must choose a color") ||
        errorMessage.includes("Game is not active") ||
        errorMessage.includes("Card not found") ||
        errorMessage.includes("You must declare UNO")) {
      status = 400; 
    } else if (errorMessage.includes("Room not found") || errorMessage.includes("Player not found")) {
      status = 404;
    }

    return NextResponse.json(
      { error: `Failed to play card: ${errorMessage}` },
      { status }
    );
  }
}
