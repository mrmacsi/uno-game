"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameState } from "@/lib/types"
import { Clock, Users, RefreshCw, Trash2, ArrowRightCircle, RotateCcw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 text-blue-800'
      case 'playing':
        return 'bg-green-100 text-green-800'
      case 'finished':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && rooms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Available Rooms</h2>
          <Skeleton className="h-8 w-24" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="w-full h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center text-red-500">
        <p>{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2" 
          onClick={fetchRooms}
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
        <p className="text-gray-600 mb-2">No rooms available</p>
        <p className="text-sm text-gray-500">Create a new room to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-800">Available Rooms</h2>
        <Button variant="outline" size="sm" className="rounded-full hover:bg-gray-50 transition-colors" onClick={fetchRooms}>
          <RefreshCw className="h-4 w-4 mr-1" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>
      
      <div className="space-y-3">
        {rooms.map((room) => {
          const action = actions[room.roomId] || { loading: false, message: null }
          const statusColorClass = getStatusColor(room.status)
          
          return (
            <Card key={room.roomId} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow transition-all duration-200 rounded-xl">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center text-base">
                    <div className="flex-1">
                      Room: <span className="font-mono">{room.roomId}</span>
                      {room.roomId === "DEFAULT" && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full text-[10px] uppercase font-semibold tracking-wide">
                          Default
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center px-2 py-1 bg-blue-50 rounded-full">
                      <Users className="h-3 w-3 mr-1 text-blue-600" />
                      <span className="text-blue-700 font-medium">
                        {room.players.length}/4 Players
                      </span>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full ${statusColorClass}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="font-medium capitalize">
                        {room.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <Link href={`/join-room?roomId=${room.roomId}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1">
                        <ArrowRightCircle className="h-3.5 w-3.5" />
                        <span>Join</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetRoom(room.roomId)}
                      disabled={action.loading}
                      className="rounded-lg border-gray-300 hover:bg-gray-50"
                    >
                      {action.loading ? 
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full"/> : 
                        <RotateCcw className="h-3.5 w-3.5" />
                      }
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRoom(room.roomId)}
                      disabled={action.loading}
                      className="rounded-lg border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700"
                    >
                      {action.loading ? 
                        <div className="animate-spin h-3.5 w-3.5 border-2 border-red-200 border-t-red-600 rounded-full"/> : 
                        <Trash2 className="h-3.5 w-3.5" />
                      }
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