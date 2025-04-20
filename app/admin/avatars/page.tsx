'use client' // Keep as client component for potential future interactions

import React from 'react'
import { 
    avatars, 
    imageUrl, 
    baseImageWidth, 
    baseImageHeight, 
    rows, 
    columns, 
    getAvatarStyle 
} from "@/lib/avatar-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Calculate display size for admin page to match AvatarSelector preview
const baseAvatarWidth = baseImageWidth / columns;
const baseAvatarHeight = baseImageHeight / rows;
const avatarDisplaySize = Math.min(baseAvatarWidth, baseAvatarHeight); // Use the same size as preview

export default function AdminAvatarsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Available Avatars ({avatars.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {avatars.map((name, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div
                  className="relative overflow-hidden rounded-md shadow-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
                  style={{
                    width: `${avatarDisplaySize}px`, 
                    height: `${avatarDisplaySize}px`, 
                    ...getAvatarStyle(index) // Apply background styles
                  }}
                  title={`${name} (Index: ${index})`} // Add tooltip
                >
                  {/* Avatar shown via background style */}
                </div>
                <span className="text-xs text-center text-gray-600 dark:text-gray-400 truncate w-full">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 