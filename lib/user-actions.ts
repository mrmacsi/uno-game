'use server'

import { createClient } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

// Define a type for the user data we expect
export interface User {
  player_id: string;
  username: string;
  display_name: string | null;
  admin: boolean;
  avatar_name: string | null;
  avatar_index: number | null; // Reverted to avatar_index
  created_at: string;
  updated_at: string | null;
}

export async function getAllUsers(): Promise<User[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('player_id, username, display_name, admin, created_at, avatar_name, avatar_index, updated_at') // Reverted to avatar_index
    .order('created_at', { ascending: false }); // Optional: Order by creation date

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error('Could not fetch users.');
  }

  // Ensure data conforms to User[], even if some rows have unexpected nulls handled by the type
  return data as User[]; 
}

export async function deleteUser(userId: string): Promise<void> {
  if (!userId) {
    console.error("[deleteUser] Error: Attempted to delete user with null/empty ID.")
    throw new Error('User ID is required for deletion.');
  }
  console.log(`[deleteUser] Attempting to delete user with ID: ${userId}`); // Log entry and ID

  const supabase = createClient();
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('player_id', userId);

    if (error) {
      console.error(`[deleteUser] Supabase error deleting user ${userId}:`, error); // Log Supabase error object
      // Throw a more specific error if possible, otherwise a generic one
      throw new Error(`Supabase error: ${error.message || 'Could not delete user.'}`); 
    }

    console.log(`[deleteUser] User ${userId} deleted successfully from Supabase.`);
    // Revalidate the path to update the user list UI
    revalidatePath('/admin/users');
    console.log("[deleteUser] Revalidated path /admin/users.");

  } catch (err) {
     // Catch errors thrown within the try block (including the re-throw from supabase error)
     console.error(`[deleteUser] Caught error during deletion process for user ${userId}:`, err);
     // Re-throw the error so the client-side handler knows it failed
     throw err; 
  }
} 