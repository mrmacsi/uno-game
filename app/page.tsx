"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"

export default function Home() {
  // Default room ID that's always available
  const defaultRoomId = "DEFAULT"
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  
  const resetDefaultRoom = async () => {
    try {
      setResetting(true)
      setResetMessage("")
      
      const response = await fetch("/api/reset-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roomId: defaultRoomId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResetMessage("Default room reset successfully!")
      } else {
        setResetMessage(`Error: ${data.error || "Failed to reset room"}`)
      }
    } catch (error) {
      setResetMessage("Error: Something went wrong")
      console.error(error)
    } finally {
      setResetting(false)
    }
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-red-600">UNO</h1>
          <p className="mt-4 text-gray-600">Play the classic card game online with friends</p>
        </div>

        <div className="space-y-4">
          <Link href="/create-room" className="w-full">
            <Button className="w-full bg-red-600 hover:bg-red-700 text-lg py-6">Create Room</Button>
          </Link>

          <Link href="/join-room" className="w-full">
            <Button variant="outline" className="w-full text-lg py-6 border-2">
              Join Room
            </Button>
          </Link>
          
          <div className="pt-2">
            <p className="text-sm text-gray-600 mb-2 text-center">- OR -</p>
            <Link href={`/join-room?roomId=${defaultRoomId}`} className="w-full">
              <Button variant="secondary" className="w-full bg-green-600 hover:bg-green-700 text-white py-4">
                Join Default Room
              </Button>
            </Link>
            <p className="text-xs text-gray-500 mt-2 text-center">
              A public room that's always available
            </p>
            
            <div className="mt-4 flex flex-col items-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs" 
                onClick={resetDefaultRoom}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Reset Default Room"}
              </Button>
              {resetMessage && (
                <p className={`text-xs mt-1 ${resetMessage.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                  {resetMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 pt-4">
          <p>Built with Next.js and Pusher</p>
        </div>
      </div>
    </main>
  )
}
