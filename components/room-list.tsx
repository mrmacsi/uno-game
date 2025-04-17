"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameState } from "@/lib/types"
import { Clock, Users, RefreshCw, Trash2, ArrowRightCircle, RotateCcw, Search, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Play } from "lucide-react"

export default function RoomList() {
  const [rooms, setRooms] = useState<GameState[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<Record<string, { loading: boolean, message: string | null }>>({})
  const [refreshing, setRefreshing] = useState(false)

  const fetchRooms = async () => {
    try {
      setLoading(true)
      setError(null)
      setRefreshing(true)
      
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
      setTimeout(() => setRefreshing(false), 500) // Add slight delay for animation
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          bg: 'bg-gradient-to-r from-blue-500/10 to-blue-600/10',
          text: 'text-blue-500',
          border: 'border-blue-500/20',
          icon: <Clock className="h-3 w-3 text-blue-500" />
        }
      case 'playing':
        return {
          bg: 'bg-gradient-to-r from-green-500/10 to-green-600/10',
          text: 'text-green-500',
          border: 'border-green-500/20',
          icon: <Play className="h-3 w-3 text-green-500" />
        }
      case 'finished':
        return {
          bg: 'bg-gradient-to-r from-purple-500/10 to-purple-600/10',
          text: 'text-purple-500',
          border: 'border-purple-500/20',
          icon: <Sparkles className="h-3 w-3 text-purple-500" />
        }
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500/10 to-gray-600/10',
          text: 'text-gray-500',
          border: 'border-gray-500/20',
          icon: <Clock className="h-3 w-3 text-gray-500" />
        }
    }
  }

  if (loading && rooms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Available Rooms</h2>
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="w-full h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm border border-red-500/20 p-6 text-center">
        <p className="text-red-500 mb-3">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white/5 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-full px-4" 
          onClick={fetchRooms}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-gray-500/5 to-gray-600/5 backdrop-blur-sm border border-gray-500/20 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg font-medium mb-2">No rooms available</p>
        <p className="text-gray-500 mb-4">Create a new room to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Available Rooms</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300 text-gray-700 px-4 transition-all duration-200" 
          onClick={fetchRooms}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </Button>
      </div>
      
      <div className="space-y-4">
        {rooms.map((room) => {
          const action = actions[room.roomId] || { loading: false, message: null }
          const statusStyle = getStatusStyle(room.status)
          const isDefault = room.roomId === "DEFAULT"
          
          return (
            <Card 
              key={room.roomId} 
              className="overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white/90 backdrop-blur-sm"
            >
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-gray-800">{room.roomId}</span>
                      {isDefault && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide bg-gradient-to-r from-green-500/10 to-green-600/10 text-green-600 border border-green-500/20">
                          Default
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="px-5 pb-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-600 border border-blue-500/20">
                      <Users className="h-3.5 w-3.5 mr-1.5" />
                      <span className="text-xs font-medium">
                        {room.players.length}/4 Players
                      </span>
                    </div>
                    
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                      {statusStyle.icon}
                      <span className="text-xs font-medium ml-1.5 capitalize">
                        {room.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Player list */}
                  {room.players.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {room.players.map((player, idx) => (
                          <div 
                            key={player.id}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs"
                          >
                            {player.name}
                            {player.isHost && (
                              <span className="ml-1 w-2 h-2 rounded-full bg-yellow-400"></span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <Link href={`/join-room?roomId=${room.roomId}`} className="flex-1">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        <ArrowRightCircle className="h-4 w-4" />
                        <span>Join Room</span>
                      </Button>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetRoom(room.roomId)}
                      disabled={action.loading}
                      className="rounded-lg border-gray-300 bg-white hover:bg-gray-50 shadow-sm"
                      title="Reset Room"
                    >
                      {action.loading ? 
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"/> : 
                        <RotateCcw className="h-4 w-4 text-gray-600" />
                      }
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRoom(room.roomId)}
                      disabled={action.loading}
                      className="rounded-lg border-red-200 bg-white hover:bg-red-50 text-red-500 hover:text-red-600 shadow-sm"
                      title={isDefault ? "Reset Default Room" : "Delete Room"}
                    >
                      {action.loading ? 
                        <div className="animate-spin h-4 w-4 border-2 border-red-200 border-t-red-500 rounded-full"/> : 
                        <Trash2 className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  
                  {/* Status message */}
                  {action.message && (
                    <div className={`
                      mt-2 px-3 py-2 rounded-lg text-xs
                      ${action.message.includes("Error") 
                        ? "bg-red-50 text-red-600 border border-red-100" 
                        : "bg-green-50 text-green-600 border border-green-100"}
                    `}>
                      {action.message}
                    </div>
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