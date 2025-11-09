import React from "react";
import { getRoom, createDefaultRoom } from "@/lib/room-actions";
import type { GameState } from "@/lib/types";
import RoomClientContent from "./room-client";
import RoomError from "./room-error";
import { stripFunctionsFromGameState } from "@/lib/utils";
import type { NextPage } from 'next';

type RoomPageParams = Promise<{ id: string }>;

type RoomPageProps = {
  params: RoomPageParams;
};

const RoomPage: NextPage<RoomPageProps> = async ({ params }) => {
  const { id } = await params;
  const roomId = id.toUpperCase();
  let roomData: GameState | null = null;
  let error: string | null = null;

  try {
    roomData = await getRoom(roomId);
    if (!roomData && roomId === "DEFAULT") {
      await createDefaultRoom();
      roomData = await getRoom(roomId);
    }
    if (!roomData) {
      error = `Room ${roomId} not found. The room may have been deleted or never existed.`;
    }
  } catch (err) {
    console.error(`Error fetching room ${roomId}:`, err);
    error = err instanceof Error 
      ? err.message 
      : "An unexpected error occurred while loading the room. Please try again later.";
  }

  if (error || !roomData) {
    return <RoomError error={error || "Unknown error"} />;
  }

  const serializableGameState = stripFunctionsFromGameState(roomData);
  return <RoomClientContent initialGameState={serializableGameState} />;
};

export default RoomPage;