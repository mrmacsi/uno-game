import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";
import { getGameState, updateGameState } from "@/lib/db-actions";
import { GameState } from "@/lib/types"; // Assuming GameState is defined here
import { v4 as uuidv4 } from "uuid";
import { stripFunctionsFromGameState } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, playerId, fromPlayerId, toPlayerId } = body;

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    const gameState = await getGameState(roomId);
    if (!gameState) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Scenario 1: Player is declaring UNO for themselves (typically a bot)
    if (playerId && !toPlayerId) {
      const player = gameState.players.find(p => p.id === playerId);
      if (!player) {
        return NextResponse.json({ error: "Player not found in room for UNO declaration" }, { status: 404 });
      }

      // Update player's saidUno status
      player.saidUno = true;

      // Add a log entry for UNO declaration
      if (!gameState.log) {
        gameState.log = [];
      }
      const unoLogEntry = {
        id: uuidv4(),
        message: `${player.name} declared UNO!`,
        timestamp: Date.now(),
        player: player.name,
        eventType: 'uno' as const, // Ensure literal type
        avatarIndex: player.avatarIndex
      };
      gameState.log.push(unoLogEntry);
      
      console.log(`[RING API] Player ${player.name} (ID: ${playerId}) declared UNO in room ${roomId}.`);

      // Save the updated game state
      await updateGameState(roomId, gameState as GameState);

      // Trigger a Pusher event to update all clients
      const strippedState = stripFunctionsFromGameState(gameState as GameState);
      await pusherServer.trigger(`presence-room-${roomId}`, "game-state-updated", strippedState);
      
      return NextResponse.json({ success: true, message: "UNO declared successfully." });

    } 
    // Scenario 2: A player is "ringing" (challenging) another player
    else if (fromPlayerId && toPlayerId) {
      const fromPlayer = gameState.players.find(p => p.id === fromPlayerId);
      const targetPlayer = gameState.players.find(p => p.id === toPlayerId); // Renamed for clarity

      if (!fromPlayer || !targetPlayer) {
        return NextResponse.json({ error: "One or both players not in room for ring action" }, { status: 403 });
      }

      const ringPayload = {
        from: {
          id: fromPlayer.id,
          name: fromPlayer.name,
          avatarIndex: fromPlayer.avatarIndex
        },
        toPlayerName: targetPlayer.name, // It might be useful for the recipient to know who was targeted
        timestamp: Date.now()
      };
      
      console.log(`[RING API] Sending ring notification from ${fromPlayer.name} to player ${targetPlayer.name} (ID: ${toPlayerId})`);
      
      try {
        const targetChannel = `private-player-${toPlayerId}`;
        await pusherServer.trigger(targetChannel, "player-ringed", ringPayload);
        console.log(`[RING API] Successfully sent ring notification to channel: ${targetChannel}`);
        
        // Potentially add a log entry for this type of ring action too
        if (!gameState.log) {
            gameState.log = [];
        }
        gameState.log.push({
            id: uuidv4(),
            message: `${fromPlayer.name} called out ${targetPlayer.name}!`,
            timestamp: Date.now(),
            player: fromPlayer.name,
            eventType: 'system' as const, // Or a new specific eventType like 'challenge'
            avatarIndex: fromPlayer.avatarIndex
        });
        await updateGameState(roomId, gameState as GameState); // Save state with new log
        const strippedStateForChallenge = stripFunctionsFromGameState(gameState as GameState);
        await pusherServer.trigger(`presence-room-${roomId}`, "game-state-updated", strippedStateForChallenge); // Notify all about the log


        return NextResponse.json({ success: true, message: "Ring notification sent." });
      } catch (pusherError) {
        console.error("[RING API] Pusher error:", pusherError);
        return NextResponse.json({ 
          error: "Failed to send notification through Pusher",
          details: pusherError instanceof Error ? pusherError.message : "Unknown Pusher error" 
        }, { status: 500 });
      }
    } 
    // Invalid combination of parameters
    else {
      return NextResponse.json({ error: "Invalid parameters for ring action. Provide 'playerId' for self-UNO or 'fromPlayerId' and 'toPlayerId' for challenging." }, { status: 400 });
    }

  } catch (error) {
    console.error("[RING API] Error processing ring notification:", error);
    return NextResponse.json({ 
      error: "Failed to process ring request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
