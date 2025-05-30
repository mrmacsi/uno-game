"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import Link from "next/link"
import RoomList from "@/components/room/room-list"
import { PlusCircle, LogIn, ListChecks, Globe, Settings, Loader2, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AvatarDisplay } from "@/components/game/avatar-display";
import { PLAYER_ID_LOCAL_STORAGE_KEY } from "@/lib/client-utils"
import ContentLoader from 'react-content-loader';

type ProfileData = {
  display_name: string | null;
  avatar_name: string | null;
  avatar_index: number | null;
  admin: boolean | null;
}

const ProfileSkeleton = () => (
  <ContentLoader 
    speed={2}
    width={200}
    height={60}
    viewBox="0 0 200 60"
    backgroundColor="#f3f3f3"
    foregroundColor="#ecebeb"
  >
    <circle cx="30" cy="30" r="30" />
    <rect x="80" y="17" rx="4" ry="4" width="100" height="13" />
    <rect x="80" y="42" rx="3" ry="3" width="60" height="10" />
  </ContentLoader>
);

export default function Home() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY);
    if (!storedPlayerId) {
      console.log("No player ID found, redirecting to setup.");
      router.push('/profile/setup');
      return;
    }

    const checkProfile = async (unoPlayerId: string) => {
      setLoading(true);
      setError(null);
      try {
        const { data, error, status } = await supabase
          .from('profiles')
          .select('display_name, avatar_name, avatar_index, admin')
          .eq('player_id', unoPlayerId)
          .single<ProfileData>();

        if (error && status !== 406) {
          setError("Failed to load profile. Please try again.");
          localStorage.removeItem(PLAYER_ID_LOCAL_STORAGE_KEY);
        } else if (!data || !data.display_name || data.avatar_name === null || data.avatar_index === null) {
          setError("Profile incomplete. Please complete your profile setup.");
        } else {
          setProfile(data as ProfileData);
        }
      } catch (err) {
        console.error("Unexpected error during profile check:", err);
        setError("An unexpected error occurred. Please try again.");
        localStorage.removeItem(PLAYER_ID_LOCAL_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    checkProfile(storedPlayerId);
  }, [router, supabase]);

  const handleLogout = () => {
    localStorage.removeItem(PLAYER_ID_LOCAL_STORAGE_KEY);
    setProfile(null); 
    router.push('/profile/setup');
  };

  const handleRetry = () => {
    const storedPlayerId = localStorage.getItem(PLAYER_ID_LOCAL_STORAGE_KEY);
    if (storedPlayerId) {
      setError(null);
      router.refresh();
    } else {
      router.push('/profile/setup');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-500 via-orange-400 to-amber-300 dark:from-red-950 dark:via-orange-900 dark:to-amber-800 p-8">
        <div className="bg-white/90 dark:bg-gray-900/90 rounded-2xl p-8 max-w-md w-full shadow-xl">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Profile</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <div className="flex gap-4">
            <Button onClick={handleRetry} variant="default">
              Retry
            </Button>
            <Link href="/profile/setup">
              <Button variant="outline">
                Go to Profile Setup
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-500 via-orange-400 to-amber-300 dark:from-red-950 dark:via-orange-900 dark:to-amber-800 p-8">
        <div className="bg-white/90 dark:bg-gray-900/90 rounded-2xl p-8 w-full max-w-4xl shadow-xl">
          <div className="animate-pulse space-y-8">
            <div className="flex items-center justify-between">
              <ProfileSkeleton />
              <div className="flex gap-2">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-500 via-orange-400 to-amber-300 dark:from-red-950 dark:via-orange-900 dark:to-amber-800 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Redirecting...</p> 
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }
  
  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 24
      }
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-red-500 via-orange-400 to-amber-300 dark:from-red-900 dark:via-orange-800 dark:to-amber-700 p-2 sm:p-4">
      <motion.div 
        className="w-full max-w-4xl mx-auto my-2 sm:my-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="backdrop-blur-lg bg-white/90 dark:bg-gray-900/90 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
          <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3 border-b border-white/15 dark:border-gray-800/50">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
              <div className="flex items-center gap-2.5 flex-shrink min-w-0">
                <AvatarDisplay index={profile.avatar_index ?? 0} size="md" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-50 truncate">
                    {profile.display_name}
                  </span>
                  <Link href="/profile/setup" passHref>
                    <Button 
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 self-start font-normal"
                    >
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ThemeToggle />
                {profile.admin === true && (
                  <Link href="/admin" passHref>
                    <Button variant="ghost" size="icon" title="Admin Panel" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-8 h-8 sm:w-9 sm:h-9">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" title="Logout" onClick={handleLogout} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 w-8 h-8 sm:w-9 sm:h-9">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-center pt-1"
            >
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-500 dark:to-orange-400">UNO</h1>
              <p className="mt-0.5 text-gray-600 dark:text-gray-300 text-[11px] sm:text-sm">
                The classic card game, online.
              </p>
            </motion.div>
          </div>
          
          <div className="flex-grow p-3 sm:p-4 md:p-5">
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="space-y-3 sm:space-y-4">
                <h2 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200">Quick Actions</h2>
                <motion.div className="space-y-2.5 sm:space-y-3" variants={containerVariants}>
                  <motion.div variants={itemVariants}>
                    <Link href="/create-room" className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium py-2.5 sm:py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 text-sm sm:text-base">
                        <PlusCircle className="h-4 w-4" />
                        Create New Room
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Link href="/join-room" className="w-full block">
                      <Button variant="outline" className="w-full py-2.5 sm:py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-1.5 text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">
                        <LogIn className="h-4 w-4" />
                        Join Room with Code
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="relative py-1.5 sm:py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700/50"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white/90 dark:bg-gray-900/90 px-2 text-xs text-gray-500 dark:text-gray-400">or</span></div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Link href={`/room/DEFAULT`} className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-medium py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 text-sm sm:text-base">
                        <Globe className="h-4 w-4" />
                        Join Public Room
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
              
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                  <ListChecks className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <h2 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200">Active Game Rooms</h2>
                </div>
                <RoomList />
              </motion.div>
            </motion.div>
          </div>
          
          <div className="px-3 sm:px-4 py-2 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400/80 w-full mt-auto border-t border-gray-200/50 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50">
            <p>Built with ❤️ in London • {new Date().getFullYear()}</p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}