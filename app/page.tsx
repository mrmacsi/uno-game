"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import Link from "next/link"
import RoomList from "@/components/room/room-list"
import { PlusCircle, LogIn, ArrowRight, ListChecks, Globe, Settings, Loader2, LogOut } from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AvatarDisplay } from "@/components/game/avatar-display";

const LOCAL_STORAGE_KEY = 'uno_player_id'

interface PlayerProfile {
  username: string;
  avatar_name: string;
  avatar_index: number;
  admin?: boolean;
}

export default function Home() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storedPlayerId) {
      console.log("No player ID found, redirecting to setup.");
      router.push('/profile/setup');
      return;
    }

    const checkProfile = async (unoPlayerId: string) => {
      setLoading(true);
      try {
        const { data, error, status } = await supabase
          .from('profiles')
          .select('username, avatar_name, avatar_index, admin')
          .eq('player_id', unoPlayerId)
          .single();

        if (error && status !== 406) {
          console.error("Error fetching profile:", error);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          router.push('/profile/setup');
        } else if (!data || !data.username || data.avatar_name === null || data.avatar_index === null) {
          console.log("Incomplete profile data, redirecting to setup.");
          router.push('/profile/setup');
        } else {
          setProfile(data as PlayerProfile);
        }
      } catch (err) {
        console.error("Unexpected error during profile check:", err);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        router.push('/profile/setup');
      } finally {
        setLoading(false);
      }
    };

    checkProfile(storedPlayerId);

  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setProfile(null); 
    router.push('/profile/setup');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="mt-4 text-white text-lg">Redirecting...</p> 
      </div>
    );
  }

  const defaultRoomId = "DEFAULT"

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  }
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
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
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 p-3 sm:p-4 md:p-6">
      <motion.div 
        className="w-full max-w-4xl mx-auto my-2 sm:my-4 md:my-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-4rem)] border border-white/20 dark:border-gray-800/50">
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/10 dark:border-gray-800/40">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink min-w-0">
                <AvatarDisplay index={profile.avatar_index} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {profile.username}
                  </span>
                  <Link href="/profile/setup" passHref>
                    <Button 
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[11px] sm:text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 self-start"
                    >
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <ThemeToggle />
                {profile.admin === true && (
                  <Link href="/admin" passHref>
                    <Button variant="ghost" size="icon" title="Admin Panel" className="w-8 h-8 sm:w-9 sm:h-9">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" title="Logout" onClick={handleLogout} className="w-8 h-8 sm:w-9 sm:h-9">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-center sm:text-left"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-400">UNO</h1>
              <p className="mt-0.5 sm:mt-1 text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                Play the classic card game online with friends
              </p>
            </motion.div>
          </div>
          
          <div className="flex-grow px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 md:py-8">
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="space-y-3 sm:space-y-4">
                <h2 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-200 mb-2 sm:mb-3">Quick Actions</h2>
                <motion.div className="space-y-2 sm:space-y-3" variants={containerVariants}>
                  <motion.div variants={itemVariants}>
                    <Link href="/create-room" className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base">
                        <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                        Create New Room
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Link href="/join-room" className="w-full block">
                      <Button variant="outline" className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2 text-sm sm:text-base dark:text-gray-200 dark:border-gray-700">
                        <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                        Join Room with Code
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="relative py-2 sm:py-3">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-700"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white/90 dark:bg-gray-900/90 px-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">or join public room</span></div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Link href={`/join-room?roomId=${defaultRoomId}`} className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                        <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                        Join Default Room
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-0.5 sm:ml-1" />
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center px-1 sm:px-2 pt-1">
                    A public room that&apos;s always available for quick play
                  </p>
                </motion.div>
              </div>
              
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <ListChecks className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                  <h2 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-200">Active Game Rooms</h2>
                </div>
                <RoomList />
              </motion.div>
            </motion.div>
          </div>
          
          <div className="px-4 sm:px-6 py-2 sm:py-3 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 w-full mt-auto border-t border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
             <p className="mt-0.5 sm:mt-1">Built with ❤️ in London • {new Date().getFullYear()}</p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}