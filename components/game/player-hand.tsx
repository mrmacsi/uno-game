"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useGame } from "../providers/game-context"
import UnoCard from "./uno-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
  } = useGame()
  const [animatingCard, setAnimatingCard] = useState<string | null>(null)
  const [handWidth, setHandWidth] = useState(0)
  const prevCardsRef = useRef<string[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isScrollableWidth, setIsScrollableWidth] = useState(false)
  
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
        setTimeout(() => {
          setAnimatingCard(newCardId)
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
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(container.scrollLeft < scrollableWidth - 1)
      setIsScrollableWidth(scrollableWidth > 0)
    } else {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      setIsScrollableWidth(false)
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
      // Smaller scroll amount - 30% of visible width or 120px max
      const scrollAmount = Math.min(scrollContainerRef.current.clientWidth * 0.3, 120)
      const newPos = Math.max(0, scrollContainerRef.current.scrollLeft - scrollAmount)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })

      // Force recheck of scrollability after animation
      setTimeout(() => checkScrollability(), 500)
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      // Smaller scroll amount - 30% of visible width or 120px max
      const scrollAmount = Math.min(scrollContainerRef.current.clientWidth * 0.3, 120)
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
      const newPos = Math.min(maxScroll, scrollContainerRef.current.scrollLeft + scrollAmount)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      
      // Force recheck of scrollability after animation
      setTimeout(() => checkScrollability(), 500)
    }
  }

  // Center a specific card in view
  const centerCard = (index: number) => {
    if (scrollContainerRef.current && currentPlayer?.cards?.length) {
      // Get approximate card width (including overlap)
      const cardElements = scrollContainerRef.current.querySelectorAll('.card-wrapper')
      if (cardElements.length > 0) {
        // Calculate the desired scroll position to center the card
        const cardWidth = 80 // Approximate card width after scaling and overlap
        const containerWidth = scrollContainerRef.current.clientWidth
        const totalCardsWidth = cardWidth * currentPlayer.cards.length - (currentPlayer.cards.length - 1) * 20 // Adjust for overlap
        
        // Calculate left position of the card
        const cardPosition = (index * cardWidth) - (index * 20) // Adjust for overlap
        
        // Center position calculation
        const scrollPos = cardPosition - (containerWidth / 2) + (cardWidth / 2)
        
        // Constrain to valid scroll range
        const maxScroll = scrollContainerRef.current.scrollWidth - containerWidth
        const newPos = Math.max(0, Math.min(maxScroll, scrollPos))
        
        // Smooth scroll to position
        scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      }
    }
  }
  
  useEffect(() => {
    const handleScrollLeft = () => scrollLeft()
    const handleScrollRight = () => scrollRight()
    window.addEventListener('player-hand-scroll-left', handleScrollLeft)
    window.addEventListener('player-hand-scroll-right', handleScrollRight)
    return () => {
      window.removeEventListener('player-hand-scroll-left', handleScrollLeft)
      window.removeEventListener('player-hand-scroll-right', handleScrollRight)
    }
  }, [])
  
  if (!currentPlayerId || !state || !state.players) return null

  const currentPlayer = state.players.find((p: { id: string }) => p.id === currentPlayerId)

  if (!currentPlayer) return null

  const isMyTurn = state.currentPlayer === currentPlayerId
  
  // Calculate card spread based on number of cards and screen width
  const cardCount = currentPlayer.cards.length
  const maxOverlap = 40
  const minOverlap = 20
  const overlap = Math.max(minOverlap, maxOverlap - cardCount * 1.5)
  
  // Dynamic card spacing to ensure cards are visible and scrollable
  const cardSpacing = Math.max(0, -10 + (10 * Math.min(1, 10/cardCount)))
  
  // Check scrollability after cards are rendered - moved here after cardCount is defined
  useEffect(() => {
    // Check scrollability after a short delay to ensure cards are rendered
    const timer = setTimeout(() => checkScrollability(), 200)
    return () => clearTimeout(timer)
  }, [checkScrollability, cardCount])

  return (
    <TooltipProvider delayDuration={100}>
      <div className="relative z-40 flex flex-col flex-grow px-0 pb-1 sm:px-3 sm:pb-4 bg-black/40 backdrop-blur-md rounded-t-xl border-t border-x border-white/10 shadow-lg justify-center h-full w-full">
        
        {/* Absolutely Positioned Player Info Box -- REMOVED */}
        {/*
        {currentPlayer && (
          <div className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 pointer-events-auto w-44 sm:w-56 z-50">
             
            <div className="rounded-md sm:rounded-lg overflow-hidden transition-all duration-300 bg-black/50 shadow-md">
              <div className="p-1 sm:p-1.5 flex flex-col items-center">
                <p className={`text-white font-medium truncate text-[10px] sm:text-xs text-center w-full mb-0.5 sm:mb-1 ${isMyTurn ? 'text-green-300' : 'text-white/90'}`}>
                  {currentPlayer.name} {isMyTurn ? '(Your Turn)' : ''}
                </p>
                <div className="flex items-center justify-between w-full gap-1 sm:gap-1.5">
                  
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {isMyTurn && (
                      <div className="relative flex h-3 w-3 sm:h-4 sm:h-4 mr-0.5 sm:mr-1 items-center justify-center">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-white/60 text-[10px] sm:text-xs">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {currentPlayer.cards.length} <span className="hidden sm:inline">cards</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
               
              
              
            </div>
          </div>
        )}
        */}

        {/* Card count indicator removed */}
        {/*
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3/4 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-50 border border-white/20">
          {cardCount} cards
        </div>
        */}

        {/* Scroll buttons removed */}
        {/*
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between items-center z-50 pointer-events-none px-1">
          <Button
            variant="outline"
            size="icon"
            className={`h-8 w-8 rounded-full bg-black/70 border-white/30 backdrop-blur-md text-white shadow-lg pointer-events-auto
              ${canScrollLeft ? 'opacity-80 hover:opacity-100' : 'opacity-40 cursor-not-allowed'}`}
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon" 
            className={`h-8 w-8 rounded-full bg-black/70 border-white/30 backdrop-blur-md text-white shadow-lg pointer-events-auto
              ${canScrollRight ? 'opacity-80 hover:opacity-100' : 'opacity-40 cursor-not-allowed'}`}
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        */}
        
        <div className="flex items-center justify-center w-full overflow-hidden h-full">
          <div
            ref={scrollContainerRef}
            className={`w-full h-full scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-3 ${isScrollableWidth ? 'overflow-x-auto' : 'overflow-x-hidden'} overflow-y-visible`}
            style={{ scrollbarWidth: 'thin' }}
            onScroll={() => checkScrollability()}
          >
            <div 
              className="flex justify-center items-center h-full min-w-max mx-auto"
              style={{ 
                paddingBottom: '0.5rem', 
                paddingTop: '1.5rem',
                transform: `scale(${cardScale/100})`,
                transformOrigin: 'center bottom',
                width: 'max-content',
                ...(isScrollableWidth ? { paddingLeft: '50%', paddingRight: '50%' } : {})
              }}
            >
              <div className="flex items-stretch h-full">
                {currentPlayer.cards.map((card: import("@/lib/types").Card, index: number) => {
                  const isPlayable = isMyTurn && checkPlayValidity(state, card);
                  
                  const animationDelay = `${index * 0.05}s`;
                  const rotationDeg = Math.min(5, cardCount > 1 ? (index - (cardCount-1)/2) * (10/cardCount) : 0);
                  const isRecentlyDrawn = card.id === animatingCard;
                  return (
                    <div 
                      key={card.id} 
                      className={`transform transition-all duration-300 ease-out relative group h-full card-wrapper`}
                      style={{ 
                        marginLeft: index > 0 ? `-${Math.min(20, 45 - Math.min(45, cardCount * 1.5))}px` : undefined,
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
                          if (!isMyTurn) {
                            console.log('--> Click blocked by stricter guard (not turn)');
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
        </div>

        {/* Mobile swipe indicator */}
        <div className="flex justify-center mt-1 sm:hidden">
          <div className="w-12 h-1 bg-white/20 rounded-full"></div>
        </div>
      </div>
    </TooltipProvider>
  )
}
