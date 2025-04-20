"use client"

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Trash2, Edit, ArrowLeft, Users } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
// Import user fetching/deleting actions
import { getAllUsers, deleteUser, UserProfile } from "@/lib/user-actions";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // e.g., "delete-userId"
  const { toast } = useToast();

  // Fetch function using the imported action
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      setUsers([]); // Clear users on error
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const performDeleteUser = async (userId: string) => {
    if (!userId) return;
    setLoadingAction(`delete-${userId}`);
    
    try {
      await deleteUser(userId);
      toast({ title: "User Deleted", description: `User ${userId} was deleted.` });
      // Re-fetch users after deletion (revalidatePath in action should handle UI update, 
      // but fetching again ensures local state consistency)
      fetchUsers(); 
    } catch (error: unknown) {
      console.error("Failed to delete user:", error);
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not delete user.", variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-6 md:p-12 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-4xl"> {/* Increased max-width */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">User Management</h1>
            </div>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list">User List</TabsTrigger>
              {/* Add other tabs here if needed later, e.g., Add User */}
              {/* <TabsTrigger value="add">Add User</TabsTrigger> */}
            </TabsList>

            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle>All Users ({users.length})</CardTitle>
                  {/* Add refresh button? */}
                </CardHeader>
                <CardContent>
                  {loading && users.length === 0 ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                  ) : users.length === 0 && !loading ? (
                     <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                        No users found.
                     </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Username (Login)</TableHead>
                          <TableHead>Player ID</TableHead>
                          <TableHead>Admin</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => {
                          const isDeleting = loadingAction === `delete-${user.player_id}`;
                          return (
                            <TableRow key={user.player_id}>
                              <TableCell className="font-medium">{user.display_name || '-'}</TableCell>
                              <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">{user.username}</TableCell>
                              <TableCell className="font-mono text-xs">{user.player_id}</TableCell>
                              <TableCell>{user.admin ? 'Yes' : 'No'}</TableCell>
                              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center space-x-2">
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                         {/* Link Edit button to profile setup page */}
                                         <Link href={`/profile/setup?playerId=${user.player_id}`} passHref>
                                            <Button variant="outline" size="icon" className="h-8 w-8" title="Edit User">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Edit User</p></TooltipContent>
                                    </Tooltip>
                                     <Tooltip>
                                      <TooltipTrigger asChild>
                                          <ConfirmationDialog
                                              triggerButton={
                                                  <Button
                                                      variant="outline"
                                                      size="icon"
                                                      className="h-8 w-8 flex items-center gap-1 text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 dark:border-red-500/40 dark:hover:bg-red-900/30"
                                                      disabled={isDeleting}
                                                      title="Delete User"
                                                  >
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
                                      <TooltipContent><p>Delete User</p></TooltipContent>
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
                </CardContent>
              </Card>
            </TabsContent>
            {/* <TabsContent value="add">
              {/* Add User Form Component Here */}
            {/* </TabsContent> */}
          </Tabs>
        </div>
      </div>
    </main>
  );
} 