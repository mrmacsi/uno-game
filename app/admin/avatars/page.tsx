'use client' // Keep as client component for potential future interactions

import React, { useState } from 'react'
import Link from 'next/link'
import { avatars } from "@/lib/avatar-config"; // Only need avatars array here
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Grid Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
             <CardTitle>Available Avatars ({avatars.length})</CardTitle>
             <CardDescription>Click an avatar to see size previews below.</CardDescription>
          </div>
          {/* Back to Admin Button */}
          <Link href="/admin">
             <Button variant="outline">
               <ArrowLeft className="mr-2 h-4 w-4" />
               Back to Admin
             </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {/* Use responsive grid classes from Tailwind */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-x-4 gap-y-6">
            {avatars.map((name, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                 {/* Use AvatarDisplay component */}
                 <AvatarDisplay 
                    index={index} 
                    size="md" // Use medium size for the admin grid
                    onClick={() => handleAvatarClick(name, index)} 
                    // Add visual indication if selected
                    className={selectedIndex === index ? 'ring-2 ring-offset-2 ring-green-500 dark:ring-green-400' : ''} 
                 />
                <span className="text-xs text-center text-gray-600 dark:text-gray-400 truncate w-full pt-1">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Avatar Preview Card (Conditional) */}
      {selectedIndex !== null && selectedAvatarName && (
        <Card>
           <CardHeader>
             <CardTitle>Selected: {selectedAvatarName} (Index: {selectedIndex})</CardTitle>
             <CardDescription>Preview in different sizes:</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="flex items-end justify-center gap-6 flex-wrap">
                {/* Small Size */}
                <div className="flex flex-col items-center gap-1">
                    <AvatarDisplay index={selectedIndex} size="sm" />
                    <span className="text-xs text-muted-foreground">Small (sm)</span>
                </div>
                {/* Medium Size */}
                 <div className="flex flex-col items-center gap-1">
                    <AvatarDisplay index={selectedIndex} size="md" />
                     <span className="text-xs text-muted-foreground">Medium (md)</span>
                 </div>
                 {/* Large Size */}
                 <div className="flex flex-col items-center gap-1">
                     <AvatarDisplay index={selectedIndex} size="lg" />
                     <span className="text-xs text-muted-foreground">Large (lg)</span>
                 </div>
             </div>
           </CardContent>
        </Card>
      )}
    </div>
  )
} 