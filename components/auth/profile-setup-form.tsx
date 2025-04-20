'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
// No longer need User type from supabase-js
import { useRouter } from 'next/navigation'
import AvatarSelector from '@/components/game/avatar-selector'
import { AvatarDisplay } from '@/components/game/avatar-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2, Edit, User, Wand2 } from 'lucide-react'
import { toast } from "sonner"
// Import the name generator
import { generateRandomName } from "@/lib/name-generator"
// Import avatars list for linking
import { avatars } from "@/lib/avatar-config"; 

interface SelectedAvatarState { name: string; index: number }

// Define state for alert dialog
interface AlertDialogState {
  isOpen: boolean;
  title: string;
  description: string;
}

// Rename playerId prop to unoPlayerId
export default function ProfileSetupForm({ unoPlayerId }: { unoPlayerId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false) // Separate state for saving action
  const [username, setUsername] = useState<string>('')
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatarState | null>(null)
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false); // Added for modal control
  const [alertDialog, setAlertDialog] = useState<AlertDialogState>({ isOpen: false, title: '', description: '' }); // Added for alert dialog

  // Function to show alert dialog
  const showAlert = (title: string, description: string) => {
    setAlertDialog({ isOpen: true, title, description });
  };

  // Function to set username and potentially link avatar
  const setUsernameAndLinkAvatar = useCallback((newName: string) => {
    setUsername(newName);
    // Check if name matches an avatar.
    const avatarIndex = avatars.findIndex(avatarName => newName.endsWith(avatarName)); 
    // REMOVED '&& currentAvatar === null' check. Always link if name matches.
    if (avatarIndex !== -1) { 
      const matchedAvatarName = newName.substring(newName.length - avatars[avatarIndex].length);
      // Directly set the avatar based on the new name match
      setSelectedAvatar({ name: matchedAvatarName, index: avatarIndex });
    }
    // If the new name doesn't match any avatar, the current avatar selection remains unchanged unless manually changed.
  }, []); // Still no dependencies needed

  const getProfile = useCallback(async () => {
    if (!unoPlayerId) return;

    try {
      setLoading(true)
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_name, avatar_index`)
        .eq('player_id', unoPlayerId)
        .single()

      let initialAvatar: SelectedAvatarState | null = null;
      if (error && status !== 406) {
        console.error('Error loading profile:', error);
        showAlert('Error', 'Failed to load profile data. Please try refreshing the page.');
        return;
      }

      if (data) {
        if (data.avatar_name && data.avatar_index !== null) {
           initialAvatar = { name: data.avatar_name, index: data.avatar_index };
           setSelectedAvatar(initialAvatar); // Set avatar if loaded
        }
        
        if (data.username) {
            setUsername(data.username) // Set existing username
            // If username exists but avatar doesn't, check if username links to an avatar
            if (!initialAvatar) {
                const avatarIndex = avatars.findIndex(avatarName => data.username.endsWith(avatarName));
                if (avatarIndex !== -1) {
                    const matchedAvatarName = data.username.substring(data.username.length - avatars[avatarIndex].length);
                    setSelectedAvatar({ name: matchedAvatarName, index: avatarIndex });
                }
            }
        } else {
            // No username exists, generate one and link avatar
            const newName = generateRandomName();
            setUsernameAndLinkAvatar(newName); 
        }
      } else {
        // No profile data at all, generate name and link avatar
        const newName = generateRandomName();
        setUsernameAndLinkAvatar(newName);
      }
    } catch (error) { 
      console.error("Unexpected error loading profile:", error);
      showAlert('Error', 'An unexpected error occurred while loading your profile.');
    } finally {
      setLoading(false);
      setInitialCheckDone(true);
    }
  // Depend on the helper function now
  }, [unoPlayerId, supabase, setUsernameAndLinkAvatar]); 

  useEffect(() => {
    if (unoPlayerId) {
      getProfile();
    } else {
      setLoading(false);
      setInitialCheckDone(true);
    }
  }, [unoPlayerId, getProfile]);

  const generateNewRandomName = () => {
    const newName = generateRandomName();
    // Call helper function without passing avatar state
    setUsernameAndLinkAvatar(newName);
  };

  async function updateProfile() {
    if (!username.trim() || !selectedAvatar) {
      showAlert('Missing Information', 'Please enter a username (at least 3 characters) and select an avatar.') // Use AlertDialog
      return
    }
    if (username.trim().length < 3) {
       showAlert('Invalid Username', 'Username must be at least 3 characters long.') // Use AlertDialog
       return
    }
    if (!unoPlayerId) {
      showAlert('Error', 'Player ID is missing. Cannot save profile.') // Use AlertDialog
      return
    }

    try {
      setSaving(true) // Use saving state
      const { error } = await supabase.from('profiles').upsert({
        player_id: unoPlayerId, 
        username: username.trim(), // Trim username
        avatar_name: selectedAvatar.name,
        avatar_index: selectedAvatar.index,
      })

      if (error) {
         if (error.message && error.message.includes('profiles_username_key')) {
           showAlert('Username Taken', 'This username is already taken. Please choose another one.') // Use AlertDialog
         } else {
           console.error('Error saving profile:', error);
           showAlert('Error', 'Failed to save profile. Please try again.'); // Use AlertDialog
         }
      } else {
        toast.success('Profile saved successfully!') // Use toast for success
        router.push('/') 
      }
    } catch (error) { 
      console.error("Caught error object:", error)
      showAlert('Error', 'An unexpected error occurred while saving your profile.') // Use AlertDialog
      if (error instanceof Error) {
         console.error("Error details:", error.message ?? "Message property not found on error object");
      } else {
         console.error("An unknown error occurred:", error);
      }
    } finally {
      setSaving(false) // Use saving state
    }
  }

  const handleAvatarSelect = (avatar: SelectedAvatarState) => {
    setSelectedAvatar(avatar)
    setIsAvatarModalOpen(false) // Close modal on selection
  }

  if (!initialCheckDone || loading) { // Show loader if still loading or initial check not done
     return (
       <div className="flex justify-center items-center p-10 min-h-[300px]"> 
         <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
       </div>
     )
  }

  return (
    <>
      <Card className="w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-gray-200 dark:border-gray-700/50 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <CardTitle className="text-3xl font-bold tracking-tight">Set Up Your Profile</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">Choose a username and avatar to get started.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="username" className="font-semibold text-gray-700 dark:text-gray-300">Username</Label>
              <Button 
                type="button" 
                variant="ghost"
                size="sm"
                onClick={generateNewRandomName}
                className="text-xs h-7 px-2 rounded-full flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Random
              </Button>
            </div>
            <Input 
              id="username" 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="e.g., PlayerOne" 
              required 
              minLength={3} 
              className="dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition duration-150 ease-in-out rounded-md"
            />
          </div>
          
          <div className="space-y-4">
             <Label className="font-semibold text-gray-700 dark:text-gray-300">Avatar</Label>
             <div className="flex items-center gap-5">
                {selectedAvatar ? (
                  <AvatarDisplay index={selectedAvatar.index} size="lg" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600">
                    <User className="h-8 w-8" />
                  </div>
                )}
                <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="dark:border-gray-600 dark:hover:bg-gray-800 transition duration-150 ease-in-out rounded-md">
                       <Edit className="mr-2 h-4 w-4" />
                       {selectedAvatar ? 'Change Avatar' : 'Select Avatar'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-950 rounded-lg p-6">
                    <DialogHeader className="sr-only"> 
                      <DialogTitle>Select Your Avatar</DialogTitle>
                    </DialogHeader>
                    <AvatarSelector onSelect={handleAvatarSelect} /> 
                    <DialogFooter className="mt-4">
                       <DialogClose asChild>
                         <Button type="button" variant="secondary" className="rounded-md">
                           Cancel
                         </Button>
                       </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
             </div>
             {!selectedAvatar && <p className="text-sm text-red-600 dark:text-red-400 pt-1">Please select an avatar.</p>}
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button 
            onClick={updateProfile} 
            disabled={saving || !username || !selectedAvatar || username.trim().length < 3} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-md transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Profile & Enter'}
          </Button>
        </CardFooter>
      </Card>

      {/* Alert Dialog Component */}
      <AlertDialog open={alertDialog.isOpen} onOpenChange={(isOpen) => setAlertDialog(prev => ({ ...prev, isOpen }))}>
        <AlertDialogContent className="rounded-lg bg-white dark:bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))} className="rounded-md">OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 