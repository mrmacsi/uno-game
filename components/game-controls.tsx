"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Shuffle, ArrowDown } from "lucide-react"
import { useEffect, useState } from "react"

export default function GameControls() {
  const { state, currentPlayerId, drawCard } = useGame()
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawCount, setDrawCount] = useState(0)

  const isMyTurn = state.currentPlayer === currentPlayerId
  
  // Track draw animations
  useEffect(() => {
    if (isDrawing) {
      const timer = setTimeout(() => {
        setIsDrawing(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isDrawing])

  const handleDrawCard = async () => {
    if (!isMyTurn) return
    
    setIsDrawing(true)
    setDrawCount(prev => prev + 1)
    await drawCard()
  }

  // Map color to gradient
  const colorGradients = {
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-400 to-yellow-500",
    black: "from-gray-700 to-gray-800"
  }
  
  const currentColorGradient = colorGradients[state.currentColor as keyof typeof colorGradients] || colorGradients.black

  return (
    <div className="px-3 py-2">
      <div className="relative overflow-hidden rounded-xl backdrop-blur-md border border-white/10 bg-black/30">
        {/* Color indicator overlay */}
        <div className={`absolute inset-0 bg-gradient-to-r ${currentColorGradient} opacity-20`}></div>
        
        <div className="relative z-10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${currentColorGradient}`}></div>
              <p className="text-white font-medium">
                Current Color: <span className="font-bold">{state.currentColor.toUpperCase()}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Shuffle className={`w-4 h-4 ${state.direction === 1 ? 'rotate-0' : 'rotate-180'}`} />
              <p>
                <span className="italic">{state.direction === 1 ? "Clockwise" : "Counter-Clockwise"}</span>
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Button
              onClick={handleDrawCard}
              disabled={!isMyTurn}
              className={`
                relative overflow-hidden group transition-all duration-200
                ${isMyTurn 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-blue-600/20' 
                  : 'bg-gray-700 opacity-50 cursor-not-allowed'}
                px-6 py-2 h-auto font-medium
              `}
            >
              {/* Animation elements */}
              <div className={`
                absolute inset-0 bg-white/20 transform origin-bottom scale-y-0 transition-transform duration-300
                ${isDrawing ? 'animate-wave-up' : ''}
              `}></div>
              
              <div className="relative flex items-center gap-2">
                <ArrowDown className="w-4 h-4" />
                <span>Draw Card</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}