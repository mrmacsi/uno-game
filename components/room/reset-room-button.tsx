"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { RefreshCw, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ResetRoomButtonProps {
  roomId: string
  className?: string
}

export default function ResetRoomButton({ roomId, className }: ResetRoomButtonProps) {
  const [resetting, setResetting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleInitialClick = () => {
    setShowConfirm(true)
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  const handleReset = async () => {
    setShowConfirm(false)
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
        toast({
          title: "Room Reset",
          description: "Room has been reset successfully",
          variant: "default"
        })
        router.push("/")
      } else {
        const data = await response.json()
        toast({
          title: "Reset Failed",
          description: `Failed to reset room: ${data.error || "Unknown error"}`,
          variant: "destructive"
        })
      }
    } catch (err: unknown) {
      console.error("Reset game failed:", err)
      toast({ title: "Error", description: "Failed to reset room.", variant: "destructive" })
    } finally {
      setResetting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className={`${className} space-y-2`}>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-amber-700 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>All players will need to rejoin after reset. Are you sure?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="sm" 
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-2"></div>
                <span>Resetting...</span>
              </>
            ) : (
              "Yes, Reset Room"
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleCancel}
            disabled={resetting}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      className={`${className} group relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all`}
      onClick={handleInitialClick}
      disabled={resetting}
    >
      <div className="absolute inset-0 w-full h-full bg-black/10 transform scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-200"></div>
      <div className="relative flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        <span>{resetting ? "Resetting..." : "Reset Room"}</span>
      </div>
    </Button>
  )
}