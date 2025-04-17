"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameState } from "@/lib/types"
import { Clock, Users, RefreshCw, Trash2 } from "lucide-react"

export default function RoomList() {
  const [rooms, setRooms] = useState<GameState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<Record<string, { loading: boolean, message: string | null }>>({})

  const fetchRooms = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/rooms")
      
      if (!response.ok) {
        throw new Error("Failed to fetch rooms")
      }
      
      const data = await response.json()
      setRooms(data.rooms)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      setError("Failed to load rooms")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
    
    // Poll for room updates
    const intervalId = setInterval(fetchRooms, 10000)
    
    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const resetRoom = async (roomId: string) => {
    try {
      setActions(prev => ({
        ...prev,
        [roomId]: { loading: true, message: null }
      }))
      
      const response = await fetch("/api/reset-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roomId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setActions(prev => ({
          ...prev,
          [roomId]: { loading: false, message: "Reset successful" }
        }))
        fetchRooms()
      } else {
        setActions(prev => ({
          ...prev,
          [roomId]: { loading: false, message: `Error: ${data.error || "Failed to reset"}` }
        }))
      }
    } catch (error) {
      console.error(`Error resetting room ${roomId}:`, error)
      setActions(prev => ({
        ...prev,
        [roomId]: { loading: false, message: "Error: Something went wrong" }
      }))
    }
  }

  const deleteRoom = async (roomId: string) => {
    if (roomId === "DEFAULT") {
      // Just reset the default room instead of deleting
      return resetRoom(roomId)
    }
    
    if (!confirm(`Are you sure you want to delete room ${roomId}?`)) {
      return
    }
    
    try {
      setActions(prev => ({
        ...prev,
        [roomId]: { loading: true, message: null }
      }))
      
      const response = await fetch("/api/delete-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ roomId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        fetchRooms()
      } else {
        setActions(prev => ({
          ...prev,
          [roomId]: { loading: false, message: `Error: ${data.error || "Failed to delete"}` }
        }))
      }
    } catch (error) {
      console.error(`Error deleting room ${roomId}:`, error)
      setActions(prev => ({
        ...prev,
        [roomId]: { loading: false, message: "Error: Something went wrong" }
      }))
    }
  }

  if (loading && rooms.length === 0) {
    return <div className="text-center py-8">Loading rooms...</div>
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">{error}</div>
  }

  if (rooms.length === 0) {
    return <div className="text-center py-8">No rooms available. Create a new room!</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Available Rooms</h2>
        <Button variant="outline" size="sm" onClick={fetchRooms}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {rooms.map((room) => {
          const action = actions[room.roomId] || { loading: false, message: null }
          return (
            <Card key={room.roomId} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center">
                    Room: {room.roomId}
                    {room.roomId === "DEFAULT" && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Default Room
                      </span>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-blue-600" />
                      <span>
                        Players: {room.players.length}/4
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                      <span>
                        Status: {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Link href={`/join-room?roomId=${room.roomId}`} className="col-span-1">
                      <Button variant="default" size="sm" className="w-full">
                        Join
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetRoom(room.roomId)}
                      disabled={action.loading}
                      className="col-span-1"
                    >
                      {action.loading ? "Resetting..." : "Reset"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteRoom(room.roomId)}
                      disabled={action.loading}
                      className="col-span-1"
                    >
                      {action.loading ? "Processing..." : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {action.message && (
                    <p className={`text-xs mt-1 ${action.message.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                      {action.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 