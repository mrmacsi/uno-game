'use client' // Keep as client component for potential future interactions

import React, { useState } from 'react'
import Link from 'next/link'
import { avatars } from "@/lib/avatar-config"; // Only need avatars array here
import { AvatarDisplay } from "@/components/game/avatar-display"; // Import the new component
import { useToast } from "@/components/ui/use-toast"
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

// Removed size calculation as it's handled by AvatarDisplay

export default function AdminAvatarsPage() {
  const { toast } = useToast()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // State for selected index

  const handleAvatarClick = (name: string, index: number) => {
    // Toggle selection: if clicking the already selected one, deselect.
    if (selectedIndex === index) {
      setSelectedIndex(null);
      toast({ title: "Avatar Deselected" });
    } else {
      setSelectedIndex(index);
      toast({
        title: "Avatar Selected",
        description: `Name: ${name}, Index: ${index}`,
      });
      console.log(`Selected Avatar: ${name} (Index: ${index})`);
    }
  }

  const selectedAvatarName = selectedIndex !== null ? avatars[selectedIndex] : null;

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600">
      <div className="container mx-auto my-4 sm:my-6 space-y-6">
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/15 dark:border-gray-800/50">
            <div className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Available Avatars ({avatars.length})</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click an avatar to see size previews below.</p>
              </div>
              <Link href="/admin">
                <Button variant="outline" className="flex items-center gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Button>
              </Link>
            </div>
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
          <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
            <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/15 dark:border-gray-800/50">
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
    </main>
  )
} 