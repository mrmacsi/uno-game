"use client"
export const dynamic = "force-dynamic";

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { storePlayerIdInLocalStorage, PLAYER_ID_LOCAL_STORAGE_KEY } from "@/lib/client-utils"
import { Home, KeyRound, ShieldAlert, ArrowRight, Globe, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { AvatarDisplay } from "@/components/game/avatar-display"

export default function JoinRoom() {
  const router = useRouter()
  const supabase = createClient()
  const [playerDisplayName, setPlayerDisplayName] = useState("")
  const [avatarIndexState, setAvatarIndexState] = useState<number | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [roomId, setRoomId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [nameError, setNameError] = useState("")
  const [roomIdError, setRoomIdError] = useState("")
  const [isDefault, setIsDefault] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    setAvatarIndexState(null);
    const playerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY);

    if (!playerId) {
      console.error("No player ID found. Redirecting to setup.");
      router.push('/profile/setup');
      return; 
    }

    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('display_name, avatar_index')
        .eq('player_id', playerId)
        .single();

      if (error && status !== 406) {
        console.error("Error fetching profile:", error);
        localStorage.removeItem(PLAYER_ID_LOCAL_STORAGE_KEY);
        router.push('/profile/setup');
      } else if (!data || !data.display_name || data.avatar_index === null) {
        console.error("Incomplete profile found (missing display name or avatar). Redirecting to setup.");
        localStorage.removeItem(PLAYER_ID_LOCAL_STORAGE_KEY);
        router.push('/profile/setup');
      } else {
        setPlayerDisplayName(data.display_name);
        setAvatarIndexState(data.avatar_index);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      localStorage.removeItem(PLAYER_ID_LOCAL_STORAGE_KEY);
      router.push('/profile/setup');
    } finally {
      setLoadingProfile(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchProfile();
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const roomIdParam = params.get('roomId')
      if (roomIdParam) {
        setRoomId(roomIdParam)
        setIsDefault(roomIdParam === "DEFAULT")
      }
    }
  }, [fetchProfile])

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setNameError("")
    setRoomIdError("")
    setError("")
    
    const playerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY);
    
    let hasError = false

    if (!playerId) {
      setError("Cannot join room: Player ID missing.");
      console.error("JoinRoom Error: playerId not found in localStorage");
      hasError = true;
    }
    if (!playerDisplayName.trim()) {
      setNameError("Player display name missing. Please check profile.")
      hasError = true
    }
    if (avatarIndexState === null) {
      setNameError("Player avatar missing. Please check profile.");
      hasError = true;
    }
    
    const finalRoomId = isDefault ? "DEFAULT" : roomId.trim().toUpperCase();
    if (!finalRoomId) { 
      setRoomIdError("Please enter a room code")
      hasError = true
    }
    
    if (hasError) return

    setIsJoining(true)

    try {
      const joiningPlayerInput = {
         id: playerId!,
         name: playerDisplayName,
         avatarIndex: avatarIndexState!
      };
      
      const resp = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: finalRoomId, player: joiningPlayerInput })
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data?.error || "Join room failed")
      }
      const { playerId: serverAssignedPlayerId } = await resp.json()
      
      storePlayerIdInLocalStorage(serverAssignedPlayerId)
      
      router.push(`/room/${finalRoomId}`)
    } catch (error: unknown) {
      console.error("Failed to join room:", error)
      if (error instanceof Error) {
        if (error.message.includes("Room not found")) {
          setRoomIdError("Room code not found. Please check and try again.");
        } else if (error.message.includes("Room is full")) {
          setError("This room is currently full.");
        } else if (error.message.includes("Game has already started")) {
          // If it's a game in progress, just redirect to the room
          // The player is not in this game, but we'll handle the error display in the room page
          router.push(`/room/${finalRoomId}`);
          return;
        } else {
          setError(error.message);
        }
      } else {
          setError("An unknown error occurred while joining the room.");
      }
      setIsJoining(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-purple-400 to-indigo-300 dark:from-blue-800 dark:via-purple-700 dark:to-indigo-600 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Loading Profile...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-purple-400 to-indigo-300 dark:from-blue-800 dark:via-purple-700 dark:to-indigo-600 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/20 dark:border-gray-800/50">
        <CardHeader className="p-5 sm:p-6 border-b dark:border-gray-800">
          <CardTitle className="text-2xl font-bold tracking-tight text-center dark:text-white">
            {isDefault ? "Join the Public Room" : "Join Game Room"}
          </CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400 pt-1">
            {isDefault 
              ? "Jump into the always-available public game!" 
              : "Enter the room code and your name to join."} 
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleJoinRoom}>
          <CardContent className="space-y-5 p-5 sm:p-6">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {!isDefault && (
                <div className="space-y-2">
                  <Label htmlFor="roomId" className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
                     <KeyRound className="h-4 w-4" />
                     Room Code
                  </Label>
                  <Input
                    id="roomId"
                    placeholder="Enter 4-letter code"
                    value={roomId}
                    onChange={(e) => {
                      setRoomId(e.target.value.toUpperCase())
                      if (roomIdError) setRoomIdError("")
                      if (error) setError("")
                    }}
                    className={`rounded-xl border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 dark:text-white transition-all uppercase tracking-widest ${roomIdError ? 'border-red-500 dark:border-red-500' : ''}`}
                    required
                    maxLength={4}
                    minLength={4}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  {roomIdError && (
                    <p className="text-red-500 text-xs mt-1 ml-1">{roomIdError}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                {avatarIndexState !== null ? (
                   <AvatarDisplay index={avatarIndexState} size="sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>
                )}
                 <div className="flex-grow min-w-0">
                   <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 block">
                     Playing as:
                   </Label>
                   <p className="text-base font-semibold text-gray-800 dark:text-white truncate">
                     {playerDisplayName}
                   </p>
                 </div>
              </div>
              {nameError && (
                 <p className="text-red-500 text-xs mt-1 ml-1">{nameError}</p>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-800/50"
                  >
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-5 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800">
            <Button 
              type="submit" 
              className={`w-full font-semibold py-3 rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70 ${isDefault ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 text-white'}`}
              disabled={isJoining || !playerDisplayName || (!isDefault && roomId.length !== 4)}
            >
              {isJoining ? "Joining..." : (isDefault ? "Join Public Room" : "Join Room")}
              {!isJoining && (isDefault ? <Globe className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />)}
            </Button>
             <Button 
               type="button" 
               variant="ghost" 
               className="w-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
               onClick={() => router.push('/')}
             >
               <Home className="mr-2 h-4 w-4" />
               Back to Home
             </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  )
}