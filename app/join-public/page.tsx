"use client"
export const dynamic = "force-dynamic";

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { joinRoom } from "@/lib/room-actions" // We might need a modified join or a check before joining
import { Home, Globe, Loader2 } from "lucide-react"
import { storePlayerIdInLocalStorage } from "@/lib/client-utils"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"
import { AvatarDisplay } from "@/components/game/avatar-display"
import { PLAYER_ID_LOCAL_STORAGE_KEY } from "@/lib/client-utils"
import { cn } from "@/lib/utils"

const WINNING_SCORES = [100, 200, 300, 400, 500];
const DEFAULT_ROOM_ID = "DEFAULT";

export default function JoinPublicRoom() {
  const router = useRouter()
  const supabase = createClient()
  const [playerDisplayName, setPlayerDisplayName] = useState("")
  const [avatarIndexState, setAvatarIndexState] = useState<number | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [selectedWinningScore, setSelectedWinningScore] = useState<string>(WINNING_SCORES[WINNING_SCORES.length - 1].toString()) // Default to 500
  
  const handleJoinPublicRoom = async () => {
    setSubmitError("")
    const unoPlayerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY)

    if (!unoPlayerId || !playerDisplayName.trim() || avatarIndexState === null) {
       setSubmitError("Cannot join room: Player profile incomplete.")
       console.error("JoinPublicRoom Error: Missing player ID, name, or avatar.")
       // Optionally redirect to setup if profile is the issue
       // router.push('/profile/setup');
       return
    }
    
    setIsJoining(true)
    try {
      const playerInput = {
         id: unoPlayerId,
         name: playerDisplayName,
         avatarIndex: avatarIndexState!
      }
      
      const scoreToSet = parseInt(selectedWinningScore, 10);
      const returnedPlayerId = await joinRoom(DEFAULT_ROOM_ID, playerInput, scoreToSet)
      
      storePlayerIdInLocalStorage(returnedPlayerId)
      router.push(`/room/${DEFAULT_ROOM_ID}`)
      
    } catch (error) {
      console.error("Failed to join public room:", error)
      setSubmitError(error instanceof Error ? error.message : "Could not join public room. Please try again.")
    } finally {
      setIsJoining(false)
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
        console.error("Incomplete profile found. Redirecting to setup.")
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-300 dark:from-emerald-800 dark:via-teal-700 dark:to-cyan-600 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Loading Profile...</p>
      </div>
    )
  }

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-300 dark:from-emerald-800 dark:via-teal-700 dark:to-cyan-600 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-white/20 dark:border-gray-800/50">
        <CardHeader className="p-5 sm:p-6 border-b dark:border-gray-800">
          <CardTitle className="text-2xl font-bold tracking-tight text-center dark:text-white">Join the Public Room</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400 pt-1">
            Confirm your details and choose the score limit.
          </CardDescription>
        </CardHeader>
        {/* Removed form tag as it's not submitting in the traditional sense */}
          <CardContent className="p-5 sm:p-6">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Profile Display */}
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
              
              {/* Winning Score Buttons */}
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Winning Score</Label>
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
                          ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm border-transparent" 
                          : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                      )}
                    >
                      {score}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-1">Score target for this public game session.</p>
              </div>
              
              {submitError && (
                 <p className="text-red-500 text-xs mt-2 ml-1">{submitError}</p>
              )}
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-5 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-800">
            <Button 
              type="button" // Changed from submit
              onClick={handleJoinPublicRoom}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-3 rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70"
              disabled={isJoining || !playerDisplayName || avatarIndexState === null}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Join Public Room
                </>
              )}
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
        {/* Removed closing form tag */}
      </Card>
    </motion.div>
  )
} 