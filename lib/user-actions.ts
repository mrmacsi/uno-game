'use server'

import { createClient } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

// Define a basic UserProfile type based on expected columns
// Align this with your actual Supabase table structure
export type UserProfile = {
  player_id: string;
  username: string;
  display_name: string | null;
  avatar_name: string | null;
  avatar_index: number | null;
  admin: boolean | null;
  created_at: string;
  updated_at: string | null;
};

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('player_id, username, display_name, admin, created_at, avatar_name, avatar_index, updated_at') // Select display_name
    .order('created_at', { ascending: false }); // Optional: Order by creation date

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error('Could not fetch users.');
  }

  // Ensure data conforms to UserProfile[], even if some rows have unexpected nulls handled by the type
  return data as UserProfile[]; 
}

export async function deleteUser(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required for deletion.');
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('player_id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    // Check for specific errors if needed, e.g., foreign key constraints
    throw new Error('Could not delete user.');
  }

  console.log(`User ${userId} deleted successfully.`);
  // Revalidate the path to update the user list UI
  revalidatePath('/admin/users');
} 