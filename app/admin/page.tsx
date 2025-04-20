"use client"

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Database, Info, Trash2, List, RefreshCw, Loader2, Users, Eraser } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { getAllRooms, deleteRoom, resetRoom, clearMatchHistory } from "@/lib/room-actions"
import { clearDb } from "@/lib/db-actions"
import { useToast } from "@/components/ui/use-toast"
import type { GameState } from "@/lib/types"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

// ... RedisInfo interface ...
interface RedisInfo {
  used_memory_human?: string;
  used_memory_peak_human?: string;
  total_system_memory_human?: string;
}

export default function AdminPage() {
  const [rooms, setRooms] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { toast } = useToast();

  // Define fetchRooms function
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedRooms = await getAllRooms(); // Use imported function
      // Only include active rooms or filter as needed for admin view
      setRooms(fetchedRooms);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      toast({ title: "Error", description: "Could not fetch rooms.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchRooms();
    // fetchRedisInfo(); // Keep if needed
  }, [fetchRooms]);

  // Action Handlers (use fetchRooms defined above)
  const performDeleteRoom = async (roomId: string) => {
    if (!roomId || roomId === "DEFAULT") return;
    setSelectedRoom(roomId);
    setLoadingAction("delete");
    try {
      await deleteRoom(roomId);
      toast({ title: "Room Deleted", description: `Room ${roomId} was deleted.` });
      fetchRooms(); // Refresh list
    } catch (error: unknown) { // Specify type for error
      console.error("Failed to delete room:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete room.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
      setSelectedRoom(null);
    }
  };

  const handleResetRoom = async (roomId: string) => {
    if (!roomId) return;
    setSelectedRoom(roomId);
    setLoadingAction("reset");
    try {
      await resetRoom(roomId);
      toast({ title: "Room Reset", description: `Room ${roomId} was reset.` });
      fetchRooms(); // Refresh list
    } catch (error: unknown) { // Specify type for error
      console.error("Failed to reset room:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not reset room.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
      setSelectedRoom(null);
    }
  };

  // Handler for clearing history
  const handleClearHistory = async (roomId: string) => {
    if (!roomId) return;
    setSelectedRoom(roomId);
    setLoadingAction("clearHistory"); // New loading state identifier
    try {
      await clearMatchHistory(roomId);
      toast({ title: "History Cleared", description: `Match history for room ${roomId} was cleared.` });
      // No need to fetchRooms again, as the history isn't displayed here
    } catch (error: unknown) { 
      console.error("Failed to clear history:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not clear history.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
      setSelectedRoom(null);
    }
  };

  const performClearAllRooms = async () => {
    // Remove the window.confirm check - rely on ConfirmationDialog
    // if (window.confirm("DANGER! Are you sure you want to delete ALL non-DEFAULT rooms? This is irreversible.")) {
      setLoadingAction("clearDb");
      try {
        await clearDb();
        toast({ title: "Database Cleared", description: `All non-DEFAULT rooms cleared.` }); // Clarified message
        fetchRooms(); // Refresh list
      } catch (error: unknown) { // Specify type for error
        console.error("Failed to clear DB:", error);
        toast({ title: "Error", description: error instanceof Error ? error.message : "Could not clear database.", variant: "destructive" });
      } finally {
        setLoadingAction(null);
      }
    // }
  };

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
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600">
      <motion.div
        className="w-full max-w-3xl my-4 sm:my-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/15 dark:border-gray-800/50">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Admin Panel</h1>
              <Link href="/">
                <Button variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium">
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-white/15 dark:border-gray-800/50">
              <Link href="/admin/avatars">
                <Button variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium">
                  View Avatars
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="outline" className="flex items-center gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium">
                  <Users className="h-4 w-4" />
                  <span>User Management</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md p-5 border border-white/10 dark:border-gray-800/50">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">Redis Management</h2>
              <div className="flex flex-wrap gap-4 items-center mb-4">
                <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium transition-colors duration-200" onClick={fetchRooms} disabled={loading || infoLoading}>
                  <List className="h-4 w-4 mr-1"/> List Rooms Data
                </Button>

                <ConfirmationDialog
                    triggerButton={
                        <Button variant="destructive" className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium transition-colors duration-200" disabled={loading || infoLoading}>
                            <Trash2 className="h-4 w-4 mr-1"/> Clean Rooms Data
                        </Button>
                    }
                    title="Clear All Rooms?"
                    description="DANGER! This will delete ALL non-DEFAULT rooms. This action is irreversible."
                    confirmAction={performClearAllRooms}
                    confirmText="Yes, Clear All"
                    isDestructive={true}
                />

                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 ml-auto px-3 py-2 bg-gray-100 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700/70">
                        <Database className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Redis Mem:</span>
                        {infoLoading ? (
                          <span className="text-sm text-gray-500">Loading...</span>
                        ) : redisInfo?.used_memory_human ? (
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{redisInfo.used_memory_human}</span>
                        ) : (
                          <span className="text-sm text-red-500">N/A</span>
                        )}
                        <Info className="h-3 w-3 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs bg-gray-900 text-white border-gray-700">
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
                 <Button onClick={fetchRedisInfo} variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/80" disabled={infoLoading} title="Refresh Memory Info">
                    <RefreshCw className={`h-4 w-4 ${infoLoading ? 'animate-spin' : ''}`} />
                 </Button>
              </div>
              {loading && <div className="text-sm text-gray-500 dark:text-gray-400">Loading Redis data...</div>}
            </div>

            {rooms.length > 0 && (
              <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                <div className="border-b border-gray-200 dark:border-gray-700/70 p-5">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Active Rooms ({rooms.length})</h2>
                </div>
                <div className="p-5">
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <Table className="w-full">
                      <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
                         <TableRow>
                           <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Room ID</TableHead>
                           <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Status</TableHead>
                           <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Players</TableHead>
                           <TableHead className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Actions</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-200 dark:divide-gray-700/70">
                        {rooms.map((room) => (
                          <TableRow key={room.roomId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <TableCell className="py-4 px-4 text-sm font-mono text-gray-700 dark:text-gray-300">{room.roomId}</TableCell>
                            <TableCell className="py-4 px-4 text-sm">
                               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  room.status === 'playing' || room.status === 'finished'
                                     ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                     : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                               }`}>
                                 {room.status}
                               </span>
                            </TableCell>
                            <TableCell className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{room.players.length}</TableCell>
                            <TableCell className="py-4 px-4 text-right">
                                <div className="flex justify-end items-center space-x-2">
                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800/60 rounded" onClick={() => handleResetRoom(room.roomId)} disabled={loadingAction === 'reset' && selectedRoom === room.roomId}>
                                         {loadingAction === 'reset' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                      </Button>
                                    </TooltipTrigger><TooltipContent className="text-xs bg-gray-900 text-white border-gray-700"><p>Reset Room</p></TooltipContent></Tooltip></TooltipProvider>

                                    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                       <ConfirmationDialog
                                           triggerButton={
                                              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-800/60 rounded" disabled={loadingAction === 'clearHistory' && selectedRoom === room.roomId}>
                                                  {loadingAction === 'clearHistory' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                                              </Button>
                                           }
                                           title={`Clear History for Room ${room.roomId}?`}
                                           description="Are you sure you want to clear the match history for this room? This cannot be undone."
                                           confirmAction={() => handleClearHistory(room.roomId)}
                                           confirmText="Yes, Clear History"
                                           isDestructive={false}
                                       />
                                    </TooltipTrigger><TooltipContent className="text-xs bg-gray-900 text-white border-gray-700"><p>Clear History</p></TooltipContent></Tooltip></TooltipProvider>

                                    {room.roomId !== "DEFAULT" && (
                                       <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                          <ConfirmationDialog
                                              triggerButton={
                                                 <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800/60 rounded" disabled={loadingAction === 'delete' && selectedRoom === room.roomId}>
                                                    {loadingAction === 'delete' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                 </Button>
                                              }
                                              title={`Delete Room ${room.roomId}?`}
                                              description="Are you sure you want to delete this room? This action is irreversible."
                                              confirmAction={() => performDeleteRoom(room.roomId)}
                                              confirmText="Yes, Delete"
                                              isDestructive={true}
                                          />
                                       </TooltipTrigger><TooltipContent className="text-xs bg-gray-900 text-white border-gray-700"><p>Delete Room</p></TooltipContent></Tooltip></TooltipProvider>
                                    )}
                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rooms.length === 0 && <TableRow><TableCell colSpan={4} className="py-4 px-4 text-center text-sm text-gray-500 dark:text-gray-400">No active rooms found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  )}
                </div>
            </div>
           )}

          <Link href="/admin/redis-viewer" className="block">
            <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group border border-white/10 dark:border-gray-800/50">
               <div className="p-5 border-l-4 border-blue-500 group-hover:border-blue-600 transition-colors dark:border-blue-400 dark:group-hover:border-blue-500">
                 <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
                   <Database className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                   <span>Redis Viewer</span>
                 </div>
                 <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Inspect raw game state data stored in Redis.</p>
               </div>
             </div>
          </Link>
        </div>
        </div>
      </motion.div>
    </main>
  );
}
