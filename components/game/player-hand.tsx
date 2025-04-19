"use client"

import React, { useState, useEffect, useRef } from "react"
import { useGame } from "../providers/game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "@/hooks/use-toast"
import { checkPlayValidity } from "@/lib/game-logic"

export default function PlayerHand() {
  const { state, currentPlayerId, playCard, error: gameError, isLoading } = useGame()
  const [animatingCard, setAnimatingCard] = useState<string | null>(null)
  const [handWidth, setHandWidth] = useState(0)
  const [handScrollPos, setHandScrollPos] = useState(0)
  const [recentlyDrawnCard, setRecentlyDrawnCard] = useState<string | null>(null)
  const [cardScale, setCardScale] = useState(100) // Card size as percentage
  const prevCardsRef = useRef<string[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  
  // Show toast on game error
  useEffect(() => {
    if (gameError) {
      toast({
        title: "Game Error",
        description: gameError,
        variant: "destructive",
      })
    }
  }, [gameError])
  
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
    if (!currentPlayerId || !state?.players) return
    
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
  }, [state?.players, currentPlayerId])

  // Scroll handlers for mobile card browsing
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const newPos = Math.max(0, handScrollPos - 100)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setHandScrollPos(newPos)
    }
  }
  
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const newPos = handScrollPos + 100
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setHandScrollPos(newPos)
    }
  }
  
  // Card size adjusters
  const increaseCardSize = () => {
    setCardScale(Math.min(cardScale + 10, 130))
  }
  
  const decreaseCardSize = () => {
    setCardScale(Math.max(cardScale - 10, 50))
  }

  if (!currentPlayerId || !state || !state.players) return null

  const currentPlayer = state.players.find((p: { id: string }) => p.id === currentPlayerId)

  if (!currentPlayer) return null

  const isMyTurn = state.currentPlayer === currentPlayerId
  
  // Calculate card spread based on number of cards and screen width
  const cardCount = currentPlayer.cards.length
  const maxOverlap = handWidth < 640 ? 50 : 40 // More overlap on small screens
  const minOverlap = handWidth < 640 ? 30 : 20
  const overlap = Math.max(minOverlap, maxOverlap - cardCount * 1.5)

  return (
    <div className={`flex flex-col min-h-0 px-0 pb-1 sm:px-3 sm:pb-4 bg-black/40 backdrop-blur-md rounded-t-xl border-t border-x border-white/10 shadow-lg`} style={{ overflow: 'visible' }}>
      <div className="flex flex-col items-center w-full">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center mb-0 sm:mb-3 gap-0 sm:gap-0 px-3 pt-3">
          <div className="flex items-center gap-3">
            <h2 className="text-white text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2">
              Your Hand
              <span className="text-xs text-white/60 font-normal">
                ({currentPlayer.cards.length} cards)
              </span>
            </h2>
            
            <div className="hidden sm:flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={decreaseCardSize} 
                className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs text-white/60">{cardScale}%</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={increaseCardSize} 
                className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="mt-1 mb-2 flex justify-start">
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold shadow-md bg-gradient-to-r ${state.direction === 1 ? 'from-green-400 to-emerald-500 text-green-900' : 'from-yellow-300 to-yellow-500 text-yellow-900'}`}> 
              {state.direction === 1 ? '➡️ Clockwise' : '⬅️ Counter-Clockwise'}
            </span>
            
            {isMyTurn && (
              <div className="ml-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-medium px-3 py-0.5 rounded-full shadow-md">
                Your Turn
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile scroll controls */}
        {isMobile && cardCount > 4 && (
          <div className="flex justify-between items-center w-full px-2 mb-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={scrollLeft} 
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={decreaseCardSize} 
                className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={increaseCardSize} 
                className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={scrollRight} 
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="relative w-full overflow-x-auto py-0.5 px-0 sm:px-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent -mx-1 sm:mx-0 hide-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          <div 
            className="flex justify-center mx-auto w-full"
            style={{ 
              paddingBottom: handWidth < 640 ? "0.15rem" : "0.5rem", 
              paddingTop: handWidth < 640 ? "0.15rem" : "0.5rem",
              minHeight: handWidth < 640 ? "88px" : "180px",
              transform: `scale(${cardScale/100})`,
              transformOrigin: 'center bottom'
            }}
          >
            <div className={`flex ${handWidth < 640 ? 'gap-2' : 'gap-1'} ${handWidth < 640 ? 'stagger-fade-in-up' : ''}`} style={{ marginLeft: handWidth < 640 ? undefined : `${overlap/2}px` }}>
              {currentPlayer.cards.map((card: import("@/lib/types").Card, index: number) => {
                const isPlayable = isMyTurn && checkPlayValidity(state, card);
                
                const animationDelay = `${index * 0.05}s`;
                const rotationDeg = Math.min(5, cardCount > 1 ? (index - (cardCount-1)/2) * (10/cardCount) : 0);
                const isRecentlyDrawn = card.id === recentlyDrawnCard;
                return (
                  <div 
                    key={card.id} 
                    className={`transform transition-all duration-300 ease-out relative group`} 
                    style={{ 
                      marginLeft: undefined,
                      zIndex: isPlayable ? 50 + index : index,
                      transform: `rotate(${rotationDeg}deg)`,
                      transformOrigin: 'bottom center'
                    }}
                  >
                    {isRecentlyDrawn && (
                      <div className="absolute -inset-2 rounded-xl bg-yellow-400/30 animate-pulse-subtle z-0"></div>
                    )}
                    <div 
                      className={`transition-all duration-300 z-10 relative ${isPlayable ? 'hover:translate-y-[-32px] sm:hover:translate-y-[-40px] hover:scale-105 sm:hover:scale-110 group cursor-pointer' : ''
                      } ${isRecentlyDrawn ? 'scale-105 translate-y-[-12px] sm:translate-y-[-20px]' : ''}`}
                      style={{ animationDelay }}
                      onAnimationEnd={() => {
                        if (animatingCard === card.id) setAnimatingCard(null)
                      }}
                      onClick={async () => {
                        // Log state at the moment of click (keep for debugging)
                        const topCard = state.discardPile[state.discardPile.length - 1];
                        const currentPlayable = isMyTurn && checkPlayValidity(state, card);
                        const blockConditionMet = animatingCard || !currentPlayable || isLoading;

                        console.log('PlayerHand onClick:', {
                          cardId: card.id,
                          isPlayable_render: isPlayable,
                          isPlayable_click: currentPlayable,
                          isMyTurn,
                          isLoading,
                          animatingCard,
                          state_currentColor: state.currentColor,
                          state_topCardId: topCard?.id,
                          state_topCardColor: topCard?.color,
                          state_topCardType: topCard?.type,
                          blockConditionMet: blockConditionMet
                        });

                        // REMOVE client-side guard - let server handle validation
                        // if (blockConditionMet) {
                        //   console.log('--> Click blocked by client guard');
                        //   return;
                        // }
                        // console.log('--> Client guard passed, attempting play...');
                        
                        // Immediately set animating state
                        setAnimatingCard(card.id);
                        
                        // Always attempt to play - server will validate
                        try {
                          console.log(`Attempting playCard for ${card.id}`);
                          await playCard(card.id); 
                          console.log(`playCard succeeded for ${card.id}`);
                          // Reset animation state on successful server response
                          setAnimatingCard(null); 
                        } catch (error: unknown) {
                          console.error("Failed to play card (error caught in PlayerHand onClick):", error);
                          const errorMessage = error instanceof Error ? error.message : "Failed to play card. Please try again.";
                          toast({
                            title: "Action Failed",
                            description: errorMessage,
                            variant: "destructive",
                          });
                          // Reset animation state on error
                          setAnimatingCard(null);
                        }
                      }}
                    >
                      <div className={isPlayable ? 'animate-pulse-subtle' : ''}>
                        <UnoCard
                          card={card}
                          disabled={!isPlayable}
                          animationClass={animatingCard === card.id ? 'animate-play-card' : isRecentlyDrawn ? 'animate-float-in' : ''}
                          isMobile={isMobile}
                        />
                      </div>
                    </div>
                    
                    {/* Enhanced "new card" indicator */}
                    {isRecentlyDrawn && (
                      <div className="absolute -top-4 sm:-top-6 left-1/2 transform -translate-x-1/2 z-20 whitespace-nowrap">
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce-gentle">
                          New card
                        </span>
                      </div>
                    )}
                    
                    {/* Playable card glow effect */}
                    {isPlayable && (
                      <div className="absolute inset-0 rounded-xl bg-green-500/10 filter blur-md opacity-0 group-hover:opacity-80 transition-opacity duration-300 z-0"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}