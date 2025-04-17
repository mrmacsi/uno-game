"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface ResetRoomButtonProps {
  roomId: string
  className?: string
}

export default function ResetRoomButton({ roomId, className }: ResetRoomButtonProps) {
  const [resetting, setResetting] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset this room? All players will need to rejoin.")) {
      try {
        setResetting(true)
        
        const response = await fetch("/api/reset-room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ roomId })
        })
        
        if (response.ok) {
          alert("Room has been reset successfully")
          router.push("/")
        } else {
          const data = await response.json()
          alert(`Failed to reset room: ${data.error || "Unknown error"}`)
        }
      } catch (error) {
        console.error("Error resetting room:", error)
        alert("An error occurred while resetting the room")
      } finally {
        setResetting(false)
      }
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      className={className}
      onClick={handleReset}
      disabled={resetting}
    >
      {resetting ? "Resetting..." : "Reset Room"}
    </Button>
  )
} 