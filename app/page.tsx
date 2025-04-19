"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link"
import RoomList from "@/components/room-list"
import { PlusCircle, LogIn, ArrowRight, ListChecks, Globe, Database, Info } from "lucide-react"
import { motion } from "framer-motion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface RedisInfo {
  used_memory_human?: string;
  used_memory_peak_human?: string;
  total_system_memory_human?: string;
}

export default function Home() {
  // Default room ID that's always available
  const defaultRoomId = "DEFAULT"
  const [redisKeys, setRedisKeys] = useState<string[]>([])
  const [redisData, setRedisData] = useState<Record<string, any> | null>(null);
  const [cleaned, setCleaned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  async function fetchKeys() {
    setLoading(true)
    setCleaned(false)
    setRedisData(null);
    setRedisKeys([]);
    try {
      const res = await fetch("/api/redis")
      const data = await res.json()
      if (data.keyValues) {
        setRedisData(data.keyValues);
        setRedisKeys(Object.keys(data.keyValues));
      } else {
        console.error("API did not return keyValues:", data);
        setRedisData({});
      }
    } catch (error) {
       console.error("Error fetching Redis data from API:", error);
       setRedisData({});
    } finally {
       setLoading(false)
    }
  }

  async function cleanKeys() {
    setLoading(true)
    setCleaned(false)
    setRedisData(null);
    setRedisKeys([]);
    await fetch("/api/redis", { method: "POST" })
    setCleaned(true)
    setLoading(false)
  }

  async function fetchRedisInfo() {
    setInfoLoading(true);
    try {
      const res = await fetch("/api/redis/info");
      if (res.ok) {
        const data: RedisInfo = await res.json();
        setRedisInfo(data);
      } else {
        setRedisInfo({ used_memory_human: "Error fetching" });
      }
    } catch (error) {
      console.error("Failed to fetch Redis info:", error);
      setRedisInfo({ used_memory_human: "Error fetching" });
    } finally {
      setInfoLoading(false);
    }
  }

  useEffect(() => {
    fetchRedisInfo();
  }, []);

  // Animation variants
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
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 dark:from-red-900 dark:via-orange-800 dark:to-yellow-700 p-3 sm:p-6 md:p-8">
      <motion.div 
        className="w-full max-w-4xl mx-auto my-2 sm:my-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[600px] border border-white/20 dark:border-gray-800/50">
          <div className="px-4 pt-8 pb-4 sm:px-12 sm:pt-12 sm:pb-6">
            <div className="flex items-center justify-between gap-2 mb-6 sm:mb-8">
              <ThemeToggle />
            </div>
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <Button onClick={fetchKeys} disabled={loading || infoLoading}>List Redis Rooms</Button>
              <Button onClick={cleanKeys} variant="destructive" disabled={loading || infoLoading}>Clean Redis Rooms</Button>
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 p-2 border border-gray-300 dark:border-gray-700 rounded-md cursor-default">
                      <Database className="h-4 w-4" />
                      <span>Redis Mem:</span>
                      {infoLoading ? (
                        <span>Loading...</span>
                      ) : redisInfo?.used_memory_human ? (
                        <span className="font-semibold">{redisInfo.used_memory_human}</span>
                      ) : (
                        <span className="text-red-500">N/A</span>
                      )}
                      <Info className="h-3 w-3 ml-1 text-gray-400 dark:text-gray-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {infoLoading ? (
                      <p>Loading details...</p>
                    ) : redisInfo ? (
                      <div>
                        <p>Current: {redisInfo.used_memory_human || "N/A"}</p>
                        <p>Peak: {redisInfo.used_memory_peak_human || "N/A"}</p>
                        <p>System Total: {redisInfo.total_system_memory_human || "N/A"}</p>
                      </div>
                    ) : (
                      <p>Could not load details.</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {loading && <div className="text-xs text-gray-500">Loading...</div>}
            {cleaned && <div className="text-xs text-green-600">All Redis rooms cleaned.</div>}
            {redisData && Object.keys(redisData).length > 0 && (
              <div className="mt-4 p-4 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50 max-h-60 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">Redis Data (room:*)</h4>
                <ul className="space-y-2">
                  {Object.entries(redisData).map(([key, value]) => (
                    <li key={key} className="text-xs text-gray-700 dark:text-gray-300 break-words">
                      <strong className="text-gray-900 dark:text-gray-100">{key}:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {redisData && Object.keys(redisData).length === 0 && !loading && (
                 <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">No room data found in Redis.</div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-500 dark:to-orange-400">UNO</h1>
              <p className="mt-2 sm:mt-3 text-gray-600 dark:text-gray-300 text-base sm:text-lg">
                Play the classic card game online with friends
              </p>
            </motion.div>
          </div>
          
          <div className="flex-grow px-4 sm:px-12 pb-6 sm:pb-10">
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="space-y-5">
                <h2 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">Quick Actions</h2>
                <motion.div className="space-y-3" variants={containerVariants}>
                  <motion.div variants={itemVariants}>
                    <Link href="/create-room" className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-5 sm:py-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-base">
                        <PlusCircle className="h-5 w-5" />
                        Create New Room
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Link href="/join-room" className="w-full block">
                      <Button variant="outline" className="w-full py-5 sm:py-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2 text-base dark:text-gray-200 dark:border-gray-700">
                        <LogIn className="h-5 w-5" />
                        Join Room with Code
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="relative py-4 sm:py-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white/90 dark:bg-gray-900/90 px-4 text-sm text-gray-500 dark:text-gray-400">or join public room</span>
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Link href={`/join-room?roomId=${defaultRoomId}`} className="w-full block">
                      <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 sm:py-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-base">
                        <Globe className="h-5 w-5" />
                        Join Default Room
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </motion.div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                    A public room that&apos;s always available for quick play
                  </p>
                </motion.div>
              </div>
              
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks className="h-5 w-5 text-indigo-500" />
                  <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">Active Game Rooms</h2>
                </div>
                <RoomList />
              </motion.div>
            </motion.div>
          </div>
          
          <div className="px-4 sm:px-8 py-4 sm:py-5 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 w-full mt-auto border-t border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
            <p>Built with ❤️ in London • {new Date().getFullYear()}</p>
          </div>
        </div>
      </motion.div>
    </main>
  )
}