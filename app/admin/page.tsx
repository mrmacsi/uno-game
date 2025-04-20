"use client"

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
          
          {/* Navigation Links */}
          <div className="flex flex-wrap gap-4 mb-4 border-b pb-4 dark:border-gray-700">
             <Link href="/admin/avatars">
               <Button variant="outline">View Avatars</Button>
             </Link>
             <Link href="/admin/users"> 
               <Button variant="outline" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>User Management</span>
               </Button>
             </Link>
          </div>

          <div className="space-y-6">
            {/* Redis Controls Section */}
            <div className="border dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-200">Redis Management</h2>
              <div className="flex flex-wrap gap-4 items-center mb-4"> 
                <Button onClick={fetchRooms} disabled={loading || infoLoading}>
                  <List className="h-4 w-4 mr-2"/> List Rooms Data
                </Button>
                
                {/* Wrap Clean Button in AlertDialog */}
                <ConfirmationDialog
                    triggerButton={
                        <Button variant="destructive" disabled={loading || infoLoading}>
                            <Trash2 className="h-4 w-4 mr-2"/> Clean Rooms Data
                        </Button>
                    }
                    title="Clear All Rooms?"
                    description="DANGER! This will delete ALL non-DEFAULT rooms. This action is irreversible."
                    confirmAction={performClearAllRooms}
                    confirmText="Yes, Clear All"
                    isDestructive={true}
                />

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
            </div>

            {/* ... Redis Data Display Section ... */}
             {rooms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Rooms ({rooms.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Room ID</TableHead><TableHead>Status</TableHead><TableHead>Players</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {rooms.map((room) => (
                          <TableRow key={room.roomId}>
                            <TableCell className="font-mono">{room.roomId}</TableCell>
                            <TableCell>{room.status}</TableCell>
                            <TableCell>{room.players.length}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end items-center space-x-2">
                                    {/* Reset Button */}
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => handleResetRoom(room.roomId)} disabled={loadingAction === 'reset' && selectedRoom === room.roomId} title="Reset Room">{loadingAction === 'reset' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
                                    </TooltipTrigger><TooltipContent><p>Reset Room (Clears Players)</p></TooltipContent></Tooltip></TooltipProvider>
                                    
                                    {/* Clear History Button */} 
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                    <ConfirmationDialog
                                        triggerButton={
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="flex items-center gap-1 text-orange-600 border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 dark:border-orange-500/40 dark:hover:bg-orange-900/30"
                                                disabled={loadingAction === 'clearHistory' && selectedRoom === room.roomId}
                                                title="Clear Match History"
                                            >
                                                {loadingAction === 'clearHistory' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                                            </Button>
                                        }
                                        title={`Clear History for Room ${room.roomId}?`}
                                        description="Are you sure you want to clear the match history for this room? This cannot be undone."
                                        confirmAction={() => handleClearHistory(room.roomId)}
                                        confirmText="Yes, Clear History"
                                        isDestructive={false} // It's not deleting the room itself
                                    />
                                    </TooltipTrigger><TooltipContent><p>Clear Match History Only</p></TooltipContent></Tooltip></TooltipProvider>

                                    {/* Delete Button */}
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                    <ConfirmationDialog
                                        triggerButton={
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="flex items-center gap-1 text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 dark:border-red-500/40 dark:hover:bg-red-900/30" 
                                                title="Delete Room"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        }
                                        title={`Delete Room ${room.roomId}?`}
                                        description="Are you sure you want to delete this room? This action is irreversible."
                                        confirmAction={() => performDeleteRoom(room.roomId)}
                                        confirmText="Yes, Delete"
                                        isDestructive={true}
                                    />
                                    </TooltipTrigger><TooltipContent><p>Delete Room</p></TooltipContent></Tooltip></TooltipProvider>
                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rooms.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No active rooms found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
             )}

            {/* Add Link to Redis Viewer */}
            <Link href="/admin/redis-viewer" className="block hover:shadow-lg transition-shadow rounded-lg">
              <Card className="hover:border-red-500 dark:hover:border-red-400 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5" />
                    <span>Redis Viewer</span>
                  </CardTitle>
                  <CardDescription>Inspect raw game state data stored in Redis.</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
