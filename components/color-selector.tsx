"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"

interface ColorSelectorProps {
  onSelectColor: (color: "red" | "blue" | "green" | "yellow") => void
  isOpen: boolean
}

export default function ColorSelector({ onSelectColor, isOpen }: ColorSelectorProps) {
  const colors = [
    { name: "Red", value: "red", bg: "bg-red-600" },
    { name: "Blue", value: "blue", bg: "bg-blue-600" },
    { name: "Green", value: "green", bg: "bg-green-600" },
    { name: "Yellow", value: "yellow", bg: "bg-yellow-500" },
  ]

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Choose a Color</DialogTitle>
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
