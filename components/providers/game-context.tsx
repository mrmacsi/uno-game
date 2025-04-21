"use client"

import React, { createContext, useContext, useEffect, useReducer, useState, type ReactNode, useRef, useCallback } from "react"
import { useRouter } from 'next/navigation'
import pusherClient from "@/lib/pusher-client"
import type { GameState, GameAction, Card, CardColor, LogEntry } from "@/lib/types"
import { playCard, drawCard, declareUno, passTurn, startGame as startGameAction, rematchGame } from "@/lib/game-actions"
import { getRoom, resetRoom } from "@/lib/room-actions"
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils"
import type { Channel } from "pusher-js"
import Pusher from 'pusher-js'
import { checkPlayValidity as checkPlayValidityLogic } from '@/lib/game-logic'
import { toast } from "sonner"

type GameContextType = {
  state: GameState
  playCard: (cardId: string, selectedColor?: CardColor) => Promise<void>
  drawCard: () => Promise<void>
  declareUno: () => Promise<void>
  currentPlayerId: string | null
  refreshGameState: () => Promise<void>
  selectWildCardColor: (color: CardColor) => Promise<void>
  isColorSelectionOpen: boolean
  pendingWildCardId: string | null
  closeColorSelector: () => void
  passTurn: (forcePass?: boolean) => Promise<void>
  hasPlayableCard: () => boolean
  drawnCardPlayable: Card | null
  roomId: string | null
  isLoading: boolean
  error: string | null
  startGame: () => Promise<void>
  resetGame: () => Promise<void>
  rematch: () => Promise<void>
  leaveRoom: () => void
  promptColorSelection: (cardId: string) => void
  cardScale: number
  increaseCardSize: () => void
  decreaseCardSize: () => void
  sendGameMessage: (message: string) => Promise<void>
  ringOpponent: (playerId: string) => Promise<void>
  gameStartTime: number | null
  getGameDuration: () => string
}

const GameContext = createContext<GameContextType | undefined>(undefined)

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "UPDATE_GAME_STATE":
      return { ...action.payload }
    default:
      return state
  }
}

// Helper function to format card description
function formatCardDescription(logEntry: LogEntry): string {
  if (!logEntry.cardType) return "a card"; // Fallback
  const color = logEntry.cardColor && logEntry.cardColor !== 'black' ? `${logEntry.cardColor.charAt(0).toUpperCase() + logEntry.cardColor.slice(1)} ` : "";
  if (logEntry.cardType === 'number') {
    return `${color}${logEntry.cardValue}`;
  }
  const typeName = logEntry.cardType.charAt(0).toUpperCase() + logEntry.cardType.slice(1).replace('4', ' 4');
  return `${color}${typeName}`;
}

// Add a type for the ring notification data
interface RingNotificationData {
  from: {
    id: string;
    name: string;
    avatarIndex: number;
  };
  timestamp: number;
}

