"use client"

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Database, Info, Trash2, List, RefreshCw, Loader2, Users, Eraser, KeyRound, History, LayoutDashboard, Image as ImageIcon, Edit } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { getAllRooms, deleteRoom, resetRoom, clearMatchHistory } from "@/lib/room-actions"
import type { GameState, MatchResult } from "@/lib/types"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllGameRoomKeys, getRedisValue } from '@/lib/redis-actions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AvatarDisplay } from '@/components/game/avatar-display'
import { Badge } from '@/components/ui/badge'
import { toast } from "sonner"
import { avatars } from "@/lib/avatar-config"
import { getAllUsers, deleteUser, UserProfile } from "@/lib/user-actions"

const ROOM_PREFIX = "room:"

interface RedisInfo {
  used_memory_human?: string;
  used_memory_peak_human?: string;
  total_system_memory_human?: string;
}

// --- Avatar Management Section --- (Moved from app/admin/avatars/page.tsx)
const AvatarManagementSection = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleAvatarClick = (name: string, index: number) => {
    if (selectedIndex === index) {
      setSelectedIndex(null);
      toast("Avatar Deselected");
    } else {
      setSelectedIndex(index);
      toast("Avatar Selected", {
        description: `Name: ${name}, Index: ${index}`,
      });
      console.log(`Selected Avatar: ${name} (Index: ${index})`);
    }
  };

  const selectedAvatarName = selectedIndex !== null ? avatars[selectedIndex] : null;

  return (
    <div className="space-y-6">
      <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
        <div className="p-5 border-b border-white/15 dark:border-gray-800/50">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">Avatar Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Avatar management UI will be here.</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-x-4 gap-y-6">
            {avatars.map((name, index) => (
              <div key={index} className="flex flex-col items-center gap-1 cursor-pointer group"
                  onClick={() => handleAvatarClick(name, index)}>
                <AvatarDisplay
                    index={index}
                    size="md"
                    className={`rounded-full shadow-md group-hover:opacity-80 transition-all ${selectedIndex === index ? 'ring-2 ring-offset-2 ring-green-500 dark:ring-green-400 ring-offset-white/80 dark:ring-offset-gray-950/80' : ''}`}
                />
                <span className="mt-1 text-xs text-center text-gray-600 dark:text-gray-400 truncate w-full group-hover:text-gray-900 dark:group-hover:text-gray-200">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedIndex !== null && selectedAvatarName && (
        <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
          <div className="p-5 border-b border-white/15 dark:border-gray-800/50">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Selected: {selectedAvatarName} (Index: {selectedIndex})</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Preview in different sizes:</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-end justify-center gap-6 flex-wrap">
              <div className="flex flex-col items-center gap-1">
                <AvatarDisplay index={selectedIndex} size="sm" className="rounded-full shadow-sm" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Small (sm)</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <AvatarDisplay index={selectedIndex} size="md" className="rounded-full shadow-sm" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Medium (md)</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <AvatarDisplay index={selectedIndex} size="lg" className="rounded-full shadow-sm" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Large (lg)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- End Avatar Management Section ---

// --- User Management Section --- (Moved from app/admin/users/page.tsx)
const UserManagementSection = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingUserAction, setLoadingUserAction] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Error", { description: "Could not fetch users." });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const performDeleteUser = async (userId: string) => {
    if (!userId) return;
    setLoadingUserAction(`delete-${userId}`);
    try {
      await deleteUser(userId);
      toast.success("User Deleted", { description: `User ${userId} was deleted.` });
      fetchUsers();
    } catch (error: unknown) {
      console.error("Failed to delete user:", error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Could not delete user." });
    } finally {
      setLoadingUserAction(null);
    }
  };

  return (
    <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
      <div className="border-b border-gray-200 dark:border-gray-700/70 p-5">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">All Users ({users.length})</h2>
      </div>
      <div className="p-5">
        {loadingUsers && users.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 && !loadingUsers ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            No users found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[700px]">
              <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
                <TableRow>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Display Name</TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Username</TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Player ID</TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Admin</TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Created</TableHead>
                  <TableHead className="py-3 px-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-700/70">
                {users.map((user) => {
                  const isDeleting = loadingUserAction === `delete-${user.player_id}`;
                  return (
                    <TableRow key={user.player_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <TableCell className="py-4 px-4 text-sm font-medium text-gray-800 dark:text-gray-200">{user.display_name || '-'}</TableCell>
                      <TableCell className="py-4 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{user.username}</TableCell>
                      <TableCell className="py-4 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{user.player_id}</TableCell>
                      <TableCell className="py-4 px-4 text-sm">
                        {user.admin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">Yes</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-300">No</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="py-4 px-4 text-right">
                        <div className="flex justify-end items-center space-x-1">
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={`/profile/setup?playerId=${user.player_id}`} passHref>
                                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800/60 rounded w-8 h-8">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs bg-gray-900 text-white border-gray-700"><p>Edit User</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ConfirmationDialog
                                  triggerButton={
                                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800/60 rounded w-8 h-8" disabled={isDeleting}>
                                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                  }
                                  title={`Delete User ${user.username}?`}
                                  description={`Are you sure you want to delete user ${user.username} (${user.player_id})? This action is irreversible.`}
                                  confirmAction={() => performDeleteUser(user.player_id)}
                                  confirmText="Yes, Delete"
                                  isDestructive={true}
                                />
                              </TooltipTrigger>
                              <TooltipContent className="text-xs bg-gray-900 text-white border-gray-700"><p>Delete User</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
// --- End User Management Section ---

export default function AdminPage() {
  const [rooms, setRooms] = useState<GameState[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [redisInfo, setRedisInfo] = useState<RedisInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [redisKeys, setRedisKeys] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [keyValue, setKeyValue] = useState<string | null>(null)
  const [redisMatchHistory, setRedisMatchHistory] = useState<MatchResult[] | null>(null)
  const [parsedGameState, setParsedGameState] = useState<Partial<GameState> | null>(null)
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [loadingValue, setLoadingValue] = useState(false)
  const [redisError, setRedisError] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const fetchedRooms = await getAllRooms();
      setRooms(fetchedRooms);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
      setLoadingRooms(false);
      toast.error("Error", { description: "Could not fetch rooms." });
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

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
      toast.error("Error", { description: "Could not fetch Redis info." });
    } finally {
      setInfoLoading(false);
    }
  }

  useEffect(() => {
    fetchRedisInfo();
  }, []);

  const performDeleteRoom = async (roomId: string) => {
    if (!roomId || roomId === "DEFAULT") return;
    setSelectedRoom(roomId);
    setLoadingAction(`delete-${roomId}`);
    try {
      await deleteRoom(roomId);
      toast.success("Room Deleted", { description: `Room ${roomId} was deleted.` });
      fetchRooms();
    } catch (error: unknown) {
      console.error("Failed to delete room:", error);
      toast.error("Error", { description: "Could not delete room." });
    } finally {
      setLoadingAction(null);
      setSelectedRoom(null);
    }
  };

  const handleResetRoom = async (roomId: string) => {
    if (!roomId) return;
    setSelectedRoom(roomId);
    setLoadingAction(`reset-${roomId}`);
    try {
      await resetRoom(roomId);
      toast.success("Room Reset", { description: `Room ${roomId} has been reset.` });
      fetchRooms();
    } catch (error: unknown) {
      console.error("Failed to reset room:", error);
      toast.error("Error", { description: "Could not reset room." });
    } finally {
      setLoadingAction(null);
      setSelectedRoom(null);
    }
  };

  const handleClearHistory = async (roomId: string) => {
    if (!roomId) return;
    setSelectedRoom(roomId);
    setLoadingAction(`clearHistory-${roomId}`);
    try {
      await clearMatchHistory(roomId);
      toast.success("Match History Cleared", { description: `History for room ${roomId} cleared.` });
      fetchRooms(); // Refresh rooms to show updated history status
    } catch (error: unknown) {
      console.error("Failed to clear history:", error);
      toast.error("Error", { description: "Could not clear history." });
    } finally {
      setLoadingAction(null);
      setSelectedRoom(null);
    }
  };

  const performClearAllRooms = async () => {
    setLoadingAction('clear-rooms');
    try {
      const result = await getAllRooms(); // Get all rooms first
      await Promise.all(result.map(room => deleteRoom(room.roomId))); // Delete each room
      toast.success("All Rooms Cleared", { description: `Successfully deleted ${result.length} rooms.` });
      fetchRooms();
    } catch (error) {
      console.error("Failed to clear all rooms:", error);
      toast.error("Error", { description: "Could not clear all rooms." });
    } finally {
      setLoadingAction(null);
    }
  };

  const fetchRedisKeys = useCallback(async () => {
    setLoadingKeys(true)
    setRedisError(null)
    try {
      const keys = await getAllGameRoomKeys()
      setRedisKeys(keys)
    } catch (err) {
      console.error("Failed to fetch Redis keys:", err)
      setRedisError("Failed to fetch Redis keys.")
      toast.error("Error", { description: "Failed to fetch Redis keys." })
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  useEffect(() => {
    fetchRedisKeys()
  }, [fetchRedisKeys])

  const handleKeySelect = useCallback(async (key: string) => {
    setSelectedKey(key)
    setKeyValue(null)
    setRedisMatchHistory(null)
    setParsedGameState(null)
    setLoadingValue(true)
    setRedisError(null)
    try {
      const value = await getRedisValue(key)
      setKeyValue(value)
      if (value) {
        try {
          const parsedState: Partial<GameState> = JSON.parse(value);
          setParsedGameState(parsedState);
          setRedisMatchHistory(parsedState.matchHistory || null);
        } catch (parseError) {
           console.error(`Error parsing JSON for key ${key}:`, parseError);
           setRedisMatchHistory(null);
           setParsedGameState(null);
           setRedisError(`Failed to parse JSON data for key ${key}.`);
           toast.error("Error", { description: `Failed to parse JSON data for key ${key}.` });
        }
      } else {
         setRedisMatchHistory(null)
         setParsedGameState(null)
      }
    } catch (err) {
      console.error(`Failed to fetch value for key ${key}:`, err)
      setRedisError(`Failed to fetch value for key ${key}.`)
      toast.error("Error", { description: `Failed to fetch value for key ${key}.` })
    } finally {
      setLoadingValue(false)
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600">
      <motion.div
        className="w-full max-w-5xl my-4 sm:my-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/15 dark:border-gray-800/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 shrink-0">Admin Panel</h1>
              <div className="flex w-full sm:w-auto sm:ml-auto">
                <Link href="/" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto justify-center border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium text-sm">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 flex-grow">
            <Tabs defaultValue="rooms" className="w-full flex flex-col h-full">
               <div className="w-full overflow-x-auto pb-1 mb-4 sm:mb-6">
                 <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-gray-200/70 dark:bg-gray-800/70 p-1 w-max min-w-full sm:min-w-0">
                   <TabsTrigger value="rooms" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-gray-600 dark:text-gray-300 gap-1.5 cursor-pointer">
                     <LayoutDashboard className="h-4 w-4"/> Rooms
                   </TabsTrigger>
                   <TabsTrigger value="redis" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-gray-600 dark:text-gray-300 gap-1.5 cursor-pointer">
                     <KeyRound className="h-4 w-4" /> Redis
                   </TabsTrigger>
                   <TabsTrigger value="avatars" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-gray-600 dark:text-gray-300 gap-1.5 cursor-pointer">
                     <ImageIcon className="h-4 w-4"/> Avatars
                   </TabsTrigger>
                   <TabsTrigger value="users" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-950 data-[state=active]:text-foreground data-[state=active]:shadow-sm text-gray-600 dark:text-gray-300 gap-1.5 cursor-pointer">
                     <Users className="h-4 w-4" /> Users
                   </TabsTrigger>
                 </TabsList>
               </div>

               <TabsContent value="rooms" className="space-y-6 flex-grow">
                   <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md p-5 border border-white/10 dark:border-gray-800/50">
                     <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-5">Manage Rooms & Server</h2>
                     <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center mb-4">
                       <div className="flex flex-wrap gap-3">
                         <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium transition-colors duration-200 text-sm px-3 py-1.5" onClick={fetchRooms} disabled={loadingRooms || infoLoading}>
                            <List className="h-4 w-4 mr-1"/> List Rooms Data
                         </Button>
                         <ConfirmationDialog
                             triggerButton={
                                 <Button variant="destructive" className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium transition-colors duration-200 text-sm px-3 py-1.5" disabled={loadingRooms || infoLoading}>
                                     <Trash2 className="h-4 w-4 mr-1"/> Clean Rooms Data
                                 </Button>
                             }
                             title="Clear All Rooms?"
                             description="DANGER! This will delete ALL non-DEFAULT rooms. This action is irreversible."
                             confirmAction={performClearAllRooms}
                             confirmText="Yes, Clear All"
                             isDestructive={true}
                         />
                       </div>
                       <div className="flex-grow sm:hidden"></div> {/* Spacer for mobile */}
                       <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:ml-auto">
                         <TooltipProvider>
                           <Tooltip delayDuration={100}>
                             <TooltipTrigger asChild>
                               <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700/70 flex-grow justify-center sm:flex-grow-0">
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
                         <Button onClick={fetchRedisInfo} variant="ghost" size="icon" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/80 w-8 h-8 shrink-0" disabled={infoLoading} title="Refresh Memory Info">
                             <RefreshCw className={`h-4 w-4 ${infoLoading ? 'animate-spin' : ''}`} />
                         </Button>
                       </div>
                     </div>
                     {loadingRooms && <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading Redis data...</div>}
                   </div>

                   <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                     <div className="border-b border-gray-200 dark:border-gray-700/70 p-5">
                       <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Active Rooms ({rooms.length})</h2>
                     </div>
                     <div className="p-3 sm:p-5">
                       {loadingRooms ? (
                         <div className="flex justify-center items-center h-32">
                             <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                         </div>
                       ) : (
                         <div className="overflow-x-auto">
                            <Table className="w-full min-w-[600px]">
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
                                    <TableCell className="py-4 px-4 text-sm font-mono text-gray-700 dark:text-gray-300 truncate max-w-[150px] sm:max-w-none">{room.roomId}</TableCell>
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
                                        <div className="flex justify-end items-center space-x-1"> {/* Reduced space-x */}
                                            <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800/60 rounded w-8 h-8" onClick={() => handleResetRoom(room.roomId)} disabled={loadingAction === 'reset' && selectedRoom === room.roomId}>
                                                {loadingAction === 'reset' && selectedRoom === room.roomId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                              </Button>
                                            </TooltipTrigger><TooltipContent className="text-xs bg-gray-900 text-white border-gray-700"><p>Reset Room</p></TooltipContent></Tooltip></TooltipProvider>
                                            <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
                                              <ConfirmationDialog
                                                  triggerButton={
                                                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-gray-800/60 rounded w-8 h-8" disabled={loadingAction === 'clearHistory' && selectedRoom === room.roomId}>
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
                                                      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800/60 rounded w-8 h-8" disabled={loadingAction === 'delete' && selectedRoom === room.roomId}>
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
                         </div>
                       )}
                     </div>
                   </div>
               </TabsContent>

               <TabsContent value="redis" className="space-y-6 flex-grow">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                       <div className="lg:col-span-1 bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                         <div className="border-b border-gray-200 dark:border-gray-700/70 p-4 sm:p-5">
                           <div className="flex items-center gap-2">
                             <KeyRound className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                             <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Room Keys ({redisKeys.length})</h2>
                           </div>
                           <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a key to view its value.</p>
                         </div>
                         <div className="p-3">
                           {loadingKeys ? (
                             <div className="flex justify-center items-center h-40">
                               <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                             </div>
                           ) : redisError && redisKeys.length === 0 ? (
                             <p className="text-center text-red-600 dark:text-red-400 p-4">{redisError}</p>
                           ) : redisKeys.length === 0 ? (
                             <p className="text-center text-gray-500 dark:text-gray-400 p-4">No room keys found.</p>
                           ) : (
                             <ScrollArea className="h-80 sm:h-96 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 bg-white/20 dark:bg-gray-950/20">
                               <div className="p-1">
                                 {redisKeys.map((key) => (
                                   <Button
                                     key={key}
                                     variant="ghost"
                                     className={`w-full text-left px-3 py-2 rounded-md hover:bg-white/50 dark:hover:bg-gray-800/60 text-sm font-mono text-gray-700 dark:text-gray-300 transition-colors ${selectedKey === key ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium' : ''}`}
                                     onClick={() => handleKeySelect(key)}
                                   >
                                     {key.replace(ROOM_PREFIX, '')}
                                   </Button>
                                 ))}
                               </div>
                             </ScrollArea>
                           )}
                         </div>
                       </div>

                       <div className="lg:col-span-2 bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                         <div className="border-b border-gray-200 dark:border-gray-700/70 p-4 sm:p-5">
                           <div className="flex items-center gap-2">
                             <List className="h-5 w-5 text-green-500 dark:text-green-400" />
                             <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Selected Key Value</h2>
                           </div>
                           <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all">
                             {selectedKey ? `Value for key: ${selectedKey}` : 'Select a key from the list.'}
                           </p>
                         </div>
                         <div className="p-3 sm:p-5">
                           {loadingValue ? (
                             <div className="flex justify-center items-center h-60">
                               <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                             </div>
                           ) : selectedKey && redisError && !keyValue ? (
                             <p className="text-center text-red-600 dark:text-red-400 p-4">{redisError}</p>
                           ): !selectedKey ? (
                             <p className="text-center text-gray-500 dark:text-gray-400 h-60 flex items-center justify-center">No key selected.</p>
                           ) : keyValue === null ? (
                             <p className="text-center text-gray-500 dark:text-gray-400 h-60 flex items-center justify-center">Key exists but has no value.</p>
                           ) : (
                             <div className="space-y-4">
                               <div>
                                 <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                   <History className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                                   <span>Parsed Match History:</span>
                                 </h4>
                                 {redisMatchHistory && redisMatchHistory.length > 0 ? (
                                   <ScrollArea className="h-60 sm:h-72 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 p-4 bg-gray-50/30 dark:bg-gray-800/30">
                                     <div className="space-y-3">
                                       {[...redisMatchHistory]
                                         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                         .map((match, index) => {
                                            const matchWinner = match.playerResults.find(p => p.playerId === match.winner);
                                            return (
                                              <div key={index} className="border border-gray-200 dark:border-gray-700/60 rounded-lg overflow-hidden bg-white/50 dark:bg-gray-900/40 shadow-sm">
                                                 <div className="bg-gray-100/60 dark:bg-gray-800/50 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700/60">
                                                   <div className="flex justify-between items-center">
                                                     <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                       Match #{redisMatchHistory.length - index} ({new Date(match.date).toLocaleString()})
                                                     </span>
                                                     <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200">Score: {match.finalScore}</Badge>
                                                   </div>
                                                 </div>
                                                 <div className="p-3 space-y-1.5">
                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                      <span className="text-gray-600 dark:text-gray-400">Winner:</span>
                                                      {matchWinner ? (
                                                        <>
                                                          <AvatarDisplay index={matchWinner.avatar_index ?? 0} size="xs" className="flex-shrink-0 rounded-full shadow-sm"/>
                                                          <span className="text-gray-700 dark:text-gray-300">{matchWinner.playerName} ({matchWinner.points} points)</span>
                                                        </>
                                                      ) : (
                                                        <span className="text-gray-500">N/A</span>
                                                      )}
                                                    </div>
                                                     <div>
                                                      <span className="text-xs text-gray-500 dark:text-gray-400">Other Players:</span>
                                                      <ul className="list-none pl-2 mt-1 space-y-1">
                                                        {match.playerResults
                                                          .filter(p => p.playerId !== match.winner)
                                                          .map(loser => (
                                                              <li key={loser.playerId} className="flex items-center gap-2 text-xs">
                                                                  <AvatarDisplay index={loser.avatar_index ?? 0} size="xs" className="flex-shrink-0 rounded-full shadow-sm"/>
                                                                  <span className="text-gray-700 dark:text-gray-300">{loser.playerName} ({loser.points} points)</span>
                                                              </li>
                                                        ))}
                                                        {match.playerResults.filter(p => p.playerId !== match.winner).length === 0 && (
                                                          <li className="text-xs text-gray-400 italic">No other players recorded.</li>
                                                        )}
                                                      </ul>
                                                    </div>
                                                 </div>
                                               </div>
                                            )
                                          })}
                                     </div>
                                   </ScrollArea>
                                 ) : redisMatchHistory === null && keyValue ? (
                                     <p className="text-sm text-orange-600 dark:text-orange-400 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 rounded-md">
                                       Could not parse history from JSON, or the `matchHistory` field is missing/null.
                                     </p>
                                 ) : (
                                   <div className="h-40 flex items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                                     No match history found in this game state.
                                   </div>
                                 )}
                               </div>

                               {parsedGameState && (
                                 <div>
                                   <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                     <Database className="h-4 w-4 text-blue-500 dark:text-blue-400"/>
                                     <span>Full Game State Object:</span>
                                   </h4>
                                   <ScrollArea className="h-60 sm:h-72 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-800/50 p-4">
                                     <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                                         {JSON.stringify(parsedGameState, null, 2)}
                                     </pre>
                                   </ScrollArea>
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                       </div>
                   </div>
               </TabsContent>

               <TabsContent value="avatars" className="flex-grow">
                 <AvatarManagementSection />
               </TabsContent>

               <TabsContent value="users" className="flex-grow">
                 <UserManagementSection />
               </TabsContent>
            </Tabs>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
