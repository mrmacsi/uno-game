"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Check, PaintBucket } from "lucide-react"
import { useState } from "react"

interface ColorSelectorProps {
  onSelectColor: (color: "red" | "blue" | "green" | "yellow") => void
  isOpen: boolean
  onClose?: () => void
}

export default function ColorSelector({ onSelectColor, isOpen, onClose }: ColorSelectorProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  
  const colors = [
    { 
      name: "Red", 
      value: "red", 
      bg: "bg-gradient-to-br from-red-400 to-red-600",
      hoverBg: "hover:from-red-500 hover:to-red-700",
      ringColor: "ring-red-400",
      shadow: "shadow-red-500/30",
      textColor: "text-red-50"
    },
    { 
      name: "Blue", 
      value: "blue", 
      bg: "bg-gradient-to-br from-blue-400 to-blue-600",
      hoverBg: "hover:from-blue-500 hover:to-blue-700",
      ringColor: "ring-blue-400",
      shadow: "shadow-blue-500/30",
      textColor: "text-blue-50"
    },
    { 
      name: "Green", 
      value: "green", 
      bg: "bg-gradient-to-br from-green-400 to-green-600",
      hoverBg: "hover:from-green-500 hover:to-green-700",
      ringColor: "ring-green-400",
      shadow: "shadow-green-500/30",
      textColor: "text-green-50"
    },
    { 
      name: "Yellow", 
      value: "yellow", 
      bg: "bg-gradient-to-br from-yellow-300 to-yellow-500",
      hoverBg: "hover:from-yellow-400 hover:to-yellow-600",
      ringColor: "ring-yellow-300",
      shadow: "shadow-yellow-500/30",
      textColor: "text-yellow-50"
    },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md border-none bg-black/90 backdrop-blur-xl text-white shadow-2xl rounded-xl">
        <div className="absolute inset-0 rounded-xl overflow-hidden -z-10">
          <div className={`absolute inset-0 transition-all duration-500 opacity-30 ${
            hoveredColor 
              ? `bg-${hoveredColor}-500` 
              : 'bg-gradient-to-br from-blue-500 via-purple-500 to-red-500'
          }`} />
        </div>
        
        <DialogHeader className="pb-2">
          <DialogTitle className="text-center flex items-center justify-center gap-2 text-white">
            <PaintBucket className="h-5 w-5 text-white/70" />
            <span>Choose a Color</span>
          </DialogTitle>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-all duration-200" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {colors.map((color) => (
            <button
              key={color.value}
              className={`
                ${color.bg} ${color.hoverBg}
                h-24 sm:h-32 rounded-xl text-white font-medium text-lg 
                transition-all duration-300 transform hover:scale-105 hover:-translate-y-1
                flex flex-col items-center justify-center gap-2
                border border-white/20 ${color.shadow} shadow-xl
                focus:outline-none focus:ring-2 ${color.ringColor} focus:ring-offset-2 focus:ring-offset-black
                cursor-pointer
              `}
              onClick={() => onSelectColor(color.value as "red" | "blue" | "green" | "yellow")}
              onMouseEnter={() => setHoveredColor(color.value)}
              onMouseLeave={() => setHoveredColor(null)}
            >
              <div className={`
                w-12 sm:w-14 h-12 sm:h-14 rounded-full ${color.bg} flex items-center justify-center
                shadow-inner border border-white/30
              `}>
                <Check className="h-5 sm:h-6 w-5 sm:w-6 text-white" />
              </div>
              <span className={`${color.textColor} font-bold tracking-wide`}>
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}