export function GameProvider({
  children,
  initialState,
  roomId,
}: {
  children: ReactNode
  initialState: GameState
  roomId: string
}) {
  const router = useRouter()
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    typeof window !== "undefined" ? getPlayerIdFromLocalStorage() : null
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  const [isColorSelectionOpen, setIsColorSelectionOpen] = useState(false)
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null)
  
  const [cardScale, setCardScale] = useState(100)
  
  const previousLogRef = useRef<LogEntry[]>([])
  
  const [drawnCardPlayable, setDrawnCardPlayable] = useState<Card | null>(null)
  
  const [isResetting, setIsResetting] = useState(false)
  
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  
  // Pre-load notification sound
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)

  // Initialize notification sound on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Create audio element once and reuse it
        const audio = new Audio()
        audio.src = "/sounds/notification.wav"
        audio.preload = "auto"
        audio.volume = 0.8
        
        // Store in ref for later use
        notificationSoundRef.current = audio
        
        // Load the audio immediately
        audio.load()
        
        console.log("[GameProvider] Preloaded notification sound")
        
        // Clean up on unmount
        return () => {
          if (notificationSoundRef.current) {
            notificationSoundRef.current.src = ""
            notificationSoundRef.current = null
          }
        }
      } catch (err) {
        console.error("[GameProvider] Error preloading sound:", err)
      }
    }
  }, [])
  
  // Format the game duration as mm:ss
  const getGameDuration = useCallback((): string => {
    // Use gameStartTime from state if available, fall back to local state
    const startTime = state.gameStartTime || gameStartTime
    
    if (!startTime) return "00:00"
    
    const durationMs = Date.now() - startTime
    const totalSeconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }, [state.gameStartTime, gameStartTime])

  const updateGameState = useCallback((newGameState: GameState) => {
    try {
      dispatch({ type: "UPDATE_GAME_STATE", payload: newGameState })
      setError(null)
    } catch (err) {
      console.error("[GameProvider] Error updating game state:", err)
      setError(err instanceof Error ? err.message : "Error updating game state")
    }
  }, [])
  
  useEffect(() => {
    if (!state.log) {
      previousLogRef.current = []
      return
    }
    
    const prevLog = previousLogRef.current
    const currentLog = state.log
    
    // Only show toast for entries added since the last check
    const newEntries = currentLog.slice(prevLog.length);

    newEntries.forEach(newestEntry => {
      // Check if this specific entry ID has already been processed (handle potential duplicates)
      if (prevLog.some(entry => entry.id === newestEntry.id)) {
        console.log(`[GameProvider Toast] Skipping already processed log entry: ${newestEntry.id}`);
        return; // Skip already processed entry
      }
      
      console.log(`[GameProvider Toast] Processing new log entry:`, newestEntry);

      let toastTitle = "Game Update";
      let toastDescription = newestEntry.message;
      let toastVariant: "default" | "destructive" = "default";
      let duration = 2000;

      switch (newestEntry.eventType) {
        case 'play':
          toastTitle = `${newestEntry.player || 'Someone'} Played`;
          toastDescription = formatCardDescription(newestEntry);
          duration = 1500; // Shorter duration for play events
          break;
        case 'draw':
          toastTitle = `${newestEntry.player || 'Someone'} Drew`;
          // message might contain count, keep it
          break;
        case 'skip':
          toastTitle = `${newestEntry.player || 'Someone'} Skipped`;
          // message explains who was skipped
          break;
        case 'reverse':
          toastTitle = `Direction Reversed`;
          // message is generic
          break;
        case 'uno':
          toastTitle = `${newestEntry.player || 'Someone'} Declared UNO!`;
          // message confirms
          break;
        case 'uno_fail':
          toastTitle = `UNO! Missed`;
          toastDescription = `${newestEntry.player || 'Someone'} forgot to declare UNO!`;
          toastVariant = "destructive";
          break;
        case 'win':
          toastTitle = `Game Over!`;
          const gameDuration = getGameDuration();
          toastDescription = `${newestEntry.player || 'Winner'} has won the game in ${gameDuration}!`;
          duration = 5000;
          break;
        case 'join':
          toastTitle = `Player Joined`;
          toastDescription = `${newestEntry.player || 'Someone'} joined the room.`;
           duration = 1500;
          break;
         case 'leave':
          toastTitle = `Player Left`;
          toastDescription = `${newestEntry.player || 'Someone'} left the room.`;
          duration = 1500;
          break;
        case 'system': // Explicitly handle system messages
          console.log("[GameProvider Toast] Matched 'system' event type.");
          toastTitle = `${newestEntry.player || 'System'} Message`; // Maybe give it a specific title
          // Use default description (the message itself)
          toastVariant = "default"; // Ensure it's default
          duration = 2500; // Slightly longer?
          break;
        default:
          console.log(`[GameProvider Toast] Matched '${newestEntry.eventType || 'default'}' event type.`);
          // Use default title and message
          break;
      }
      
      console.log(`[GameProvider Toast] Calling toast() with:`, { title: toastTitle, description: toastDescription, variant: toastVariant, duration });
      toast(toastTitle, {
        description: toastDescription,
        duration: duration,
      });
    });
    
    // Update the ref with the full current log
    previousLogRef.current = currentLog
  }, [state.log, getGameDuration])

  useEffect(() => {
    console.log("[GameProvider] Initial player ID:", currentPlayerId)
  }, [currentPlayerId])

  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage()
      console.log("[GameProvider] Storage event detected, player ID:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    window.addEventListener("storage", handleStorageChange)
    
    const storedPlayerId = getPlayerIdFromLocalStorage()
    if (storedPlayerId !== currentPlayerId) {
      console.log("[GameProvider] Updated player ID on mount:", storedPlayerId)
      setCurrentPlayerId(storedPlayerId)
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerId]) // Acknowledging review of dependencies for this specific storage listener

  // Define refreshGameState with useCallback before useEffect hooks that use it
  const refreshGameState = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("[GameProvider] Manually refreshing game state for room:", roomId)
      const gameState = await getRoom(roomId)
      if (gameState) {
        updateGameState(gameState)
      } else {
        console.error("[GameProvider] Failed to refresh: Room not found or error fetching state.")
        setError("Room not found or invalid state")
      }
    } catch (err) {
      console.error("[GameProvider] Error refreshing game state:", err)
      setError(err instanceof Error ? err.message : "Failed to refresh game state")
    } finally {
      setIsLoading(false)
    }
  }, [roomId, updateGameState])

  useEffect(() => {
    if (currentPlayerId && state.players) {
      const playerInGame = state.players.find(p => p.id === currentPlayerId)
      console.log("[GameProvider] Current player ID:", currentPlayerId)
      console.log("[GameProvider] Current player in game:", playerInGame)
      console.log("[GameProvider] Players in room:", state.players)
      console.log("[GameProvider] Is host:", playerInGame?.isHost)
      console.log("[GameProvider] Total players:", state.players.length)
    } else {
      console.warn("[GameProvider] No player ID available or no players loaded")
    }
  }, [currentPlayerId, state.players])

  useEffect(() => {
    let channel: Channel | null = null
    let pusher: Pusher | null = null
    let playerChannel: Channel | null = null
    
    const setupPusher = () => {
      if (!roomId) {
        console.warn("[GameProvider] No room ID provided, can't subscribe to Pusher")
        return
      }

      try {
        if (pusherClient) {
          console.log(`[GameProvider] Using existing Pusher client to subscribe to game-${roomId}`)
          channel = pusherClient.subscribe(`game-${roomId}`)
        } else {
          console.log(`[GameProvider] Creating new Pusher instance to subscribe to game-${roomId}`)
          pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            forceTLS: true
          })
          channel = pusher.subscribe(`game-${roomId}`)
        }
        
        if (!channel) {
          throw new Error("Failed to create Pusher channel")
        }
        
        channel.bind("game-updated", (data: GameState) => {
          console.log("[GameProvider] Received game-updated event:", data?.players?.length, "players")
          setDrawnCardPlayable(null)
          if (data && typeof data === 'object' && data.roomId) {
            updateGameState(data)
          } else {
            console.error("[GameProvider] Invalid data received from game-updated event:", data)
            // Call the memoized refreshGameState directly
            refreshGameState()
          }
        })
        
        channel.bind("drawn-card-playable", (data: { playerId: string, card: Card }) => {
          console.log("[GameProvider] Received drawn-card-playable event for player:", data.playerId)
          if (data.playerId === currentPlayerId) {
            setDrawnCardPlayable(data.card)
          }
        })
        
        channel.bind("room-deleted", (data: { message: string }) => {
          console.log("[GameProvider] Received room-deleted event:", data.message)
          toast.error("Room Deleted", {
            description: data.message,
          })
        })
        
        // Subscribe to player-specific events if we have a player ID
        if (currentPlayerId) {
          console.log(`[GameProvider] Attempting private subscription for player ID: ${currentPlayerId}`);
          const channelName = `private-player-${currentPlayerId}`;
          console.log(`[GameProvider] Subscribing to private channel: ${channelName}`)
          
          if (pusherClient) {
            playerChannel = pusherClient.subscribe(channelName)
          } else if (pusher) {
            playerChannel = pusher.subscribe(channelName)
          }
          
          if (playerChannel) {
            console.log(`[GameProvider] playerChannel object obtained for ${channelName}`);
            // Debug binding to check if channel is connected properly
            playerChannel.bind("pusher:subscription_succeeded", () => {
              console.log(`[GameProvider] Successfully subscribed to private channel for player ${currentPlayerId}`)
            })
            
            playerChannel.bind("pusher:subscription_error", (error: unknown) => {
              console.error(`[GameProvider] Failed to subscribe to private channel:`, error)
            })
            
            playerChannel.bind("player-ringed", (data: RingNotificationData) => {
              console.log("[GameProvider] Received ring notification from:", data.from.name)
              
              // Show a prominent toast notification
              toast("Ring! Ring!", {
                description: `${data.from.name} is trying to get your attention!`,
                duration: 5000,
              })
              
              // Play sound using the pre-loaded audio element
              const playSound = () => {
                if (notificationSoundRef.current) {
                  // Reset the audio to the beginning
                  notificationSoundRef.current.currentTime = 0
                  
                  const playPromise = notificationSoundRef.current.play()
                  
                  if (playPromise !== undefined) {
                    playPromise
                      .then(() => {
                        console.log("[GameProvider] Notification sound played successfully")
                      })
                      .catch(err => {
                        console.error("[GameProvider] Audio play error:", err)
                        
                        // On error, try the user interaction approach
                        const handlePlayOnInteraction = () => {
                          if (notificationSoundRef.current) {
                            notificationSoundRef.current.play()
                              .then(() => {
                                // Clean up only on success
                                document.removeEventListener("click", handlePlayOnInteraction)
                                document.removeEventListener("keydown", handlePlayOnInteraction)
                                document.removeEventListener("touchstart", handlePlayOnInteraction)
                              })
                              .catch(innerErr => {
                                console.error("[GameProvider] Retry play failed:", innerErr)
                              })
                          }
                        }
                        
                        // Add user interaction listeners
                        document.addEventListener("click", handlePlayOnInteraction, { once: false })
                        document.addEventListener("keydown", handlePlayOnInteraction, { once: false })
                        document.addEventListener("touchstart", handlePlayOnInteraction, { once: false })
                        
                        // Cleanup after 15 seconds if still not played
                        setTimeout(() => {
                          document.removeEventListener("click", handlePlayOnInteraction)
                          document.removeEventListener("keydown", handlePlayOnInteraction)
                          document.removeEventListener("touchstart", handlePlayOnInteraction)
                        }, 15000)
                      })
                  }
                } else {
                  console.error("[GameProvider] No audio element available for notification")
                  
                  // Fallback to creating a new audio element if ref is somehow null
                  try {
                    const fallbackAudio = new Audio("/sounds/notification.wav")
                    fallbackAudio.volume = 0.8
                    fallbackAudio.play().catch(err => console.error("[GameProvider] Fallback audio play failed:", err))
                  } catch (err) {
                    console.error("[GameProvider] Could not create fallback audio:", err)
                  }
                }
              }
              
              // Try to play sound immediately
              playSound()
            })
          }
        }
        
        console.log(`[GameProvider] Successfully subscribed to game-${roomId}`)
      } catch (error) {
        console.error("[GameProvider] Error setting up Pusher:", error)
        setError("Failed to connect to game server. Please refresh the page.")
      }
    }

    setupPusher()
    
    return () => {
      if (channel) {
        console.log(`[GameProvider] Cleaning up Pusher subscription for game-${roomId}`)
        channel.unbind_all()
      }
      
      if (playerChannel) {
        console.log(`[GameProvider] Cleaning up private player channel subscription`)
        playerChannel.unbind_all()
        
        if (pusherClient && currentPlayerId) {
          pusherClient.unsubscribe(`private-player-${currentPlayerId}`)
        } else if (pusher && currentPlayerId) {
          pusher.unsubscribe(`private-player-${currentPlayerId}`)
        }
      }
      
      if (pusherClient && roomId) {
        pusherClient.unsubscribe(`game-${roomId}`)
      } else if (pusher && roomId) {
        pusher.unsubscribe(`game-${roomId}`)
        pusher.disconnect()
      }
    }
  }, [roomId, currentPlayerId, updateGameState, refreshGameState])

  useEffect(() => {
    if (state.status !== "playing") return
    const interval = setInterval(() => {
      refreshGameState()
    }, 1500)
    return () => clearInterval(interval)
  }, [state.status, roomId, refreshGameState])

  useEffect(() => {
    if (state.status !== "playing") return
    
    const refreshTimeout = setTimeout(() => {
      refreshGameState()
    }, 300)
    
    return () => clearTimeout(refreshTimeout)
  }, [state.status, refreshGameState, state.discardPile.length, state.currentColor])

  useEffect(() => {
    // Use game start time from game state instead of local state
    if (state.status === "playing" && state.gameStartTime) {
      console.log("[GameProvider] Setting game start time from state:", state.gameStartTime)
      setGameStartTime(state.gameStartTime)
    }
  }, [state.status, state.gameStartTime])
  
  const hasPlayableCard = (): boolean => {
    if (!currentPlayerId || currentPlayerId !== state.currentPlayer) return false
    
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer) return false
    
    return currentPlayer.cards.some(card => checkPlayValidityLogic(state, card))
  }

  const handlePlayCard = async (cardId: string, selectedColor?: CardColor) => {
    setIsLoading(true)
    setError(null)

    const player = state.players.find(p => p.id === currentPlayerId)
    if (!player) {
      setError("Player not found.")
      setIsLoading(false)
      return
    }

    // --- UNO Declaration Check ---    
    if (player.cards.length === 2 && !player.saidUno) {
        console.log(`${player.name} attempted to play second-to-last card without declaring UNO. Passing turn.`);
        toast.error("UNO!", { 
            description: "You must declare UNO before playing your second-to-last card! Turn passed.",
            duration: 3000 
        });
        // Automatically pass the turn instead of playing the card
        await handlePassTurn(true); // Pass turn forcefully
        setIsLoading(false); // Ensure loading state is reset
        return; // Stop the play card execution
    }
    // --- End UNO Declaration Check ---

    try {
      console.log("[handlePlayCard] Attempting to play card:", { cardId, selectedColor, currentPlayerId, state_currentColor: state.currentColor, turn: state.currentPlayer })
      if (state.currentPlayer !== currentPlayerId) {
        console.warn("[GameProvider] Attempted action when not current player's turn.")
        toast.error("Not Your Turn", { description: "Please wait for your turn." })
        setIsLoading(false)
        return
      }
      const card = player?.cards.find(c => c.id === cardId)
      if (!card) throw new Error("Card not in hand (client check)")
      if (!checkPlayValidityLogic(state, card)) {
        throw new Error("Invalid play (client check)")
      }
      if ((card.type === "wild" || card.type === "wild4") && !selectedColor) {
        setPendingWildCardId(cardId)
        setIsColorSelectionOpen(true)
        setIsLoading(false)
        return
      }
      // Optimistic update for non-wild cards
      if (card.type !== "wild" && card.type !== "wild4") {
        const updatedPlayers = state.players.map(p =>
          p.id === currentPlayerId
            ? { ...p, cards: p.cards.filter(c => c.id !== cardId) }
            : p
        )
        const updatedDiscardPile = [...state.discardPile, card]
        const updatedColor = card.color
        dispatch({
          type: "UPDATE_GAME_STATE",
          payload: {
            ...state,
            players: updatedPlayers,
            discardPile: updatedDiscardPile,
            currentColor: updatedColor,
          },
        })
      }
      await playCard(roomId, currentPlayerId, cardId, selectedColor)
      setPendingWildCardId(null)
      setIsColorSelectionOpen(false)
    } catch (err) {
      console.error("Failed to play card:", err)
      setError(err instanceof Error ? err.message : "Failed to play card")
      toast.error("Invalid Play", { description: err instanceof Error ? err.message : "Could not play card." })
      await refreshGameState()
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrawCard = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: No player ID")
      return
    }
    
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: Not your turn")
      toast.error("Cannot Draw Card", {
        description: "It's not your turn",
      })
      return
    }
    
    if (state.hasDrawnThisTurn) {
      console.error("[GameProvider] Cannot draw card: Already drawn this turn")
      toast.error("Cannot Draw Card", {
        description: "You've already drawn a card this turn",
      })
      return
    }
    
    try {
      setIsLoading(true)
      await drawCard(roomId, currentPlayerId)
      
      toast("Card Drawn", {
        description: "You drew a card from the pile",
      })
      
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to draw card:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to draw card",
      })
      setIsLoading(false)
    }
  }

  const handleDeclareUno = async () => {
    if (!roomId || !currentPlayerId) return setError("Missing Room/Player ID")
    if (state.currentPlayer !== currentPlayerId) {
      toast("Not Your Turn", { description: "You can only declare UNO on your turn." });
      return;
    }
    
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || player.cards.length !== 2) {
        toast("Invalid Action", { description: "You can only declare UNO when you have exactly two cards." });
        return;
    }

    // Optimistic UI update for smoother UX
    dispatch({ 
        type: "UPDATE_GAME_STATE", 
        payload: {
            ...state,
            players: state.players.map(p => 
                p.id === currentPlayerId ? { ...p, saidUno: true } : p
            )
        }
    });
    toast("UNO Declared!", { 
      description: "Now you can play your second-to-last card!", 
      duration: 1500,
    });

    setIsLoading(true)
    setError(null)
    try {
      await declareUno(roomId, currentPlayerId)
      // State will be updated via Pusher, no need to manually dispatch here after await
    } catch (err) {
      console.error("[handleDeclareUno] Error declaring UNO:", err)
      setError(err instanceof Error ? err.message : "Failed to declare UNO")
      // Revert optimistic update on error
      dispatch({ 
        type: "UPDATE_GAME_STATE", 
        payload: {
            ...state,
            players: state.players.map(p => 
                p.id === currentPlayerId ? { ...p, saidUno: false } : p // Revert the flag
            )
        }
     });
     toast.error("Failed to Declare UNO", { 
       description: err instanceof Error ? err.message : "Please try again.", 
     });
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectWildCardColor = async (color: CardColor) => {
    if (!roomId || !currentPlayerId || !pendingWildCardId || color === 'black') {
      setError("Invalid state or color for selecting wild color.")
      toast.error("Invalid Color", { description: "Please select Red, Blue, Green, or Yellow." })
      return
    }
    console.log(`[GameProvider] Color selected: ${color} for card ${pendingWildCardId}`)
    setIsColorSelectionOpen(false)
    setIsLoading(true)
    try {
      await playCard(roomId, currentPlayerId, pendingWildCardId, color)
      setPendingWildCardId(null)
    } catch (err) {
      console.error("Failed to play wild card after color selection:", err)
      setError(err instanceof Error ? err.message : "Failed to play wild card")
      toast.error("Error Playing Wild Card", { description: err instanceof Error ? err.message : "Could not play the wild card." })
      await refreshGameState()
    } finally {
      setIsLoading(false)
      setPendingWildCardId(null)
    }
  }
  
  const handleCloseColorSelector = () => {
    setIsColorSelectionOpen(false)
    setPendingWildCardId(null)
  }

  const handlePassTurn = async (forcePass: boolean = false) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot pass turn: No player ID")
      return
    }
    
    // Check if the game is in playing status
    if (state.status !== "playing") {
      console.error("[GameProvider] Cannot pass turn: Game is not in progress")
      toast.error("Cannot Pass Turn", {
        description: "Game is not in progress yet",
      })
      return
    }
    
    // Check if it's the player's turn
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot pass turn: Not your turn")
      toast.error("Cannot Pass Turn", {
        description: "It's not your turn",
      })
      return
    }
    
    try {
      setIsLoading(true)
      await passTurn(roomId, currentPlayerId, forcePass)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to pass turn:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to pass turn",
      })
      setIsLoading(false)
    }
  }
  
  const handleStartGame = async () => {
    if (!roomId || !currentPlayerId) {
      console.error("[GameProvider] Cannot start game: Missing Room/Player ID")
      return
    }
    
    // Check if player is host
    const currentPlayer = state.players.find(p => p.id === currentPlayerId)
    if (!currentPlayer?.isHost) {
      console.error("[GameProvider] Cannot start game: Not the host")
      toast.error("Cannot Start Game", {
        description: "Only the host can start the game",
      })
      return
    }
    
    try {
      setIsLoading(true)
      // Set game start time on the server when starting the game
      const currentTime = Date.now()
      setGameStartTime(currentTime)
      await startGameAction(roomId, currentPlayerId!, currentTime)
      // State update will be handled by Pusher
      setIsLoading(false)
    } catch (error) {
      console.error("[GameProvider] Failed to start game:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to start game",
      })
      setIsLoading(false)
    }
  }
  
  const handleResetGame = async (): Promise<void> => {
    if (!roomId) {
      setError("Room ID is missing, cannot reset.")
      return
    }
    setIsResetting(true)
    setError(null)
    console.log(`[GameProvider] Attempting to reset room: ${roomId}`)
    try {
      await resetRoom(roomId)
      console.log(`[GameProvider] Reset action called successfully for room: ${roomId}`)
      toast("Room is resetting...", { duration: 2000 })
    } catch (err) {
      console.error("[GameProvider] Failed to reset game:", err)
      setError(err instanceof Error ? err.message : "Failed to reset room")
      toast.error("Error", { description: "Could not reset the room." })
    } finally {
      setIsResetting(false)
    }
  }

  const handleRematch = async (): Promise<void> => {
    if (!roomId || !currentPlayerId) {
        setError("Missing Room/Player ID for rematch.");
        return;
    }

    // Optional: Check if the current player is the host
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player?.isHost) {
        toast.error("Rematch Failed", { description: "Only the host can start a rematch." });
        setError("Only the host can start a rematch.");
        return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`[GameProvider] Attempting rematch for room: ${roomId} by host: ${currentPlayerId}`);
    try {
        await rematchGame(roomId, currentPlayerId);
        console.log(`[GameProvider] Rematch action called successfully for room: ${roomId}`);
        toast("Starting Rematch!", { duration: 2000 });
        // State updates will come via Pusher
    } catch (err) {
        console.error("[GameProvider] Failed to initiate rematch:", err);
        setError(err instanceof Error ? err.message : "Failed to start rematch");
        toast.error("Error", { description: "Could not start rematch." });
    } finally {
        setIsLoading(false);
    }
  };

  const handleLeaveRoom = (): void => {
    console.log("[GameProvider] Leaving room, navigating to home.")
    router.push("/")
  }

  const increaseCardSize = () => {
    setCardScale(prev => Math.min(prev + 10, 150)) // Increase by 10%, max 150%
  }

  const decreaseCardSize = () => {
    setCardScale(prev => Math.max(prev - 10, 70)) // Decrease by 10%, min 70%
  }

  const handleSendGameMessage = async (message: string): Promise<void> => {
    if (!roomId || !currentPlayerId) return
    
    try {
      const player = state.players.find(p => p.id === currentPlayerId)
      if (!player) return
      
      // Send to server with better error handling
      const response = await fetch(`/api/game/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          playerId: currentPlayerId,
          message
        }),
      })
      
      // Handle both network errors and API errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[GameProvider] Message API error:", response.status, errorData)
        throw new Error(errorData.error || `Failed to send message: ${response.status}`)
      } else {
        // Success! Trigger toast for the sender immediately.
        console.log("[GameProvider] Message sent successfully via API. Triggering sender toast.");
        toast(`${player.name || 'You'} said:`, {
          description: message,
          duration: 3000 
        });
      }
    } catch (err) {
      console.error("[GameProvider] Error sending message:", err)
      
      // Show a clear error to the user
      toast.error("Message Failed", {
        description: err instanceof Error ? err.message : "Could not send message, please try again",
      })
    }
  }
  
  const handleRingOpponent = async (opponentId: string): Promise<void> => {
    if (!roomId || !currentPlayerId) return
    
    try {
      const player = state.players.find(p => p.id === currentPlayerId)
      if (!player) return
      
      // Send notification through server
      const response = await fetch(`/api/game/ring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          fromPlayerId: currentPlayerId, 
          toPlayerId: opponentId
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to ring opponent")
      }
      
      toast("Ring Sent", {
        description: "Notification sent to player",
        duration: 1500,
      })
    } catch (err) {
      console.error("[GameProvider] Error ringing opponent:", err)
      toast.error("Ring Failed", {
        description: "Could not send notification",
      })
    }
  }

  const contextValue: GameContextType = {
    state,
    playCard: handlePlayCard,
    drawCard: handleDrawCard,
    declareUno: handleDeclareUno,
    currentPlayerId,
    refreshGameState,
    selectWildCardColor: handleSelectWildCardColor,
    isColorSelectionOpen,
    pendingWildCardId,
    closeColorSelector: handleCloseColorSelector,
    passTurn: handlePassTurn,
    hasPlayableCard,
    drawnCardPlayable,
    roomId,
    isLoading: isLoading || isResetting,
    error,
    startGame: handleStartGame,
    resetGame: handleResetGame,
    rematch: handleRematch,
    leaveRoom: handleLeaveRoom,
    promptColorSelection: (cardId: string) => {
      if (!state || state.currentPlayer !== currentPlayerId) {
        console.warn("Attempted to prompt color selection when not current player or state unavailable.")
        return
      }
      console.log('Prompting color selection for card:', cardId)
      setPendingWildCardId(cardId)
      setIsColorSelectionOpen(true)
    },
    cardScale,
    increaseCardSize,
    decreaseCardSize,
    sendGameMessage: handleSendGameMessage,
    ringOpponent: handleRingOpponent,
    gameStartTime,
    getGameDuration
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
