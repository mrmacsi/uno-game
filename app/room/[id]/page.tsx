import React from "react";
import { getRoom, createDefaultRoom } from "@/lib/room-actions";
import type { GameState } from "@/lib/types";
import { AlertCircle, Home } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import RoomClientContent from "./room-client";
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl max-w-md w-full backdrop-blur-xl border border-white/20 dark:border-gray-800/40">
          <div className="flex items-center gap-3 mb-6 text-red-600 dark:text-red-400">
            <AlertCircle className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Room Not Found</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-8 text-base leading-relaxed">
            {error}
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/join-room" className="w-full">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                Join Another Room
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2"/> 
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const serializableGameState = stripFunctionsFromGameState(roomData);
  return <RoomClientContent initialGameState={serializableGameState} />;
};

export default RoomPage;