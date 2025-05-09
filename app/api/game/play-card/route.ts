import { NextRequest, NextResponse } from "next/server"
import { playCard } from "@/lib/game-actions"
import type { Card, CardColor } from "@/lib/types"

const VALID_CHOSEN_COLORS: ReadonlyArray<CardColor> = ["red", "blue", "green", "yellow"];

async function validateRequestBody(request: NextRequest): Promise<{ 
  roomId?: string; 
  playerId?: string; 
  card?: Card; 
  chosenColor?: CardColor; 
  error?: string; 
  status?: number 
}> {
  let body;
  try {
    body = await request.json();
    console.log("[API /play-card] Received body:", body);
  } catch (e) {
    console.error("[API /play-card] Invalid JSON body:", e);
    return { error: "Invalid JSON body", status: 400 };
  }

  if (!body.roomId || typeof body.roomId !== 'string') {
    return { error: "Room ID is required and must be a string", status: 400 };
  }
  if (!body.playerId || typeof body.playerId !== 'string') {
    return { error: "Player ID is required and must be a string", status: 400 };
  }
  if (!body.card || typeof body.card !== 'object' || body.card === null) {
    return { error: "Card object is required", status: 400 };
  }
  if (typeof body.card.id !== 'string') {
    return { error: "Card ID is required within the card object and must be a string", status: 400 };
  }

  if (body.chosenColor !== undefined) {
    if (typeof body.chosenColor !== 'string' || !VALID_CHOSEN_COLORS.includes(body.chosenColor as CardColor)) {
      return { error: "Chosen color is invalid", status: 400 };
    }
  }
  return { 
    roomId: body.roomId, 
    playerId: body.playerId, 
    card: body.card as Card, 
    chosenColor: body.chosenColor as CardColor | undefined 
  };
}

export async function POST(request: NextRequest) {
  console.log("[API /play-card] Received POST request");
  const validation = await validateRequestBody(request);
  
  if (validation.error) {
    console.error("[API /play-card] Validation error:", validation.error);
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const { roomId, playerId, card, chosenColor } = validation;
  console.log("[API /play-card] Validation successful, calling playCard action with:", { roomId, playerId, card, chosenColor });

  try {
    if (!card) {
        console.error("[API /play-card] Critical: Card object is undefined after validation.");
        return NextResponse.json({ error: "Internal server error: Card data missing after validation" }, { status: 500 });
    }
    const updatedGameState = await playCard(roomId!, playerId!, card, chosenColor);
    
    return NextResponse.json({ 
      message: `Player ${playerId} played card ${card.id} successfully in room ${roomId}`,
      gameState: updatedGameState
    }, { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error(`[API /play-card] Error for room ${roomId}, player ${playerId}, card ${card?.id}. Message: ${errorMessage}`);
    
    let status = 500;
    if (errorMessage.includes("Not your turn") || 
        errorMessage.includes("Invalid card play") ||
        errorMessage.includes("Must choose a color") ||
        errorMessage.includes("Game is not active") ||
        errorMessage.includes("Card not found") ||
        errorMessage.includes("Card ID is required") ||
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
