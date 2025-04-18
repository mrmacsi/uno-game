"use client"

import { useGame } from "./game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { Play } from "lucide-react"

export default function PlayerHand() {
  const { state, currentPlayerId, playCard, sayUno } = useGame()
  const [animatingCard, setAnimatingCard] = useState<string | null>(null)
  const [handWidth, setHandWidth] = useState(0)
  const [recentlyDrawnCard, setRecentlyDrawnCard] = useState<string | null>(null)
  const prevCardsRef = useRef<string[]>([])
  
  // Responsive hand layout
  useEffect(() => {
    const updateWidth = () => {
      setHandWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', updateWidth)
    updateWidth()
    
    return () => window.removeEventListener('resize', updateWidth)
  }, [])
  
  // Detect when a new card is added to the hand
  useEffect(() => {
    if (!currentPlayerId) return
    
    const player = state.players.find((p: { id: string }) => p.id === currentPlayerId)
    if (!player) return
    
    const currentCardIds = player.cards.map((card: { id: string }) => card.id)
    
    // Check if a new card was added
    if (prevCardsRef.current.length < currentCardIds.length) {
      // Find the new card id (the one not in the previous array)
      const newCardId = currentCardIds.find((id: string) => !prevCardsRef.current.includes(id))
      if (newCardId && prevCardsRef.current.length > 0) {
        setRecentlyDrawnCard(newCardId)
        setTimeout(() => {
          setRecentlyDrawnCard(null)
        }, 3000)
      }
    }
    
    // Update the reference to the current cards
    prevCardsRef.current = currentCardIds
  }, [state.players, currentPlayerId])

  if (!currentPlayerId) return null

  const currentPlayer = state.players.find((p: { id: string }) => p.id === currentPlayerId)

  if (!currentPlayer) return null

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canSayUno = currentPlayer.cards.length === 2 && isMyTurn
  
  // Calculate card spread based on number of cards and screen width
  const cardCount = currentPlayer.cards.length
  const maxOverlap = handWidth < 640 ? 50 : 40 // More overlap on small screens
  const minOverlap = handWidth < 640 ? 30 : 20
  const overlap = Math.max(minOverlap, maxOverlap - cardCount * 1.5)

  return (
    <div className={`flex flex-col min-h-0 px-0 pb-1 sm:px-3 sm:pb-4 bg-black/30 backdrop-blur-md rounded-t-xl border-t border-x border-white/10`} style={{ overflow: 'visible' }}>
      <div className="flex flex-col items-center w-full">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-0 sm:mb-3 gap-0 sm:gap-0 px-1 pt-1">
          <h2 className="text-white text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2">
            Your Hand
            <span className="text-xs text-white/60 font-normal">
              ({currentPlayer.cards.length} cards)
            </span>
          </h2>
          <div className="mt-1 mb-2 flex justify-start">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold shadow bg-gradient-to-r ${state.direction === 1 ? 'from-green-400 to-emerald-500 text-green-900' : 'from-yellow-300 to-yellow-500 text-yellow-900'}`}> 
              {state.direction === 1 ? '➡️ Clockwise' : '⬅️ Counter-Clockwise'}
            </span>
          </div>
          {isMyTurn && (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-medium px-3 py-1 rounded-full shadow-md">
              Your Turn
            </div>
          )}
        </div>
        <div className="relative w-full overflow-x-auto py-0.5 px-0 sm:px-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent -mx-1 sm:mx-0">
          <div 
            className="flex justify-center mx-auto w-full"
            style={{ 
              paddingBottom: handWidth < 640 ? "0.15rem" : "0.5rem", 
              paddingTop: handWidth < 640 ? "0.15rem" : "0.5rem",
              minHeight: handWidth < 640 ? "88px" : "180px"
            }}
          >
            <div className={`flex gap-0 sm:gap-1 ${handWidth < 640 ? 'stagger-fade-in-up' : ''}`} style={{ marginLeft: `${overlap/2}px` }}>
              {currentPlayer.cards.map((card: import("@/lib/types").Card, index: number) => {
                const isPlayable = isMyTurn && state.isValidPlay(card);
                const animationDelay = `${index * 0.05}s`;
                const rotationDeg = Math.min(5, cardCount > 1 ? (index - (cardCount-1)/2) * (10/cardCount) : 0);
                const isRecentlyDrawn = card.id === recentlyDrawnCard;
                return (
                  <div 
                    key={card.id} 
                    className={`transform transition-all duration-300 ease-out relative`} 
                    style={{ 
                      marginLeft: index === 0 ? 0 : `-${overlap}px`,
                      zIndex: isPlayable ? 50 + index : index,
                      transform: `rotate(${rotationDeg}deg)`,
                      transformOrigin: 'bottom center'
                    }}
                  >
                    {isRecentlyDrawn && (
                      <div className="absolute -inset-2 rounded-xl bg-yellow-400/30 animate-pulse-subtle z-0"></div>
                    )}
                    <div 
                      className={`transition-all duration-300 z-10 relative ${
                        isPlayable 
                          ? 'hover:translate-y-[-32px] sm:hover:translate-y-[-40px] hover:scale-105 sm:hover:scale-110 group cursor-pointer' 
                          : ''
                      } ${isRecentlyDrawn ? 'scale-105 translate-y-[-12px] sm:translate-y-[-20px]' : ''}`}
                      style={{ animationDelay }}
                      onAnimationEnd={() => {
                        if (animatingCard === card.id) setAnimatingCard(null)
                      }}
                      onClick={() => {
                        if (isMyTurn && state.isValidPlay(card)) {
                          const currentPlayerState = state.players.find((p: { id: string }) => p.id === currentPlayerId);
                          if (currentPlayerState && currentPlayerState.cards.some((c: import("@/lib/types").Card) => c.id === card.id)) {
                            setAnimatingCard(card.id);
                            playCard(card.id).catch((error: unknown) => {
                              setAnimatingCard(null);
                            });
                          }
                        }
                      }}
                    >
                      <div className={isPlayable ? 'animate-pulse-subtle' : ''}>
                        <UnoCard
                          card={card}
                          disabled={!isMyTurn || !state.isValidPlay(card)}
                          animationClass={animatingCard === card.id ? 'animate-play-card' : isRecentlyDrawn ? 'animate-float-in' : ''}
                        />
                        {isPlayable && (
                          <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-gradient-to-r from-green-500 to-green-600 p-1.5 rounded-full text-white shadow-lg group-hover:animate-bounce-gentle">
                              <Play className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {isRecentlyDrawn && (
                      <div className="absolute -top-4 sm:-top-6 left-1/2 transform -translate-x-1/2 z-20 whitespace-nowrap">
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce-gentle">
                          New card
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {canSayUno && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50 sm:static sm:justify-end w-full pb-2 sm:pb-0 mt-0">
          <Button 
            onClick={sayUno} 
            className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-8 py-2 rounded-full shadow-xl animate-pulse border-2 border-white/30 transition-transform duration-300 hover:scale-105 sm:hover:scale-110 text-lg sm:text-base"
            style={{ minWidth: 110, fontSize: handWidth < 640 ? 20 : 18 }}
          >
            UNO!
          </Button>
        </div>
      )}
    </div>
  )
}