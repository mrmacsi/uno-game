'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
// No longer need User type from supabase-js
import { useRouter } from 'next/navigation'
import AvatarSelector from '@/components/game/avatar-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface SelectedAvatarState { name: string; index: number }

// Accept playerId instead of user object
export default function ProfileSetupForm({ playerId }: { playerId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string>('')
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatarState | null>(null)
  const [initialCheckDone, setInitialCheckDone] = useState(false); // Track if initial load is done

  const getProfile = useCallback(async () => {
    if (!playerId) return; // Don't fetch if playerId isn't available yet

    try {
      setLoading(true)
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_name, avatar_index`)
        .eq('player_id', playerId) // Use player_id
        .single()

      // Error 406 means no row found, which is expected for new players
      if (error && status !== 406) {
        console.error('Error loading profile:', error)
        alert('Error loading profile data!')
        return
      }

      if (data) {
        setUsername(data.username || '')
        if (data.avatar_name && data.avatar_index !== null) {
           setSelectedAvatar({ name: data.avatar_name, index: data.avatar_index })
           // If profile already exists and is complete, redirect away
           // Do this check on the page level instead, to avoid layout shifts here
           // if (data.username) {
           //    router.push('/') 
           // }
        }
      }
    } catch (error) { // Catch any other unexpected errors
      console.error("Unexpected error loading profile:", error)
      alert('Error loading profile data!')
    } finally {
      setLoading(false)
      setInitialCheckDone(true) // Mark initial load attempt as done
    }
  }, [playerId, supabase]) // Removed router from dependencies

  useEffect(() => {
    getProfile()
  }, [playerId, getProfile]) // Depend on playerId

  async function updateProfile() {
    if (!username || !selectedAvatar) {
      alert('Please enter a username and select an avatar.')
      return
    }
    if (!playerId) {
      alert('Player ID is missing. Cannot save profile.')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.from('profiles').upsert({
        player_id: playerId, // Use player_id
        username: username,
        avatar_name: selectedAvatar.name,
        avatar_index: selectedAvatar.index,
        // updated_at is handled by the database trigger now
      })

      if (error) {
         // Handle potential duplicate username error
         if (error.message && error.message.includes('duplicate key value violates unique constraint \"profiles_username_key\"')) {
           alert('Username already taken. Please choose another one.')
         } else {
           throw error // Re-throw other errors
         }
      } else {
        alert('Profile saved successfully!')
        router.push('/') // Redirect to home after profile setup
      }
    } catch (error) { // Specify error type
      alert('Error saving the profile!')
      console.error("Caught error object:", error)
      if (error instanceof Error) {
         console.error("Error details:", error.message ?? "Message property not found on error object");
      } else {
         console.error("An unknown error occurred:", error);
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarSelect = (avatar: SelectedAvatarState) => {
    setSelectedAvatar(avatar)
  }

  // Show loading indicator until the initial profile check is complete
  if (!initialCheckDone) {
     return (
       <div className="flex justify-center items-center p-10">
         <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
       </div>
     )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Set Up Your Profile</CardTitle>
        <CardDescription>Choose a username and an avatar to represent you in the game.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input 
            id="username" 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="Enter your username (min 3 chars)" 
            required 
            minLength={3} 
          />
        </div>
        <div>
           <Label>Select Avatar</Label>
           {/* Pass existing selection to AvatarSelector if available */}
           {/* Need to modify AvatarSelector to accept initial selection */}
           <AvatarSelector onSelect={handleAvatarSelect} />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={updateProfile} disabled={loading || !username || !selectedAvatar} className="w-full">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Profile'}
        </Button>
      </CardFooter>
    </Card>
  )
} 