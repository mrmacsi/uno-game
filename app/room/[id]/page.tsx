import React from "react";
import { getRoom } from "@/lib/room-actions"; // Import getRoom
import type { GameState } from "@/lib/types";
import { AlertCircle, Home } from "lucide-react"; // Keep necessary icons
import Link from 'next/link';
import { Button } from "@/components/ui/button"; // Keep Button for error display
import RoomClientContent from "./room-client"; // Import the new client component
import { stripFunctionsFromGameState } from "@/lib/utils"; // Import the stripping utility
import type { NextPage } from 'next'; // <-- Added import

// Define the props type inline
type RoomPageParams = Promise<{ id: string }>; // <-- Changed this line

type RoomPageProps = { // <-- Added this wrapper type
  params: RoomPageParams;
};

// Define as React.FC
const RoomPage: NextPage<RoomPageProps> = async ({ params }) => { // <-- Type uses RoomPageProps
  const { id } = await params; // <-- Added await and destructure id
  const roomId = id.toUpperCase(); // <-- Use id
  let roomData: GameState | null = null;
  let error: string | null = null;

  try {
    roomData = await getRoom(roomId); // Use getRoom
    if (!roomData) {
      error = `Room ${roomId} not found.`; 
    }
  } catch (err) {
    console.error(`Error fetching room ${roomId}:`, err); // Add server-side logging
    error = err instanceof Error ? err.message : "Failed to load room data.";
  }

  if (error || !roomData) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700">
        {/* Simplified Error Display - No motion needed here */}
        <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full backdrop-blur-xl border border-white/20 dark:border-gray-800/40">
          <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
            <AlertCircle className="h-7 w-7" />
            <h2 className="text-xl sm:text-2xl font-bold">Error Loading Room</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-5 text-sm sm:text-base">
            {error || `Could not load room ${roomId}. It might not exist or there was a server issue.`}
          </p>
          <Link href="/" className="mt-4 block">
            <Button variant="outline" className="w-full"><Home className="w-4 h-4 mr-2"/> Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Strip non-serializable functions before passing to client component
  const serializableGameState = stripFunctionsFromGameState(roomData);

  // Pass the serializable data to the client component
  return <RoomClientContent initialGameState={serializableGameState} />;
};

export default RoomPage;

// Removed the RoomClientContent definition from here