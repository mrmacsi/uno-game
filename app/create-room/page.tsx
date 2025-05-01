"use client"
export const dynamic = "force-dynamic";

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createRoom } from "@/lib/room-actions"
import { Home, ArrowRight, Loader2 } from "lucide-react"
import { storePlayerIdInLocalStorage } from "@/lib/client-utils"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { AvatarDisplay } from "@/components/game/avatar-display"
import { PLAYER_ID_LOCAL_STORAGE_KEY } from "@/lib/client-utils"
import { cn } from "@/lib/utils"

const WINNING_SCORES = [100, 200, 300, 400, 500];

export default function CreateRoom() {
  const router = useRouter()
  const supabase = createClient()
  const [playerDisplayName, setPlayerDisplayName] = useState("")
  const [avatarIndexState, setAvatarIndexState] = useState<number | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [selectedWinningScore, setSelectedWinningScore] = useState<string>(WINNING_SCORES[WINNING_SCORES.length - 1].toString()) // Default to 500
  
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    
    const unoPlayerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY)

    if (!unoPlayerId) {
       setSubmitError("Cannot create room: Player ID missing.")
       console.error("CreateRoom Error: uno_player_id not found in localStorage")
       return
    }
    if (!playerDisplayName.trim()) {
      setSubmitError("Cannot create room: Player display name missing.")
      console.error("CreateRoom Error: playerDisplayName state is empty")
      return
    }
     if (avatarIndexState === null) {
      setSubmitError("Cannot create room: Player avatar missing.")
      console.error("CreateRoom Error: avatarIndex state is null")
      return
    }
    if (playerDisplayName.length > 15) {
      setSubmitError("Display Name must be 15 characters or less")
      return
    }

    setIsCreating(true)
    try {
      const hostPlayerInput = {
         id: unoPlayerId,
         name: playerDisplayName,
         avatarIndex: avatarIndexState!
      }
      
      const { roomId, playerId: returnedPlayerId } = await createRoom(hostPlayerInput, parseInt(selectedWinningScore, 10))
      
      storePlayerIdInLocalStorage(returnedPlayerId)
      
      router.push(`/room/${roomId}`)
    } catch (error) {
      console.error("Failed to create room:", error)
      setSubmitError(error instanceof Error ? error.message : "Could not create room. Please try again.")
      setIsCreating(false)
    }
  }

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true)
    setAvatarIndexState(null)
    const unoPlayerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY)

    if (!unoPlayerId) {
      console.error("No player ID found. Redirecting to setup.")
      router.push('/profile/setup')
      return
    }

    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('display_name, avatar_index')
        .eq('player_id', unoPlayerId)
        .single()

      if (error && status !== 406) {
        console.error("Error fetching profile:", error)
        router.push('/profile/setup')
      } else if (!data || !data.display_name || data.avatar_index === null) {
        console.error("Incomplete profile found (missing display name or avatar). Redirecting to setup.")
        router.push('/profile/setup')
      } else {
        setPlayerDisplayName(data.display_name)
        setAvatarIndexState(data.avatar_index)
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err)
      router.push('/profile/setup')
    } finally {
      setLoadingProfile(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-500 via-orange-400 to-yellow-300 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Loading Profile...</p>
      </div>
    )
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
          <CardTitle className="text-2xl font-bold tracking-tight text-center dark:text-white">Create a New Game Room</CardTitle>
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
              
              {/* Winning Score Selector */}
              <div>
                <Label htmlFor="winning-score" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Winning Score</Label>
                <div className="flex flex-wrap gap-2">
                  {WINNING_SCORES.map(score => (
                    <Button
                      key={score}
                      type="button"
                      variant={selectedWinningScore === score.toString() ? "default" : "outline"}
                      onClick={() => setSelectedWinningScore(score.toString())}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all duration-150",
                        selectedWinningScore === score.toString() 
                          ? "bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm border-transparent" 
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      )}
                    >
                      {score}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-1">First player to reach this score after a round wins.</p>
              </div>
              
              {submitError && (
                 <p className="text-red-500 text-xs mt-2 ml-1">{submitError}</p>
              )}
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-5 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70"
              disabled={isCreating || !playerDisplayName || avatarIndexState === null}
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