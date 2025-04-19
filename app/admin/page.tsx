"use client"

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Database, Info, Trash2, List, RefreshCw, Loader2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { getAllRooms, deleteRoom, resetRoom } from "@/lib/room-actions"
import { clearDb } from "@/lib/db-actions"
import { useToast } from "@/components/ui/use-toast"
import type { GameState } from "@/lib/types"

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
  const handleDeleteRoom = async (roomId: string) => {
    if (!roomId || roomId === "DEFAULT") return;
    if (window.confirm(`Are you sure you want to delete room ${roomId}? This is irreversible.`)) {
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

  const handleClearDb = async () => {
    if (window.confirm("DANGER! Are you sure you want to delete ALL non-DEFAULT rooms? This is irreversible.")) {
        setLoadingAction("clearDb");
        try {
            await clearDb();
            toast({ title: "Database Cleared", description: `All rooms cleared.` });
            fetchRooms(); // Refresh list
        } catch (error: unknown) { // Specify type for error
            console.error("Failed to clear DB:", error);
            toast({ title: "Error", description: error instanceof Error ? error.message : "Could not clear database.", variant: "destructive" });
        } finally {
            setLoadingAction(null);
        }
    }
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
          
          <div className="space-y-6">
            {/* Redis Controls Section */}
            <div className="border dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-200">Redis Management</h2>
              <div className="flex flex-wrap gap-4 items-center mb-4"> 
                <Button onClick={fetchRooms} disabled={loading || infoLoading}>
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
                      <AlertDialogAction onClick={handleClearDb} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
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
                            <TableCell className="text-right space-x-2">
                                {/* Reset Button */} 
                                <Button variant="outline" size="sm" onClick={() => handleResetRoom(room.roomId)} disabled={loadingAction === 'reset' && selectedRoom === room.roomId}>{loadingAction === 'reset' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button>
                                {/* Delete Button */} 
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                         <Button variant="destructive" size="sm" disabled={loadingAction === 'delete' && selectedRoom === room.roomId || room.roomId === "DEFAULT"}>{loadingAction === 'delete' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        {/* ... Delete Confirmation Dialog ... */} 
                                         <AlertDialogHeader><AlertDialogTitle>Delete Room {room.roomId}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRoom(room.roomId)}>Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
          </div>
        </div>
      </motion.div>
    </main>
  );
}
