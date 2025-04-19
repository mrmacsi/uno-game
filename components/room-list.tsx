"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GameState } from "@/lib/types"
import { Clock, Users, RefreshCw, Trash2, ArrowRightCircle, RotateCcw, Search, Sparkles, Play } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"

// Skeleton component for a single room item
const RoomListItemSkeleton = () => (
  <Card className="overflow-hidden border border-gray-200/80 rounded-xl bg-white/90">
    <CardHeader className="pb-2 pt-4 px-5">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24 rounded" /> 
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="p-5 pt-2">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
        <div className="flex items-center gap-2">
           <Skeleton className="h-4 w-4 rounded-full" />
           <Skeleton className="h-4 w-8 rounded" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

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
      // Keep refreshing true until data is rendered to show skeleton
      // setRefreshing(false) // Removed: set refreshing false after data is shown
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
        {[1, 2].map((i) => (
          <Skeleton key={i} className="w-full h-32 sm:h-40 rounded-xl" />
        ))}
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
      
      <AnimatePresence initial={false}>
        {loading ? (
          // Show Skeleton when loading is true (initial load or refresh)
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((i) => (
              <RoomListItemSkeleton key={i} />
            ))}
          </motion.div>
        ) : rooms.length > 0 ? (
          // Show actual rooms when not loading and rooms exist
          <motion.div 
             key="rooms"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.3, delay: 0.1 }} // Slight delay for smoother transition
             className="space-y-4"
          >
            {rooms.map((room, index) => {
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
                      <span 
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
                      >
                        {statusStyle.icon}
                        <span className="ml-1.5 capitalize">{room.status}</span>
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    <div className="flex justify-between items-center mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{room.players.length} / 4 Players</span>
                      </div>
                    </div>
                    
                    {action.message && (
                      <p className={`text-xs mb-2 ${action.message.startsWith("Error") ? 'text-red-500' : 'text-green-600'}`}>
                        {action.message}
                      </p>
                    )}
                    
                    <div className="flex justify-end gap-2 mt-3">
                      {!isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs bg-white/50 hover:bg-gray-100/50 border-gray-300/70 text-gray-700"
                          onClick={() => deleteRoom(room.roomId)}
                          disabled={action.loading}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          {action.loading ? "Deleting..." : "Delete"}
                        </Button>
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
          </motion.div>
        ) : (
          // Show No Rooms Available message when not loading and rooms array is empty
          <motion.div 
            key="no-rooms"
            initial={{ opacity: 0 }} // Keep overall fade-in
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} // Add exit animation
            transition={{ duration: 0.2 }} // Faster overall fade
          >
             <div className="rounded-xl bg-gradient-to-br from-gray-500/5 to-gray-600/5 backdrop-blur-sm border border-gray-500/20 p-6 sm:p-8 text-center">
               {/* Animate Icon */}
               <motion.div
                 initial={{ scale: 0.5, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
               >
                 <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                   <Search className="h-8 w-8 text-gray-400" />
                 </div>
               </motion.div>
               {/* Animate Text 1 */}
               <motion.p 
                 className="text-gray-600 text-lg font-medium mb-2"
                 initial={{ y: 10, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.2, duration: 0.3 }}
               >
                 No rooms available
               </motion.p>
               {/* Animate Text 2 */}
               <motion.p 
                 className="text-gray-500 mb-4"
                 initial={{ y: 10, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.3, duration: 0.3 }}
               >
                 Create a new room to get started!
               </motion.p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  )
}