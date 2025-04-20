'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ProfileSetupForm from '@/components/auth/profile-setup-form'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Loader2 } from 'lucide-react'

const LOCAL_STORAGE_KEY = 'uno_player_id'

export default function ProfileSetupPage() {
  const supabase = createClient()
  const router = useRouter()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let storedPlayerId = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!storedPlayerId) {
      storedPlayerId = uuidv4();
      localStorage.setItem(LOCAL_STORAGE_KEY, storedPlayerId);
    }
    
    setPlayerId(storedPlayerId);
    
    const checkProfile = async (id: string) => {
       try {
         const { error, status } = await supabase
           .from('profiles')
           .select('username, avatar_name')
           .eq('player_id', id)
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
    
  }, [supabase, router]);

  if (loading || !playerId) {
    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
        </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <ProfileSetupForm playerId={playerId} />
    </div>
  );
} 