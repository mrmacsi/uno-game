"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  const isDark = theme === "dark"
  const isLight = theme === "light"
  return (
    <div className={`p-1 bg-black/10 backdrop-blur-md rounded-full flex ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Switch to light mode"
        onClick={() => setTheme("light")}
        className={`
          rounded-full h-8 w-8
          transition-all duration-300 ease-in-out
          ${isLight 
            ? "bg-white text-amber-500 shadow-md" 
            : "text-white/70 hover:text-amber-300 hover:bg-white/10"}
        `}
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Switch to dark mode"
        onClick={() => setTheme("dark")}
        className={`
          rounded-full h-8 w-8
          transition-all duration-300 ease-in-out
          ${isDark 
            ? "bg-gray-800 text-blue-400 shadow-md" 
            : "text-white/70 hover:text-blue-300 hover:bg-white/10"}
        `}
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  )
}