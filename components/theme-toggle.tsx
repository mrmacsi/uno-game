"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const isLight = theme === "light"

  return (
    <div className={className}>
      <Button
        variant={isLight ? "default" : "ghost"}
        size="icon"
        aria-label="Switch to light mode"
        onClick={() => setTheme("light")}
        style={{
          background: isLight ? "#fff" : undefined,
          color: isLight ? "#222" : undefined,
          borderRadius: 8,
          marginRight: 6,
        }}
      >
        <Sun className="h-5 w-5" />
      </Button>
      <Button
        variant={isDark ? "default" : "ghost"}
        size="icon"
        aria-label="Switch to dark mode"
        onClick={() => setTheme("dark")}
        style={{
          background: isDark ? "#222" : undefined,
          color: isDark ? "#fff" : undefined,
          borderRadius: 8,
        }}
      >
        <Moon className="h-5 w-5" />
      </Button>
    </div>
  )
}
