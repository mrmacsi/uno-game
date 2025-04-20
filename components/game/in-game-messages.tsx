"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { useGame } from "../providers/game-context"

const PRESET_MESSAGES = [
  "Good game!",
  "Oh no! Oh no! Oh no no no no no!",
  "OMG!",
  "Hahahaha!",
  "Nice move!",
  "Wow!",
  "Oops!",
  "Loser!",
  "Let's go!",
  "So close!"
]

export default function InGameMessages() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { sendGameMessage } = useGame()
  
  const handleSendMessage = async (message: string) => {
    await sendGameMessage(message)
    setIsExpanded(false)
    
    toast({
      title: "Message Sent",
      description: message,
      duration: 2000,
    })
  }
  
  return (
    <div className="absolute top-20 left-2 sm:left-4 z-30">
      {isExpanded ? (
        <div className="bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-2 shadow-lg animate-in slide-in-from-left duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-white">Quick Messages</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-w-[150px]">
            {PRESET_MESSAGES.map((message) => (
              <Button
                key={message}
                variant="secondary"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white text-xs justify-start truncate"
                onClick={() => handleSendMessage(message)}
              >
                {message}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="bg-black/40 backdrop-blur-sm text-white border-white/10 hover:bg-white/10 hover:text-white"
        >
          Messages
        </Button>
      )}
    </div>
  )
} 