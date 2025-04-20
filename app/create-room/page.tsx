"use client"
export const dynamic = "force-dynamic";

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createRoom } from "@/lib/room-actions"
import { Home, User, ArrowRight, Loader2 } from "lucide-react"
import { storePlayerIdInLocalStorage } from "@/lib/client-utils"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"

const LOCAL_STORAGE_KEY = 'uno_player_id'

export default function CreateRoom() {
  const router = useRouter()
  const supabase = createClient()
  const [playerName, setPlayerName] = useState("")
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [submitError, setSubmitError] = useState("")
  
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    
    if (playerName.length > 15) {
      setSubmitError("Name must be 15 characters or less")
      return
    }

    if (!playerName.trim()) {
      setSubmitError("Player name missing. Please setup profile.")
      return
    }

    setIsCreating(true)
    try {
      const { roomId, playerId } = await createRoom(playerName)
      
      storePlayerIdInLocalStorage(playerId)
      
      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error("Failed to create room:", error)
      setSubmitError(error instanceof Error ? error.message : "Could not create room. Please try again.")
      setIsCreating(false)
    }
  }

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    const playerId = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!playerId) {
      console.error("No player ID found. Redirecting to setup.");
      router.push('/profile/setup');
      return;
    }

    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('username')
        .eq('player_id', playerId)
        .single();

      if (error && status !== 406) {
        console.error("Error fetching profile:", error);
        router.push('/profile/setup');
      } else if (!data || !data.username) {
        console.error("Incomplete profile found. Redirecting to setup.");
        router.push('/profile/setup');
      } else {
        setPlayerName(data.username);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
      router.push('/profile/setup');
    } finally {
      setLoadingProfile(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-500 via-orange-400 to-yellow-300 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Loading Profile...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-500 via-orange-400 to-yellow-300 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/20 dark:border-gray-800/50">
        <CardHeader className="p-5 sm:p-6 border-b dark:border-gray-800">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">Create a New Game Room</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400 pt-1">
            Set up a private room and invite your friends!
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateRoom}>
          <CardContent className="p-5 sm:p-6">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <User className="h-4 w-4" />
                  <span>Playing as:</span>
                </Label>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 pl-5 truncate">
                  {playerName} 
                </p>
                {submitError && (
                  <p className="text-red-500 text-xs mt-1 ml-1 pl-5">{submitError}</p>
                )}
              </div>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-5 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70"
              disabled={isCreating || !playerName}
            >
              {isCreating ? "Creating Room..." : "Create Room"}
              {!isCreating && <ArrowRight className="ml-2 h-4 w-4" />}
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