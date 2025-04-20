'use client'

import React from 'react'
import { cn } from "@/lib/utils"
import { 
    avatars, 
    getAvatarStyle, 
    baseImageWidth, 
    baseImageHeight, 
    rows, 
    columns 
} from "@/lib/avatar-config";

// Define the possible sizes
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

// Map sizes to pixel dimensions
const sizeMap: Record<AvatarSize, number> = {
    xs: 24, // Extra small (e.g., inline text)
    sm: 40, // Small (e.g., footer)
    md: 75, // Medium (e.g., admin list)
    lg: Math.min(baseImageWidth / columns, baseImageHeight / rows), // Large (same as setup preview)
};

interface AvatarDisplayProps {
  index: number;
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  index,
  size = 'md', // Default to medium size
  className,
  onClick,
}) => {
  const dimension = sizeMap[size] || sizeMap.md; // Get dimension from map, default to medium
  const backgroundStyles = getAvatarStyle(index, dimension);
  const avatarName = avatars[index] ?? 'Unknown Avatar';

  // Combine base classes, size classes, and custom classes
  const combinedClassName = cn(
    "relative overflow-hidden rounded-full shadow-sm bg-gray-200 dark:bg-gray-700 flex-shrink-0 border-2 border-transparent",
    onClick 
      ? "cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 dark:hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-150" 
      : "",
    className // Allow overriding or adding classes
  );

  return (
    <div
      className={combinedClassName}
      style={{
        width: `${dimension}px`, 
        height: `${dimension}px`, 
        ...backgroundStyles
      }}
      onClick={onClick}
      title={avatarName} // Add avatar name as tooltip
    >
      {/* Avatar is shown via background */}
    </div>
  );
}; 