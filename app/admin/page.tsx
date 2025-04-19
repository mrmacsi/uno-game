"use client"

import { Button } from "@/components/ui/button"
import React, { useState, useEffect } from "react";
import { Database, Info, Trash2, List, RefreshCw } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog" // Import AlertDialog components
import Link from "next/link"
import { motion } from "framer-motion"

// ... RedisInfo interface ...
interface RedisInfo {
  used_memory_human?: string;
  used_memory_peak_human?: string;
  total_system_memory_human?: string;
}

export default function AdminPage() {
  // State moved from main page
  const [redisData, setRedisData] = useState<Record<string, any> | null>(null);
  const [cleaned, setCleaned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  // Removed state for dialog open/close, handled by AlertDialogTrigger

  // ... fetchKeys function ...
  async function fetchKeys() {
    setLoading(true);
    setCleaned(false);
    setRedisData(null);
    try {
      const res = await fetch("/api/redis");
      const data = await res.json();
      if (data.keyValues) {
        setRedisData(data.keyValues);
      } else {
        console.error("API did not return keyValues:", data);
        setRedisData({});
      }
    } catch (error) {
      console.error("Error fetching Redis data from API:", error);
      setRedisData({});
    } finally {
      setLoading(false);
    }
  }

  // cleanKeys now just prepares, handleConfirmClean does the work
  async function cleanKeys() {
    // This function is now implicitly handled by AlertDialogTrigger and AlertDialogAction
    // The logic is moved to handleConfirmClean
    console.log("Clean keys action triggered");
  }
  
  // New function for the actual cleaning logic after confirmation
  async function handleConfirmClean() {
    setLoading(true);
    setCleaned(false);
    setRedisData(null);
    try {
      await fetch("/api/redis", { method: "POST" }); 
      setCleaned(true);
    } catch (error) {
       console.error("Error cleaning Redis keys:", error);
       // Optionally set an error state here
    } finally {
       setLoading(false);
    }
  }

  // ... fetchRedisInfo function ...
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

  // ... useEffect ...
  useEffect(() => {
    fetchRedisInfo();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center p-6 md:p-12 bg-gray-100 dark:bg-gray-900">
      <motion.div
        className="w-full max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          {/* ... Header ... */}
          <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Admin Panel</h1>
             <Link href="/">
               <Button variant="outline">Back to Home</Button>
             </Link>
          </div>
          
          <div className="space-y-6">
            {/* Redis Controls Section */}
            <div className="border dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-200">Redis Management</h2>
              <div className="flex flex-wrap gap-4 items-center mb-4"> 
                <Button onClick={fetchKeys} disabled={loading || infoLoading}>
                  <List className="h-4 w-4 mr-2"/> List Rooms Data
                </Button>
                
                {/* Wrap Clean Button in AlertDialog */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loading || infoLoading}>
                      <Trash2 className="h-4 w-4 mr-2"/> Clean Rooms Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-gray-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all keys matching 
                        <code className="mx-1 px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono text-sm">room:*</code> 
                        from the Redis database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleConfirmClean} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
                        Yes, delete data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* ... Memory Info Tooltip ... */}
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 p-2 border border-gray-300 dark:border-gray-700 rounded-md cursor-default">
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
                 <Button onClick={fetchRedisInfo} variant="ghost" size="icon" disabled={infoLoading} title="Refresh Memory Info">
                    <RefreshCw className={`h-4 w-4 ${infoLoading ? 'animate-spin' : ''}`} />
                 </Button>
              </div>
              {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading Redis data...</div>}
              {cleaned && <div className="text-sm text-green-600 dark:text-green-400">All Redis room data cleaned.</div>}
            </div>

            {/* ... Redis Data Display Section ... */}
             {redisData && (
              <div className="border dark:border-gray-700 rounded-lg p-4">
                 <h2 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-200">Current Room Data (room:*)</h2>
                {Object.keys(redisData).length > 0 ? (
                  <div className="mt-4 p-4 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50 max-h-96 overflow-y-auto">
                    <ul className="space-y-2">
                      {Object.entries(redisData).map(([key, value]) => (
                        <li key={key} className="text-sm text-gray-700 dark:text-gray-300 break-words">
                          <strong className="text-gray-900 dark:text-gray-100">{key}:</strong>
                          <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                   <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">No room data found in Redis or data hasn't been listed yet.</div>
                )}
              </div>
             )}
          </div>
        </div>
      </motion.div>
    </main>
  );
}
