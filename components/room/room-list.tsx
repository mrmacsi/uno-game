"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameState, Player } from "@/lib/types"
import { AvatarDisplay } from "@/components/game/avatar-display"
import { Clock, Users, RefreshCw, Trash2, ArrowRightCircle, RotateCcw, Search, Sparkles, Play } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

// Define max players to display avatars for
const MAX_AVATARS_DISPLAY = 3;

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

  const performDeleteRoom = async (roomId: string) => {
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

  const handleAttemptDelete = (roomId: string) => {
    if (roomId === "DEFAULT") {
      resetRoom(roomId)
    } else {
      performDeleteRoom(roomId)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          bg: 'bg-gradient-to-r from-blue-500/10 to-blue-600/10',
          text: 'text-blue-600',
          border: 'border-blue-500/20',
          icon: <Clock className="h-3.5 w-3.5 text-blue-500" />
        }
      case 'playing':
        return {
          bg: 'bg-gradient-to-r from-green-500/10 to-green-600/10',
          text: 'text-green-600',
          border: 'border-green-500/20',
          icon: <Play className="h-3.5 w-3.5 text-green-500" />
        }
      case 'finished':
        return {
          bg: 'bg-gradient-to-r from-purple-500/10 to-purple-600/10',
          text: 'text-purple-600',
          border: 'border-purple-500/20',
          icon: <Sparkles className="h-3.5 w-3.5 text-purple-500" />
        }
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500/10 to-gray-600/10',
          text: 'text-gray-600',
          border: 'border-gray-500/20',
          icon: <Clock className="h-3.5 w-3.5 text-gray-500" />
        }
    }
  }

  if (loading && rooms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-4 gap-2 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Available Rooms</h2>
          <Skeleton className="h-8 sm:h-9 w-24 sm:w-28 rounded-full" />
        </div>
        <Skeleton className="w-full h-40 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm border border-red-500/20 p-4 sm:p-6 text-center">
        <p className="text-red-500 mb-2 sm:mb-3 text-sm sm:text-base">{error}</p>
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
      <div className="rounded-xl bg-gradient-to-br from-gray-500/5 to-gray-600/5 backdrop-blur-sm border border-gray-500/20 p-6 sm:p-8 text-center">
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
        <h2 className="text-xl font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Available Rooms
        </h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-white/80 hover:bg-white border-gray-200 hover:border-gray-300 text-gray-700 px-4 transition-all duration-200 shadow-sm hover:shadow" 
          onClick={fetchRooms}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">Refresh</span>
        </Button>
      </div>
      
      <div className="space-y-4">
        {rooms.map((room, index) => {
          const action = actions[room.roomId] || { loading: false, message: null }
          const statusStyle = getStatusStyle(room.status)
          const isDefault = room.roomId === "DEFAULT"
          // Calculate players to show and remainder
          const playersToShow = room.players.slice(0, MAX_AVATARS_DISPLAY);
          const remainingPlayers = room.players.length - playersToShow.length;
          
          return (
            <Card 
              key={room.roomId}
              className="overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white/90 backdrop-blur-sm opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
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
                  <span 
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
                  >
                    {statusStyle.icon}
                    <span className="ml-1.5 capitalize">{room.status}</span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-grow">
                  <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                     <Users className="h-3.5 w-3.5"/> 
                     Players ({room.players.length}/4)
                  </h4>
                  <div className="flex items-center -space-x-2 min-h-[24px]">
                    {playersToShow.length > 0 ? (
                      playersToShow.map((player: Player) => (
                        <AvatarDisplay 
                          key={player.id}
                          index={typeof player.avatarIndex === 'number' ? player.avatarIndex : 0}
                          size="xs"
                          className="ring-2 ring-white/90 dark:ring-gray-950/90 shadow-sm"
                        />
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic pl-1">Empty</p>
                    )}
                    {remainingPlayers > 0 && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800 shadow-sm z-10">
                        +{remainingPlayers}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-700/50 w-full sm:w-auto justify-end">
                  {!isDefault && (
                    <ConfirmationDialog
                      triggerButton={
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs bg-white/50 hover:bg-gray-100/50 border-gray-300/70 text-gray-700"
                          disabled={action.loading}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          {action.loading ? "Deleting..." : "Delete"}
                        </Button>
                      }
                      title={`Delete Room ${room.roomId}?`}
                      description="Are you sure you want to delete this room? This action cannot be undone."
                      confirmAction={() => handleAttemptDelete(room.roomId)}
                      confirmText={action.loading ? "Deleting..." : "Yes, Delete"}
                      isDestructive={true}
                    />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs bg-white/50 hover:bg-gray-100/50 border-gray-300/70 text-gray-700"
                    onClick={() => resetRoom(room.roomId)}
                    disabled={action.loading}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    {action.loading ? "Resetting..." : "Reset"}
                  </Button>
                  <Link href={`/room/${room.roomId}`} passHref>
                    <Button 
                      size="sm" 
                      className="rounded-full text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow hover:shadow-md transition-all"
                      disabled={action.loading || room.status === 'finished' || (room.status === 'playing' && room.players.length >= 4)}
                    >
                      {room.status === 'waiting' || room.status === 'playing' && room.players.length < 4 ? 'Join Room' : 'View'}
                      <ArrowRightCircle className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}