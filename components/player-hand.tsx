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
    
    const player = state.players.find(p => p.id === currentPlayerId)
    if (!player) return
    
    const currentCardIds = player.cards.map(card => card.id)
    
    // Check if a new card was added
    if (prevCardsRef.current.length < currentCardIds.length) {
      // Find the new card id (the one not in the previous array)
      const newCardId = currentCardIds.find(id => !prevCardsRef.current.includes(id))
      if (newCardId) {
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

  const currentPlayer = state.players.find((p) => p.id === currentPlayerId)

  if (!currentPlayer) return null

  const isMyTurn = state.currentPlayer === currentPlayerId
  const canSayUno = currentPlayer.cards.length === 2 && isMyTurn
  
  // Calculate card spread based on number of cards and screen width
  const cardCount = currentPlayer.cards.length
  const maxOverlap = handWidth < 640 ? 50 : 40 // More overlap on small screens
  const minOverlap = handWidth < 640 ? 30 : 20
  const overlap = Math.max(minOverlap, maxOverlap - cardCount * 1.5)

  return (
    <div className="relative px-3 py-4 bg-black/30 backdrop-blur-md rounded-t-xl border-t border-x border-white/10">
      <div className="flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-3">
          <h2 className="text-white text-lg font-semibold tracking-tight flex items-center gap-2">
            Your Hand
            <span className="text-xs text-white/60 font-normal">
              ({currentPlayer.cards.length} cards)
            </span>
          </h2>
          
          {isMyTurn && (
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-medium px-3 py-1 rounded-full shadow-md">
              Your Turn
            </div>
          )}
        </div>

        <div className="relative w-full overflow-x-auto py-1 px-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div 
            className="flex justify-center mx-auto"
            style={{ 
              paddingBottom: "1rem", 
              paddingTop: "1rem",
              minHeight: "200px"
            }}
          >
            <div className="flex" style={{ marginLeft: `${overlap/2}px` }}>
              {currentPlayer.cards.map((card, index) => {
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
                          ? 'hover:translate-y-[-40px] hover:scale-110 group cursor-pointer' 
                          : ''
                      } ${isRecentlyDrawn ? 'scale-105 translate-y-[-20px]' : ''}`}
                      style={{ animationDelay }}
                      onAnimationEnd={() => {
                        if (animatingCard === card.id) setAnimatingCard(null)
                      }}
                      onClick={() => {
                        if (isMyTurn && state.isValidPlay(card)) {
                          // Add a double check to ensure the card is still in the player's hand
                          const currentPlayerState = state.players.find(p => p.id === currentPlayerId);
                          if (currentPlayerState && currentPlayerState.cards.some(c => c.id === card.id)) {
                            setAnimatingCard(card.id);
                            playCard(card.id).catch(error => {
                              console.error("Error playing card:", error);
                              setAnimatingCard(null);
                              // Could add a toast here to notify the user
                            });
                          } else {
                            console.error("Card no longer in hand, may have been already played or removed");
                          }
                        }
                      }}
                    >
                      <div className={isPlayable ? 'animate-pulse-subtle' : ''}>
                        <UnoCard
                          card={card}
                          disabled={!isMyTurn || !state.isValidPlay(card)}
                          animationClass={animatingCard === card.id ? 'animate-play-card' : isRecentlyDrawn ? 'animate-float-in' : 'animate-deal-card'}
                        />
                        {isPlayable && (
                          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-gradient-to-r from-green-500 to-green-600 p-1.5 rounded-full text-white shadow-lg group-hover:animate-bounce-gentle">
                              <Play className="w-3 h-3" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {isRecentlyDrawn && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20 whitespace-nowrap">
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
        <div className="absolute bottom-6 right-6 z-50">
          <Button 
            onClick={sayUno} 
            className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-6 py-3 rounded-full shadow-lg animate-pulse border-2 border-white/30 transition-transform duration-300 hover:scale-110"
          >
            UNO!
          </Button>
        </div>
      )}
    </div>
  )
}