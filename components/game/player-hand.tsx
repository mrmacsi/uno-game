"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { useGame } from "../providers/game-context"
import UnoCard from "./uno-card"
import { toast } from "sonner"
import { checkPlayValidity } from "@/lib/game-logic"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl'

export default function PlayerHand() {
  const t = useTranslations();
  const {
    state,
    currentPlayerId,
    playCard,
    error: gameError,
    isLoading,
    promptColorSelection,
    cardScale,
    isProcessingPlay,
  } = useGame()
  const [animatingCard, setAnimatingCard] = useState<string | null>(null)
  const prevCardsRef = useRef<string[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isScrollableWidth, setIsScrollableWidth] = useState(false)
  const [hasEverUserScrolled, setHasEverUserScrolled] = useState(false);

  useEffect(() => {
    if (gameError) {
      toast.error(t('error.unexpectedError'), {
        description: gameError,
      })
    }
  }, [gameError, t])

  useEffect(() => {
    if (!currentPlayerId || !state?.players) return
    const player = state.players.find((p: { id: string }) => p.id === currentPlayerId)
    if (!player) return
    const currentCardIds = player.cards.map((card: { id: string }) => card.id)
    if (prevCardsRef.current.length < currentCardIds.length) {
      const newCardId = currentCardIds.find((id: string) => !prevCardsRef.current.includes(id))
      if (newCardId && prevCardsRef.current.length > 0) {
        setAnimatingCard(newCardId)
      }
    }
    prevCardsRef.current = currentCardIds
  }, [state?.players, currentPlayerId])

  const checkScrollability = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      const canScroll = container.scrollWidth > container.clientWidth;
      setIsScrollableWidth(canScroll);
      if (canScroll && !hasEverUserScrolled) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            const currentContainer = scrollContainerRef.current;
            const middleScroll = (currentContainer.scrollWidth - currentContainer.clientWidth) / 2;
            currentContainer.scrollLeft = middleScroll;
          }
        });
      }
    } else {
      setIsScrollableWidth(false)
    }
  }, [hasEverUserScrolled]);

  const currentPlayerForEffect = currentPlayerId && state && state.players ? state.players.find((p: { id: string }) => p.id === currentPlayerId) : null
  const cardCountForEffect = currentPlayerForEffect ? currentPlayerForEffect.cards.length : 0

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    window.addEventListener('resize', checkScrollability)
    const userScrollHandler = () => setHasEverUserScrolled(true);
    if (container) {
      container.addEventListener('scroll', userScrollHandler)
    }
    const observer = new MutationObserver(checkScrollability)
    if (container) {
      observer.observe(container, { childList: true, subtree: true })
    }
    return () => {
      window.removeEventListener('resize', checkScrollability)
      if (container) {
        container.removeEventListener('scroll', userScrollHandler)
      }
      observer.disconnect()
    }
  }, [checkScrollability, state?.players, cardScale, cardCountForEffect]);

  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.min(scrollContainerRef.current.clientWidth * 0.3, 120)
      const newPos = Math.max(0, scrollContainerRef.current.scrollLeft - scrollAmount)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setTimeout(() => checkScrollability(), 500)
    }
  }, [checkScrollability])

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      const scrollAmount = Math.min(scrollContainerRef.current.clientWidth * 0.3, 120)
      const maxScroll = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth
      const newPos = Math.min(maxScroll, scrollContainerRef.current.scrollLeft + scrollAmount)
      scrollContainerRef.current.scrollTo({ left: newPos, behavior: 'smooth' })
      setTimeout(() => checkScrollability(), 500)
    }
  }, [checkScrollability])

  useEffect(() => {
    const handleScrollLeft = () => scrollLeft()
    const handleScrollRight = () => scrollRight()
    window.addEventListener('player-hand-scroll-left', handleScrollLeft)
    window.addEventListener('player-hand-scroll-right', handleScrollRight)
    return () => {
      window.removeEventListener('player-hand-scroll-left', handleScrollLeft)
      window.removeEventListener('player-hand-scroll-right', handleScrollRight)
    }
  }, [scrollLeft, scrollRight])

  const currentPlayer = currentPlayerId && state && state.players ? state.players.find((p: { id: string }) => p.id === currentPlayerId) : null
  const cardCount = currentPlayer ? currentPlayer.cards.length : 0
  const isMyTurn = currentPlayer ? state.currentPlayer === currentPlayerId : false

  if (!currentPlayerId || !state || !state.players) return null
  if (!currentPlayer) return null

  return (
    <div className="relative z-40 flex flex-col flex-grow px-0 pb-1 sm:px-3 sm:pb-4 bg-black/40 backdrop-blur-md rounded-t-xl border-t border-x border-white/10 shadow-lg justify-center h-full w-full">
      
      <div className="flex items-center justify-center w-full overflow-hidden h-full">
        <div
          ref={scrollContainerRef}
          className={`w-full h-full scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-3 ${isScrollableWidth ? 'overflow-x-auto' : 'overflow-x-hidden'} overflow-y-visible`}
          style={{ scrollbarWidth: 'thin' }}
        >
          <div 
            className="flex justify-center items-center h-full min-w-max mx-auto"
            style={{ 
              paddingBottom: '0.5rem', 
              paddingTop: '1.5rem',
              transform: `scale(${cardScale/100})`,
              transformOrigin: 'center bottom',
              width: 'max-content',
              paddingLeft: '20px', 
              paddingRight: '20px'
            }}
          >
            <div className="flex items-stretch h-full">
              {currentPlayer.cards.map((card: import("@/lib/types").Card, index: number) => {
                const isPlayable = isMyTurn && checkPlayValidity(state, card);
                const canInteract = isPlayable && !isLoading && !isProcessingPlay;
                
                const animationDelay = `${index * 0.05}s`;
                const rotationDeg = Math.min(5, cardCount > 1 ? (index - (cardCount-1)/2) * (10/cardCount) : 0);
                const isRecentlyDrawn = card.id === animatingCard;
                return (
                  <div 
                    key={card.id} 
                    className={cn(
                        "transform transition-all duration-300 ease-out relative group h-full card-wrapper",
                        isProcessingPlay ? 'pointer-events-none' : '',
                        canInteract ? 'card-in-hand cursor-pointer' : '' // Apply card-in-hand for hover if interactive
                    )}
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
                      className={cn(
                        "z-10 relative h-full",
                        // Removed hover effects from here, handled by parent with card-in-hand
                        isRecentlyDrawn && 'scale-105 translate-y-[-12px] sm:translate-y-[-20px]'
                      )}
                      style={{ animationDelay }}
                      onAnimationEnd={() => {
                        if (animatingCard === card.id) setAnimatingCard(null)
                      }}
                      onClick={async () => {
                        if (isProcessingPlay) {
                          console.log('--> Click blocked: Play is already processing.');
                          return;
                        }
                        if (!isMyTurn) {
                          console.log('--> Click blocked by stricter guard (not turn)');
                          return;
                        }
                        const cardIsCurrentlyPlayable = checkPlayValidity(state, card);
                        if (!cardIsCurrentlyPlayable) {
                           console.log('--> Click blocked by stricter guard (card became unplayable)');
                           return;
                        }

                        setAnimatingCard(card.id);

                        try {
                          if (
                            card.type === "wild" ||
                            card.type === "wild4"
                          ) {
                            if (!isMyTurn) {
                                setAnimatingCard(null);
                                console.log('--> Play blocked: Not your turn (checked before color prompt)');
                                toast("Not Your Turn", { description: "Wait for your turn to play." });
                                return;
                            }
                            promptColorSelection(card.id);
                          } else {
                            await playCard(card.id);
                          }
                        } catch (error) {
                          console.error("Error playing card:", error);
                          setAnimatingCard(null);
                        }
                      }}
                    >
                      {/* Apply card-playable-indicator directly to UnoCard if it's playable */}
                      <UnoCard
                        card={card}
                        disabled={!isPlayable || isProcessingPlay}
                        animationClass={animatingCard === card.id ? 'animate-play-card' : isRecentlyDrawn ? 'animate-float-in' : ''}
                        className={cn(isPlayable && "card-playable-indicator", isPlayable && !isRecentlyDrawn && "animate-pulse-subtle")}
                      />
                    </div>
                    
                    {isRecentlyDrawn && (
                      <div className="absolute -top-4 sm:-top-6 left-1/2 transform -translate-x-1/2 z-20 whitespace-nowrap">
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce-gentle">
                          New card
                        </span>
                      </div>
                    )}
                    
                    {/* This blurred background effect can remain as it is, triggered by parent group hover */}
                    {canInteract && (
                      <div className="absolute inset-0 rounded-xl bg-green-500/10 filter blur-md opacity-0 group-hover:opacity-80 transition-opacity duration-300 z-0"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-1 sm:hidden">
        <div className="w-12 h-1 bg-white/20 rounded-full"></div>
      </div>
    </div>
  )
}
