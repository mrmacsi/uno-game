"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "./ui/dialog"
import { X } from "lucide-react"

interface ColorSelectorProps {
  onSelectColor: (color: "red" | "blue" | "green" | "yellow") => void
  isOpen: boolean
  onClose?: () => void
}

export default function ColorSelector({ onSelectColor, isOpen, onClose }: ColorSelectorProps) {
  const colors = [
    { name: "Red", value: "red", bg: "bg-red-600" },
    { name: "Blue", value: "blue", bg: "bg-blue-600" },
    { name: "Green", value: "green", bg: "bg-green-600" },
    { name: "Yellow", value: "yellow", bg: "bg-yellow-500" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Choose a Color</DialogTitle>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {colors.map((color) => (
            <Button
              key={color.value}
              className={`${color.bg} h-20 text-white font-bold text-lg hover:scale-105 transition-transform`}
              onClick={() => onSelectColor(color.value as "red" | "blue" | "green" | "yellow")}
            >
              {color.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
