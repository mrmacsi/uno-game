"use client"

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Trash2, Edit, ArrowLeft, Users } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
// Import user fetching/deleting actions
import { getAllUsers, deleteUser, UserProfile } from "@/lib/user-actions";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // e.g., "delete-userId"

  // Fetch function using the imported action
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Error", { description: "Could not fetch users." });
      setUsers([]); // Clear users on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const performDeleteUser = async (userId: string) => {
    if (!userId) return;
    setLoadingAction(`delete-${userId}`);
    
    try {
      await deleteUser(userId);
      toast.success("User Deleted", { description: `User ${userId} was deleted.` });
      // Re-fetch users after deletion (revalidatePath in action should handle UI update, 
      // but fetching again ensures local state consistency)
      fetchUsers(); 
    } catch (error: unknown) {
      console.error("Failed to delete user:", error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Could not delete user." });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600">
      <div className="w-full max-w-4xl my-4 sm:my-6">
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/15 dark:border-gray-800/50">
             <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <Users className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                 <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">User Management</h1>
               </div>
               <Link href="/admin">
                 <Button variant="outline" size="sm" className="flex items-center gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium">
                   <ArrowLeft className="h-4 w-4" />
                   Back to Admin
                 </Button>
               </Link>
             </div>
          </div>
          
          <div className="p-4 sm:p-6">
            <Tabs defaultValue="list" className="w-full">
              <div className="mb-4 border-b border-white/15 dark:border-gray-800/50">
                <TabsList className="flex space-x-1 bg-transparent p-0">
                  <TabsTrigger
                    value="list"
                    className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors data-[state=active]:bg-white/70 data-[state=active]:text-blue-600 data-[state=active]:border-t data-[state=active]:border-l data-[state=active]:border-r data-[state=active]:border-white/20 dark:data-[state=active]:bg-gray-900/70 dark:data-[state=active]:text-blue-400 dark:data-[state=active]:border-gray-700/80 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 data-[state=inactive]:border-transparent data-[state=inactive]:hover:bg-white/30 dark:data-[state=inactive]:hover:bg-gray-800/50`}
                  >
                    User List
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list">
                <div className="bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                  <div className="border-b border-gray-200 dark:border-gray-700/70 p-5">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">All Users ({users.length})</h2>
                  </div>
                  <div className="p-5">
                    {loading && users.length === 0 ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : users.length === 0 && !loading ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                          No users found.
                      </div>
                    ) : (
                      <Table className="w-full">
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
                            const isDeleting = loadingAction === `delete-${user.player_id}`;
                            return (
                              <TableRow key={user.player_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                <TableCell className="py-4 px-4 text-sm font-medium text-gray-800 dark:text-gray-200">{user.display_name || '-'}</TableCell>
                                <TableCell className="py-4 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{user.username}</TableCell>
                                <TableCell className="py-4 px-4 text-sm font-mono text-gray-600 dark:text-gray-400">{user.player_id}</TableCell>
                                <TableCell className="py-4 px-4 text-sm">
                                  {user.admin ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                      Yes
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-300">
                                      No
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="py-4 px-4 text-right">
                                  <div className="flex justify-end items-center space-x-2">
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                           <Link href={`/profile/setup?playerId=${user.player_id}`} passHref>
                                              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800/60 rounded">
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
                                                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800/60 rounded" disabled={isDeleting}>
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
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  );
} 