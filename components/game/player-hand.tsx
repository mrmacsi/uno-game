"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useGame } from "../providers/game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { toast } from "@/hooks/use-toast"
import { checkPlayValidity } from "@/lib/game-logic"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function PlayerHand() {
  const { 
    state, 
    currentPlayerId, 
    playCard, 
    error: gameError, 
    isLoading, 
    promptColorSelection,
    cardScale, // Get from context
    increaseCardSize, // Get from context
    decreaseCardSize // Get from context
  } = useGame()
  const [animatingCard, setAnimatingCard] = useState<string | null>(null)
  const [handWidth, setHandWidth] = useState(0)
  const [handScrollPos, setHandScrollPos] = useState(0)
  const [recentlyDrawnCard, setRecentlyDrawnCard] = useState<string | null>(null)
  const prevCardsRef = useRef<string[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  
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

  // Effect to check scrollability
  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      const scrollableWidth = container.scrollWidth - container.clientWidth
      // Revert to checking > 0 for the left edge
      setCanScrollLeft(container.scrollLeft > 0)
      // Keep a threshold for the right edge
      setCanScrollRight(container.scrollLeft < scrollableWidth - 1)
    } else {
      setCanScrollLeft(false)
      setCanScrollRight(false)
    }
  }, []) // Empty dependency array, relies on refs

  // Update scrollability on resize and initial load
  useEffect(() => {
    checkScrollability() // Initial check
    const container = scrollContainerRef.current // Capture ref value

    window.addEventListener('resize', checkScrollability)
    if (container) {
      container.addEventListener('scroll', checkScrollability)
    }

    // Use MutationObserver to detect changes in children affecting scrollWidth
    const observer = new MutationObserver(checkScrollability)
    if (container) {
      observer.observe(container, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('resize', checkScrollability)
      if (container) {
        container.removeEventListener('scroll', checkScrollability)
      }
      observer.disconnect()
    }
  }, [checkScrollability, state?.players, cardScale]) // Re-check when players/cards change or scale changes

  // Scroll handlers
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.min(scrollContainerRef.current.clientWidth * 0.6, 250) // Scroll by 60% of visible width or 250px max
      const newPos = Math.max(0, scrollContainerRef.current.scrollLeft - scrollAmount)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setHandScrollPos(newPos) // Keep this if used elsewhere, otherwise remove
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.min(scrollContainerRef.current.clientWidth * 0.6, 250)
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
      const newPos = Math.min(maxScroll, scrollContainerRef.current.scrollLeft + scrollAmount)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setHandScrollPos(newPos) // Keep this if used elsewhere, otherwise remove
    }
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

  // Determine container height based on scale - adjust as needed
  const baseHeight = handWidth < 640 ? 88 : 180
  const containerHeight = `${(baseHeight * (cardScale / 100))}px`

  return (
    <TooltipProvider delayDuration={100}>
      <div className={`relative z-40 flex flex-col flex-grow px-0 pb-1 sm:px-3 sm:pb-4 bg-black/40 backdrop-blur-md rounded-t-xl border-t border-x border-white/10 shadow-lg`}>
        <div className="flex items-center w-full flex-grow overflow-hidden px-3 sm:px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex-shrink-0 transition-opacity duration-200 mr-1 ${
                  canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </TooltipTrigger>
            {canScrollLeft && <TooltipContent side="top">Scroll Left</TooltipContent>}
          </Tooltip>
          <div
            ref={scrollContainerRef}
            className="relative w-full flex-grow overflow-x-auto py-0.5 px-1 sm:px-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent sm:mx-0 hide-scrollbar"
            style={{ scrollbarWidth: 'none', overflowY: 'visible' }}
            onScroll={(e) => {
              setHandScrollPos(e.currentTarget.scrollLeft)
            }}
          >
            <div 
              className="flex justify-center mx-auto w-full h-full items-end"
              style={{ 
                paddingBottom: handWidth < 640 ? "0.15rem" : "0.5rem", 
                paddingTop: handWidth < 640 ? "1rem" : "1.5rem",
                transform: `scale(${cardScale/100})`,
                transformOrigin: 'center bottom'
              }}
            >
              <div className={`flex ${handWidth < 640 ? 'gap-2' : 'gap-1'} items-stretch h-full ${handWidth < 640 ? 'stagger-fade-in-up' : ''}`} style={{ marginLeft: handWidth < 640 ? undefined : `${overlap/2}px` }}>
                {currentPlayer.cards.map((card: import("@/lib/types").Card, index: number) => {
                  const isPlayable = isMyTurn && checkPlayValidity(state, card);
                  
                  const animationDelay = `${index * 0.05}s`;
                  const rotationDeg = Math.min(5, cardCount > 1 ? (index - (cardCount-1)/2) * (10/cardCount) : 0);
                  const isRecentlyDrawn = card.id === recentlyDrawnCard;
                  return (
                    <div 
                      key={card.id} 
                      className={`transform transition-all duration-300 ease-out relative group h-full`}
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
                        className={`z-10 relative h-full ${isPlayable && !isLoading ? 'hover:translate-y-[-8px] sm:hover:translate-y-[-10px] hover:scale-105 sm:hover:scale-110 group cursor-pointer' : ''
                        } ${isRecentlyDrawn ? 'scale-105 translate-y-[-12px] sm:translate-y-[-20px]' : ''}`}
                        style={{ animationDelay }}
                        onAnimationEnd={() => {
                          if (animatingCard === card.id) setAnimatingCard(null)
                        }}
                        onClick={async () => {
                          // --- Stricter Guard ---
                          if (!isMyTurn || isLoading || animatingCard) {
                            console.log('--> Click blocked by stricter guard (not turn / loading / animating)');
                            return;
                          }
                          const cardIsCurrentlyPlayable = checkPlayValidity(state, card);
                          if (!cardIsCurrentlyPlayable) {
                             console.log('--> Click blocked by stricter guard (card became unplayable)');
                             return;
                          }
                          // --- End Stricter Guard ---

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

                          // Immediately set animating state
                          setAnimatingCard(card.id);

                          // Always attempt to play - server will validate
                          try {
                            if (
                              card.type === "wild" ||
                              card.type === "wild4"
                            ) {
                              // Explicitly check turn again before opening selector
                              if (!isMyTurn) {
                                  setAnimatingCard(null); // Reset if turn changes mid-action
                                  console.log('--> Play blocked: Not your turn (checked before color prompt)');
                                  toast({ title: "Not Your Turn", description: "Wait for your turn to play.", variant: "default" });
                                  return;
                              }
                              // Restore original logic: promptColorSelection likely handles calling playCard internally
                              promptColorSelection(card.id);
                            } else {
                              await playCard(card.id);
                            }
                          } catch (error) {
                            console.error("Error playing card:", error);
                            // Error handled by useEffect hook now, but reset animation just in case
                            setAnimatingCard(null);
                          }
                          // Animation reset is handled by onAnimationEnd
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
                      {isPlayable && !isLoading && (
                        <div className="absolute inset-0 rounded-xl bg-green-500/10 filter blur-md opacity-0 group-hover:opacity-80 transition-opacity duration-300 z-0"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={scrollRight}
                disabled={!canScrollRight}
                className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex-shrink-0 transition-opacity duration-200 ${
                  canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </TooltipTrigger>
            {canScrollRight && <TooltipContent side="top">Scroll Right</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}