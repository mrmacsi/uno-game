'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
// No longer need User type from supabase-js
import { useRouter, useSearchParams } from 'next/navigation'
import AvatarSelector from '@/components/game/avatar-selector'
import { AvatarDisplay } from '@/components/game/avatar-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Loader2, Edit, User, Wand2, LogIn } from 'lucide-react'
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
const LOCAL_STORAGE_KEY = 'playerId';

// Define view modes
type ViewMode = 'setup' | 'login' | 'loading';

// Define type for upsert data
interface ProfileUpsertData {
  player_id: string;
  display_name: string;
  avatar_name: string;
  avatar_index: number;
  updated_at: Date;
  username?: string; // Optional username, only set on initial creation
}

// Rename playerId prop to unoPlayerId
export default function ProfileSetupForm({ unoPlayerId: propUnoPlayerId }: { unoPlayerId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams() // Get search params
  const [viewMode, setViewMode] = useState<ViewMode>('loading'); // Initial state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false) // Separate state for saving action
  const [loggingIn, setLoggingIn] = useState(false); // Logging in state
  const [displayName, setDisplayName] = useState<string>('')
  const [username, setUsername] = useState<string>(''); // Add state for username (login)
  const [loginUsername, setLoginUsername] = useState<string>(''); // For login form
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatarState | null>(null)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false); // Added for modal control
  const [alertDialog, setAlertDialog] = useState<AlertDialogState>({ isOpen: false, title: '', description: '' }); // Added for alert dialog
  const [isEditing, setIsEditing] = useState(false); // State to track if editing a complete profile
  // Store the player ID being worked on (could be from prop or login)
  const [currentUnoPlayerId, setCurrentUnoPlayerId] = useState<string>(propUnoPlayerId || '');

  // Function to show alert dialog
  const showAlert = (title: string, description: string) => {
    setAlertDialog({ isOpen: true, title, description });
  };

  // Function to set display name and potentially link avatar
  const setDisplayNameAndLinkAvatar = useCallback((newName: string) => {
    setDisplayName(newName);
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
        .select(`username, display_name, avatar_name, avatar_index`) // Fetch username too
        .eq('player_id', idToCheck)
        .single()

      if (error && status !== 406) {
        console.error('Error loading profile, clearing ID and showing login:', error);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setCurrentUnoPlayerId(''); // Clear the ID state
        setViewMode('login');
      } else if (data) {
        // Profile data found (complete or incomplete)
        setUsername(data.username || ''); // Load username
        setDisplayName(data.display_name || ''); // Load display_name or empty string
        setSelectedAvatar(data.avatar_name && data.avatar_index !== null ? { name: data.avatar_name, index: data.avatar_index } : null);
        setCurrentUnoPlayerId(idToCheck); // Store the valid ID
        setViewMode('setup'); // Go directly to setup/edit view
        if (!data.username || !data.display_name || data.avatar_name === null || data.avatar_index === null) {
             // If incomplete, maybe generate part of the name if display_name is missing
             if (!data.display_name) {
                 // Also set username if display name is being generated
                 const generatedName = generateRandomName();
                 setDisplayNameAndLinkAvatar(generatedName);
                 setUsername(generatedName); // Set username initially too
             }
             setIsEditing(false); // It's setup, not editing
             toast.info("Please complete your profile.");
        } else {
             // Profile is complete, so we are editing
             setIsEditing(true);
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
  }, [supabase, setDisplayNameAndLinkAvatar]);

  useEffect(() => {
    const adminPlayerId = searchParams.get('playerId') // Check for playerId from query params
    const storedPlayerId = localStorage.getItem(LOCAL_STORAGE_KEY);
    // Prioritize adminPlayerId > storedPlayerId > propUnoPlayerId (which seems unused now)
    const idToLoad = adminPlayerId || storedPlayerId || '';
    getProfile(idToLoad);
    // Remove dependency on propUnoPlayerId if it's no longer the primary source
  }, [getProfile, searchParams]); // Add searchParams dependency

  const generateNewRandomName = () => {
    const newName = generateRandomName();
    setDisplayNameAndLinkAvatar(newName); // Use helper for setup form
  };

  async function updateProfile() {
    console.log("updateProfile triggered"); // Add log
    if (!displayName.trim() || !selectedAvatar || displayName.trim().length < 3) { // Check displayName
         showAlert('Missing Information', 'Please ensure display name is at least 3 characters and an avatar is selected.');
         return;
    }
     // Use currentUnoPlayerId which might have been set by getProfile or login
    if (!currentUnoPlayerId) {
        showAlert('Error', 'No Player ID found. Please try logging in again.');
        return;
    }

    try {
      setSaving(true)
      // Use the defined interface for stricter typing
      const profileDataToUpsert: ProfileUpsertData = {
        player_id: currentUnoPlayerId,
        display_name: displayName.trim(),
        avatar_name: selectedAvatar.name,
        avatar_index: selectedAvatar.index,
        updated_at: new Date(),
      };

      // If creating a new profile (not editing an existing complete one)
      if (!isEditing) {
        // Set the login username to the display name initially
        const loginUsernameToSave = username.trim();

        // Check if this login username is already taken by another user
        const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('player_id')
            .eq('username', loginUsernameToSave) // Check the USERNAME column
            .neq('player_id', currentUnoPlayerId) // Exclude the current user (important for initial saves where ID exists but profile is incomplete)
            .single();

        // Handle potential errors during the check (ignore 'not found' error code)
        if (checkError && checkError.code !== 'PGRST116') { 
          console.error("Error checking username uniqueness:", checkError);
          throw new Error('Could not verify username uniqueness.'); // Throw a generic error
        }

        // If the username is taken by someone else
        if (existingUser) {
            showAlert(
                'Username Conflict', 
                `The name "${loginUsernameToSave}" is already in use for login by another user. Please choose a different Display Name.`
            );
            setSaving(false);
            return; // Stop the save process
        }
        
        // If username is unique or available, add it to the data to be saved
        profileDataToUpsert.username = loginUsernameToSave;
      }
      // Note: If isEditing is true, we DO NOT update the username column.

      // Perform the upsert with the prepared data
      const { error } = await supabase.from('profiles').upsert(profileDataToUpsert);

      if (error) throw error;

      // If the ID in local storage doesn't match the one we just saved
      // (e.g., profile was created without an initial ID), store the correct one.
      if (localStorage.getItem(LOCAL_STORAGE_KEY) !== currentUnoPlayerId) {
          localStorage.setItem(LOCAL_STORAGE_KEY, currentUnoPlayerId);
      }

      toast.success('Profile saved successfully!')
      // Redirect logic: if editing (isEditing), go back to admin users page, otherwise go to home
      if (isEditing) {
          router.push('/admin/users'); // Redirect back to user list after edit
      } else {
          router.push('/') // Redirect to main page after initial save
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      // Use a type assertion or check the error structure
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      if (errorMessage.includes('profiles_username_key')) {
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
      showAlert('Username Required', 'Please enter a username to log in.');
      return;
    }
    setLoggingIn(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('player_id')
        .eq('username', loginUsername.trim())
        .single();

      if (error || !data) {
        showAlert('Login Failed', 'Username not found. Please check the username or create a profile.');
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, data.player_id);
        setCurrentUnoPlayerId(data.player_id);
        // getProfile(data.player_id); // Load the profile data after login
        toast.success("Login successful!");
        // Redirect to home page after login
        router.push('/'); // Go to home page after successful login
      }
    } catch (err) {
      console.error("Login error:", err);
      showAlert('Login Error', 'An unexpected error occurred during login.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAvatarSelect = (avatar: SelectedAvatarState) => {
    setSelectedAvatar(avatar);
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const newUsername = `${randomAdjective}${avatar.name}`;
    setDisplayName(newUsername); // Update setup display name
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
              {/* Change title dynamically based on editing state */}
              <CardTitle className="text-3xl font-bold tracking-tight">
                {isEditing ? 'Edit Your Profile' : 'Set Up Your Profile'}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                 {isEditing ? 'Update your display name and avatar.' : 'Choose a username, display name, and avatar to get started.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-8">
               {/* Username (Login) Input - Moved up */}
               <div className="space-y-2">
                 <Label htmlFor="username" className="font-semibold text-gray-700 dark:text-gray-300">Username (for Login)</Label>
                 <Input 
                    id="username" 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Login username (cannot be changed later)" 
                    required 
                    minLength={3} 
                    disabled={isEditing} // Disable if editing
                    className="disabled:opacity-70 disabled:bg-gray-100 dark:disabled:bg-gray-700 dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition duration-150 ease-in-out rounded-md" 
                    aria-describedby={isEditing ? "username-description" : undefined}
                 />
                 {isEditing && (
                    <p id="username-description" className="text-xs text-gray-500 dark:text-gray-400">
                        Username cannot be changed after initial setup.
                    </p>
                 )}
               </div>

               {/* Display Name Input - Moved down */}
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <Label htmlFor="display-name" className="font-semibold text-gray-700 dark:text-gray-300">Display Name</Label>
                   <Button type="button" variant="ghost" size="sm" onClick={generateNewRandomName} className="text-xs h-7 px-2 rounded-full flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                     <Wand2 className="h-3.5 w-3.5" /> Random
                   </Button>
                 </div>
                 <Input 
                    id="display-name" 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' && !saving && username && displayName && selectedAvatar && displayName.trim().length >= 3 && username.trim().length >=3) {
                        updateProfile();
                      }
                    }}
                    placeholder="e.g., MightyPigeon" 
                    required 
                    minLength={3} 
                    className="dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition duration-150 ease-in-out rounded-md" 
                 />
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
              <Button onClick={updateProfile} disabled={saving || !username || !displayName || !selectedAvatar || username.trim().length < 3 || displayName.trim().length < 3} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-md transition duration-150 ease-in-out shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
                {/* Change button text dynamically based on editing state */}
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditing ? 'Save Changes' : 'Save Profile & Enter')}
              </Button>
              {/* Only show toggle to Login if we are in setup mode (not editing) */}
              {!isEditing && (
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
                 <Input 
                    id="login-username" 
                    type="text" 
                    value={loginUsername} 
                    onChange={(e) => setLoginUsername(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                    placeholder="Your exact username" 
                    required 
                    className="dark:bg-gray-800 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400 transition duration-150 ease-in-out rounded-md" 
                 />
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
                    setDisplayNameAndLinkAvatar(randomName); 
                    
                    // Switch view
                    setIsEditing(false); // Ensure we are in setup mode
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