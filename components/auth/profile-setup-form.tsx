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
import { Loader2, Edit, User, Wand2, LogOut, CheckCircle, LogIn } from 'lucide-react'
import { toast } from "sonner"
// Import the name generator
import { generateRandomName, adjectives } from "@/lib/name-generator"
// Import avatars list for linking
import { avatars } from "@/lib/avatar-config"; 

interface SelectedAvatarState { name: string; index: number }

// Define state for alert dialog
interface AlertDialogState {
  isOpen: boolean;
  title: string;
  description: string;
}

// Define localStorage key here too for the logout function
const LOCAL_STORAGE_KEY = 'uno_player_id';

// Define view modes
type ViewMode = 'setup' | 'login' | 'loading';

// Rename playerId prop to unoPlayerId
export default function ProfileSetupForm({ unoPlayerId: propUnoPlayerId }: { unoPlayerId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('loading'); // Initial state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false) // Separate state for saving action
  const [loggingIn, setLoggingIn] = useState(false); // Logging in state
  const [username, setUsername] = useState<string>('')
  const [loginUsername, setLoginUsername] = useState<string>(''); // For login form
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatarState | null>(null)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false); // Added for modal control
  const [alertDialog, setAlertDialog] = useState<AlertDialogState>({ isOpen: false, title: '', description: '' }); // Added for alert dialog
  // Store the player ID being worked on (could be from prop or login)
  const [currentUnoPlayerId, setCurrentUnoPlayerId] = useState<string>(propUnoPlayerId || '');

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

  const getProfile = useCallback(async (idToCheck: string) => {
    if (!idToCheck) {
      setViewMode('login'); // No ID? Default to Login view
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, avatar_name, avatar_index`)
        .eq('player_id', idToCheck)
        .single()

      if (error && status !== 406) {
        console.error('Error loading profile, clearing ID and showing login:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setCurrentUnoPlayerId(''); // Clear the ID state
        setViewMode('login');
      } else if (data) {
        // Profile data found (complete or incomplete)
        setUsername(data.username || ''); // Load username or empty string
        setSelectedAvatar(data.avatar_name && data.avatar_index !== null ? { name: data.avatar_name, index: data.avatar_index } : null);
        setCurrentUnoPlayerId(idToCheck); // Store the valid ID
        setViewMode('setup'); // Go directly to setup/edit view
        if (!data.username || data.avatar_name === null || data.avatar_index === null) {
             // If incomplete, maybe generate part of the name if username is missing
             if (!data.username) {
                 setUsernameAndLinkAvatar(generateRandomName());
             }
             toast.info("Please complete your profile.");
        }
      } else {
         // No profile data found for this ID
         console.log('No profile found for this ID, clearing ID and showing login.');
         localStorage.removeItem(LOCAL_STORAGE_KEY);
         setCurrentUnoPlayerId('');
         setViewMode('login');
      }
    } catch (error) {
      console.error("Unexpected error loading profile:", error);
      showAlert('Error', 'An unexpected error occurred while loading your profile.');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCurrentUnoPlayerId('');
      setViewMode('login');
    } finally {
      setLoading(false);
    }
  }, [supabase, setUsernameAndLinkAvatar]);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem(LOCAL_STORAGE_KEY);
    getProfile(storedPlayerId || '');
  }, [getProfile]);

  const generateNewRandomName = () => {
    const newName = generateRandomName();
    setUsernameAndLinkAvatar(newName); // Use helper for setup form
  };

  async function updateProfile() {
    if (!username.trim() || !selectedAvatar || username.trim().length < 3) {
         showAlert('Missing Information', 'Please ensure username is at least 3 characters and an avatar is selected.');
         return;
    }
     // Use currentUnoPlayerId which might have been set by getProfile or login
    if (!currentUnoPlayerId) {
        showAlert('Error', 'No Player ID found. Please try logging in again.');
        return;
    }

    try {
      setSaving(true)
      const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('player_id')
          .eq('username', username.trim())
          .neq('player_id', currentUnoPlayerId) // Check for other users with this name
          .single();

      if (checkError && checkError.code !== 'PGRST116') { throw checkError; }

      if (existingUser) {
          showAlert('Username Taken', 'This username is already taken. Please choose another one.');
          setSaving(false);
          return;
      }

      const { error } = await supabase.from('profiles').upsert({
        player_id: currentUnoPlayerId, // Use the stored/loaded ID
        username: username.trim(),
        avatar_name: selectedAvatar.name,
        avatar_index: selectedAvatar.index,
        updated_at: new Date(),
      })

      if (error) throw error;

      // If the ID in local storage doesn't match the one we just saved
      // (e.g., profile was created without an initial ID), store the correct one.
      if (localStorage.getItem(LOCAL_STORAGE_KEY) !== currentUnoPlayerId) {
          localStorage.setItem(LOCAL_STORAGE_KEY, currentUnoPlayerId);
      }

      toast.success('Profile saved successfully!')
      router.push('/') // Redirect to main page after save
    } catch (error: any) {
      console.error("Error saving profile:", error)
      if (error.message && error.message.includes('profiles_username_key')) {
           showAlert('Username Taken', 'This username is already taken.')
      } else {
           showAlert('Error', 'An unexpected error occurred while saving your profile.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Handler for the Login form's "Login" button
  const handleLogin = async () => {
    if (!loginUsername.trim()) {
        showAlert('Missing Username', 'Please enter your username.');
        return;
    }
    setLoggingIn(true);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('player_id, username, avatar_name, avatar_index') // Select all fields
            .eq('username', loginUsername.trim())
            .single();

        if (error && error.code !== 'PGRST116') { throw error; }

        if (data && data.player_id) {
            // Profile found
            localStorage.setItem(LOCAL_STORAGE_KEY, data.player_id);
            setCurrentUnoPlayerId(data.player_id); // Update state ID

            if (!data.username || data.avatar_name === null || data.avatar_index === null) {
                // Profile incomplete - go to setup view to complete
                toast.info("Profile incomplete. Please finish setup.");
                setUsername(data.username || '');
                setSelectedAvatar(data.avatar_name && data.avatar_index !== null ? { name: data.avatar_name, index: data.avatar_index } : null);
                setViewMode('setup');
            } else {
                // Profile complete - redirect directly to main page
                toast.success(`Welcome back, ${data.username}!`);
                router.push('/');
            }
        } else {
            // Username not found
            showAlert('Login Failed', 'Username not found. Please check the username or create a new profile.');
        }
    } catch (error) {
        console.error("Login error:", error);
        showAlert('Error', 'An error occurred during login. Please try again.');
    } finally {
        setLoggingIn(false);
    }
  };

  const handleAvatarSelect = (avatar: SelectedAvatarState) => {
    setSelectedAvatar(avatar);
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const newUsername = `${randomAdjective}${avatar.name}`;
    setUsername(newUsername); // Update setup username
    setIsAvatarModalOpen(false);
  };

  // Render Loading State
  if (viewMode === 'loading' || loading) {
     return (
       <div className="flex justify-center items-center p-10 min-h-[300px]">
         <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
       </div>
     )
  }

  // Main Render Logic based on viewMode
  return (
    <>
      <Card className="w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border border-gray-200 dark:border-gray-700/50 shadow-xl rounded-2xl overflow-hidden">

        {/* === Profile Setup/Edit View === */}
        {viewMode === 'setup' && (
          <>
            <CardHeader className="text-center pt-8 pb-4">
              {/* Change title dynamically based on whether we are editing */}
              <CardTitle className="text-3xl font-bold tracking-tight">
                {currentUnoPlayerId ? 'Edit Your Profile' : 'Set Up Your Profile'}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                 {currentUnoPlayerId ? 'Update your username and avatar.' : 'Choose a username and avatar to get started.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
               {/* Username Input */}
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <Label htmlFor="username" className="font-semibold text-gray-700 dark:text-gray-300">Username</Label>
                   <Button type="button" variant="ghost" size="sm" onClick={generateNewRandomName} className="text-xs h-7 px-2 rounded-full flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                     <Wand2 className="h-3.5 w-3.5" /> Random
                   </Button>
                 </div>
                 <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., PlayerOne" required minLength={3} className="dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition duration-150 ease-in-out rounded-md" />
               </div>
               {/* Avatar Selection - Center this whole block */}
               <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                   <Label className="font-semibold text-gray-700 dark:text-gray-300 self-center">Avatar</Label> 
                   {/* This div now just holds the avatar and button, centering is handled by parent */}
                   <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
                     {selectedAvatar ? <AvatarDisplay index={selectedAvatar.index} size="lg" /> : <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600"><User className="h-8 w-8" /></div>}
                     <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
                       <DialogTrigger asChild>
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="dark:border-gray-600 dark:hover:bg-gray-800 transition duration-150 ease-in-out rounded-md whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm"
                         >
                            <Edit className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> 
                            {selectedAvatar ? 'Change Avatar' : 'Select Avatar'}
                         </Button>
                       </DialogTrigger>
                       {/* Make Dialog Content responsive */}
                       <DialogContent className="w-[90vw] max-w-lg sm:max-w-[600px] bg-white dark:bg-gray-950 rounded-lg p-4 sm:p-6">
                         <DialogHeader className="sr-only"><DialogTitle>Select Your Avatar</DialogTitle></DialogHeader>
                         <AvatarSelector onSelect={handleAvatarSelect} />
                         <DialogFooter className="mt-4"><DialogClose asChild><Button type="button" variant="secondary" size="sm" className="rounded-md">Cancel</Button></DialogClose></DialogFooter>
                       </DialogContent>
                     </Dialog>
                   </div>
                   {!selectedAvatar && <p className="text-sm text-red-600 dark:text-red-400 pt-1 self-center">Please select an avatar.</p>}
               </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex flex-col gap-4">
              <Button onClick={updateProfile} disabled={saving || !username || !selectedAvatar || username.trim().length < 3} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-md transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                {/* Change button text dynamically */}
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (currentUnoPlayerId ? 'Save Changes' : 'Save Profile & Enter')}
              </Button>
              {/* Only show toggle to Login if we are NOT editing (i.e., no currentUnoPlayerId) */}
              {!currentUnoPlayerId && (
                  <Button variant="link" onClick={() => setViewMode('login')} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0 h-auto">
                     Already have an account? Login
                  </Button>
              )}
              {/* Maybe add a logout/switch button here if editing? Or rely on main page logout. For now, keep it simple. */}
            </CardFooter>
          </>
        )}

         {/* === Login View === */}
        {viewMode === 'login' && (
          <>
            <CardHeader className="text-center pt-8 pb-4">
              <CardTitle className="text-3xl font-bold tracking-tight">Login</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Enter your username to continue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
               <div className="space-y-2">
                 <Label htmlFor="login-username" className="font-semibold text-gray-700 dark:text-gray-300">Username</Label>
                 <Input id="login-username" type="text" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="Your exact username" required className="dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition duration-150 ease-in-out rounded-md" />
               </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex flex-col gap-4">
              <Button onClick={handleLogin} disabled={loggingIn || !loginUsername.trim()} className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-3 rounded-md transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                {loggingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...</> : <><LogIn className="mr-2 h-4 w-4" /> Login</>}
              </Button>
              <Button 
                 variant="link" 
                 onClick={() => {
                    // When switching from Login to Setup, ensure we generate a new ID
                    const newPlayerId = crypto.randomUUID();
                    setCurrentUnoPlayerId(newPlayerId); // Set the new ID for the setup form
                    
                    // Generate random name AND link avatar using the helper function
                    const randomName = generateRandomName(); 
                    setUsernameAndLinkAvatar(randomName); 
                    
                    // Switch view
                    setViewMode('setup');
                 }} 
                 className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-0 h-auto"
              >
                 Need an account? Create Profile
              </Button>
            </CardFooter>
          </>
        )}

      </Card>

      {/* Alert Dialog (Make responsive again) */}
      <AlertDialog open={alertDialog.isOpen} onOpenChange={(isOpen) => setAlertDialog(prev => ({ ...prev, isOpen }))}>
        <AlertDialogContent className="w-[90vw] max-w-sm rounded-lg bg-white dark:bg-gray-900 p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              {alertDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))} className="rounded-md text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2">OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 