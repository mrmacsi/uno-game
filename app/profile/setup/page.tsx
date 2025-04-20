'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfileSetupForm from '@/components/auth/profile-setup-form'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Loader2, Home } from 'lucide-react'
import { Button } from "@/components/ui/button"

const LOCAL_STORAGE_KEY = 'uno_player_id'

export default function ProfileSetupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [unoPlayerId, setUnoPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let storedPlayerId = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!storedPlayerId) {
      storedPlayerId = uuidv4();
      localStorage.setItem(LOCAL_STORAGE_KEY, storedPlayerId);
    }
    
    setUnoPlayerId(storedPlayerId);
    
    const checkProfile = async (currentUnoPlayerId: string) => {
       try {
         const { error, status } = await supabase
           .from('profiles')
           .select('username, avatar_name')
           .eq('player_id', currentUnoPlayerId)
           .single();

         if (error && status !== 406) {
           console.error("Error checking profile:", error);
         }
       } catch (err) {
         console.error("Unexpected error during profile check:", err)
       } finally {
         setLoading(false);
       }
    }
    
    if(storedPlayerId) {
       checkProfile(storedPlayerId);
    } else {
       setLoading(false);
       console.error("Player ID could not be established for profile check.");
    }
    
  }, [router, supabase]);

  if (loading || !unoPlayerId) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
        </div>
    );
  }

  return (
    <div className="relative flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 dark:from-gray-800 dark:via-gray-900 dark:to-black p-4">
       <Button 
         variant="ghost"
         size="icon" 
         className="absolute top-4 left-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-full shadow"
         onClick={() => router.push('/')}
         title="Back to Home"
       >
         <Home className="h-5 w-5" />
       </Button>
      
      <ProfileSetupForm unoPlayerId={unoPlayerId} />
    </div>
  );
} 