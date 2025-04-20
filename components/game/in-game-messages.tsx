"use client"

import { Button } from "@/components/ui/button"
import { useGame } from "../providers/game-context"
import { X } from "lucide-react"

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

interface InGameMessagesProps {
  onClose: () => void;
}

export default function InGameMessages({ onClose }: InGameMessagesProps) {
  const { sendGameMessage } = useGame()
  
  const handleSendMessage = async (message: string) => {
    await sendGameMessage(message)
    onClose();
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Quick Messages</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-grow grid grid-cols-1 gap-2 overflow-y-auto pr-1">
        {PRESET_MESSAGES.map((message) => (
          <Button
            key={message}
            variant="secondary"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white text-sm justify-start truncate h-auto py-2"
            onClick={() => handleSendMessage(message)}
          >
            {message}
          </Button>
        ))}
      </div>
    </div>
  )
} 