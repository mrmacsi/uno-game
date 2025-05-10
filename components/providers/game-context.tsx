"use client";

import React, { createContext, useContext, useEffect, useReducer, useState, type ReactNode, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import pusherClient from "@/lib/pusher-client";
import type { GameState, GameAction, Card, CardColor, LogEntry } from "@/lib/types";
import { playCard, drawCard, declareUno, passTurn, startGame as startGameAction, rematchGame } from "@/lib/game-actions";
import { getRoom, resetRoom } from "@/lib/room-actions";
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils";
import type { Channel } from "pusher-js";
import Pusher from 'pusher-js';
import { checkPlayValidity as checkPlayValidityLogic, getBotPlay } from '@/lib/game-logic';
import { executeAutomatedTurnAction } from '@/lib/auto-play-utils';
import { toast } from "sonner";

type GameContextType = {
  state: GameState;
  playCard: (cardId: string, selectedColor?: CardColor) => Promise<void>;
  drawCard: () => Promise<void>;
  declareUno: () => Promise<void>;
  currentPlayerId: string | null;
  refreshGameState: () => Promise<void>;
  selectWildCardColor: (color: CardColor) => Promise<void>;
  isColorSelectionOpen: boolean;
  pendingWildCardId: string | null;
  closeColorSelector: () => void;
  passTurn: (forcePass?: boolean) => Promise<void>;
  hasPlayableCard: () => boolean;
  drawnCardPlayable: Card | null;
  roomId: string | null;
  isLoading: boolean;
  error: string | null;
  startGame: () => Promise<void>;
  resetGame: () => Promise<void>;
  rematch: () => Promise<void>;
  leaveRoom: () => void;
  promptColorSelection: (cardId: string) => void;
  cardScale: number;
  increaseCardSize: () => void;
  decreaseCardSize: () => void;
  sendGameMessage: (message: string) => Promise<void>;
  ringOpponent: (playerId: string) => Promise<void>;
  gameStartTime: number | null;
  getGameDuration: () => string;
  isProcessingPlay: boolean;
  isAutoPlayActive: boolean;
  toggleAutoPlay: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "UPDATE_GAME_STATE":
      return { ...action.payload };
    default:
      return state;
  }
}

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
  children: ReactNode;
  initialState: GameState;
  roomId: string;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(
    typeof window !== "undefined" ? getPlayerIdFromLocalStorage() : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPlay, setIsProcessingPlay] = useState(false);
  const [isColorSelectionOpen, setIsColorSelectionOpen] = useState(false);
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  const [cardScale, setCardScale] = useState(100);
  const previousLogRef = useRef<LogEntry[]>([]);
  const shownToastIds = useRef(new Set<string>());
  const [drawnCardPlayable, setDrawnCardPlayable] = useState<Card | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Auto play state with localStorage persistence
  const [isAutoPlayActive, setIsAutoPlayActive] = useState(() => {
    if (typeof window !== "undefined") {
      const savedAutoPlay = localStorage.getItem("uno_autoplay_enabled");
      return savedAutoPlay === "true";
    }
    return false;
  });

  // Function to toggle Auto Play mode
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlayActive(prev => {
      const newState = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("uno_autoplay_enabled", newState.toString());
      }
      toast.info(`Auto Play ${newState ? 'Enabled' : 'Disabled'}`);
      return newState;
    });
  }, []);

  // Auto play effect - when it's the player's turn and auto play is active
  useEffect(() => {
    if (!isAutoPlayActive || !currentPlayerId || !state.currentPlayer) return;
    
    const isMyTurn = state.currentPlayer === currentPlayerId;
    if (!isMyTurn || state.status !== "playing") return;
    
    const currentPlayerDetails = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayerDetails || currentPlayerDetails.isBot) return;
    
    // Add a slight delay to make it feel more natural
    const autoPlayTimeout = setTimeout(async () => {
      try {
        console.log("Auto Play: Executing automated turn for human player");
        const botPlayResult = getBotPlay(state as GameState, currentPlayerId);
        await executeAutomatedTurnAction(state, currentPlayerId, botPlayResult);
      } catch (error) {
        console.error("Auto Play: Error during automated turn", error);
      }
    }, 800);
    
    return () => clearTimeout(autoPlayTimeout);
  }, [isAutoPlayActive, currentPlayerId, state.currentPlayer, state.status, state]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio();
        audio.src = "/sounds/notification.wav";
        audio.preload = "auto";
        audio.volume = 0.8;
        notificationSoundRef.current = audio;
        audio.load();
        console.log("[GameProvider] Preloaded notification sound");
        return () => {
          if (notificationSoundRef.current) {
            notificationSoundRef.current.src = "";
            notificationSoundRef.current = null;
          }
        };
      } catch (err) {
        console.error("[GameProvider] Error preloading sound:", err);
      }
    }
  }, []);

  const getGameDuration = useCallback((): string => {
    if (state.status === "playing" && state.gameStartTime) {
      const durationMs = Date.now() - state.gameStartTime;
      const safeDurationMs = Math.max(0, durationMs);
      const totalSeconds = Math.floor(safeDurationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    if (state.log && state.log.length > 0) {
      const firstLogEntry = state.log[0];
      const lastLogEntry = state.log[state.log.length - 1];
      if (firstLogEntry.timestamp && lastLogEntry.timestamp && lastLogEntry.timestamp >= firstLogEntry.timestamp) {
        const durationMs = lastLogEntry.timestamp - firstLogEntry.timestamp;
        const totalSeconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      } else {
        console.warn("[getGameDuration] Invalid log timestamps. Proceeding to fallback.");
      }
    }
    const fallbackStartTime = state.gameStartTime || gameStartTime;
    if (fallbackStartTime) {
      const durationMs = Date.now() - fallbackStartTime;
      const safeDurationMs = Math.max(0, durationMs);
      const totalSeconds = Math.floor(safeDurationMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return "00:00";
  }, [state.status, state.gameStartTime, state.log, gameStartTime]);

  const updateGameState = useCallback((newGameState: GameState) => {
    try {
      dispatch({ type: "UPDATE_GAME_STATE", payload: newGameState });
      setError(null);
    } catch (err) {
      console.error("[GameProvider] Error updating game state:", err);
      setError(err instanceof Error ? err.message : "Error updating game state");
    }
  }, []);

  useEffect(() => {
    if (!state.log) {
      previousLogRef.current = [];
      return;
    }
    const prevLog = previousLogRef.current;
    const currentLog = state.log;
    const newEntries = currentLog.slice(prevLog.length);

    newEntries.forEach(newestEntry => {
      if (shownToastIds.current.has(newestEntry.id) || (Date.now() - newestEntry.timestamp > 5000)) {
        console.log(`[GameProvider Toast] Skipping log entry: ${newestEntry.id} (already shown or too old)`);
        return;
      }
      shownToastIds.current.add(newestEntry.id);
      console.log(`[GameProvider Toast] Processing new log entry:`, newestEntry);

      let toastTitle = "Game Update";
      let toastDescription = newestEntry.message;
      let toastVariant: "default" | "destructive" = "default";
      let duration = 2000;

      switch (newestEntry.eventType) {
        case 'play': return;
        case 'draw': return;
        case 'message': return;
        case 'skip':
          toastTitle = `${newestEntry.player || 'Someone'} Skipped`;
          break;
        case 'reverse':
          toastTitle = `Direction Reversed`;
          break;
        case 'uno':
          toastTitle = `${newestEntry.player || 'Someone'} Declared UNO!`;
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
        case 'system':
          console.log("[GameProvider Toast] Matched 'system' event type.");
          toastTitle = `${newestEntry.player || 'System'} Message`;
          toastVariant = "default";
          duration = 2500;
          break;
        default:
          console.log(`[GameProvider Toast] Matched '${newestEntry.eventType || 'default'}' event type.`);
          break;
      }
      console.log(`[GameProvider Toast] Calling toast() with:`, { title: toastTitle, description: toastDescription, variant: toastVariant, duration });
      toast(toastTitle, {
        description: toastDescription,
        duration: duration,
      });
    });
    previousLogRef.current = currentLog;
  }, [state.log, getGameDuration]);

  useEffect(() => {
    console.log("[GameProvider] Initial player ID:", currentPlayerId);
  }, [currentPlayerId]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedPlayerId = getPlayerIdFromLocalStorage();
      console.log("[GameProvider] Storage event detected, player ID:", storedPlayerId);
      setCurrentPlayerId(storedPlayerId);
    };
    window.addEventListener("storage", handleStorageChange);
    const storedPlayerId = getPlayerIdFromLocalStorage();
    if (storedPlayerId !== currentPlayerId) {
      console.log("[GameProvider] Updated player ID on mount:", storedPlayerId);
      setCurrentPlayerId(storedPlayerId);
    }
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [currentPlayerId]);

  const refreshGameState = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("[GameProvider] Manually refreshing game state for room:", roomId);
      const gameState = await getRoom(roomId);
      if (gameState) {
        updateGameState(gameState);
      } else {
        console.error("[GameProvider] Failed to refresh: Room not found or error fetching state.");
        setError("Room not found or invalid state");
      }
    } catch (err) {
      console.error("[GameProvider] Error refreshing game state:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh game state");
    } finally {
      setIsLoading(false);
    }
  }, [roomId, updateGameState]);

  useEffect(() => {
    if (currentPlayerId && state.players) {
      const playerInGame = state.players.find(p => p.id === currentPlayerId);
      console.log("[GameProvider] Current player ID:", currentPlayerId);
      console.log("[GameProvider] Current player in game:", playerInGame);
      console.log("[GameProvider] Players in room:", state.players);
      console.log("[GameProvider] Is host:", playerInGame?.isHost);
      console.log("[GameProvider] Total players:", state.players.length);
    } else {
      console.warn("[GameProvider] No player ID available or no players loaded");
    }
  }, [currentPlayerId, state.players]);

  useEffect(() => {
    let channel: Channel | null = null;
    let pusher: Pusher | null = null;
    let playerChannel: Channel | null = null;

    const setupPusher = () => {
      if (!roomId) {
        console.warn("[GameProvider] No room ID provided, can't subscribe to Pusher");
        return;
      }
      try {
        if (pusherClient) {
          console.log(`[GameProvider] Using existing Pusher client to subscribe to game-${roomId}`);
          channel = pusherClient.subscribe(`game-${roomId}`);
        } else {
          console.log(`[GameProvider] Creating new Pusher instance to subscribe to game-${roomId}`);
          pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            forceTLS: true
          });
          channel = pusher.subscribe(`game-${roomId}`);
        }
        if (!channel) {
          throw new Error("Failed to create Pusher channel");
        }
        channel.bind("game-updated", (data: Omit<GameState, 'log'>) => {
          console.log("[GameProvider] Received game-updated event (log excluded):", data?.players?.length, "players");
          setDrawnCardPlayable(null);
          if (data && typeof data === 'object' && data.roomId) {
            const currentState = state;
            const mergedPayload: GameState = {
              ...currentState,
              ...data,
              drawPileCount: data.drawPileCount ?? currentState.drawPileCount,
            };
            dispatch({ type: "UPDATE_GAME_STATE", payload: mergedPayload });
          } else {
            console.error("[GameProvider] Invalid data received from game-updated event:", data);
            refreshGameState();
          }
        });
        channel.bind("drawn-card-playable", (data: { playerId: string, card: Card }) => {
          console.log("[GameProvider] Received drawn-card-playable event for player:", data.playerId);
          if (data.playerId === currentPlayerId) {
            setDrawnCardPlayable(data.card);
          }
        });
        channel.bind("room-deleted", (data: { message: string }) => {
          console.log("[GameProvider] Received room-deleted event:", data.message);
          toast.error("Room Deleted", {
            description: data.message,
          });
        });
        if (currentPlayerId) {
          console.log(`[GameProvider] Attempting private subscription for player ID: ${currentPlayerId}`);
          const channelName = `private-player-${currentPlayerId}`;
          console.log(`[GameProvider] Subscribing to private channel: ${channelName}`);
          if (pusherClient) {
            playerChannel = pusherClient.subscribe(channelName);
          } else if (pusher) {
            playerChannel = pusher.subscribe(channelName);
          }
          if (playerChannel) {
            console.log(`[GameProvider] playerChannel object obtained for ${channelName}`);
            playerChannel.bind("pusher:subscription_succeeded", () => {
              console.log(`[GameProvider] Successfully subscribed to private channel for player ${currentPlayerId}`);
            });
            playerChannel.bind("pusher:subscription_error", (error: unknown) => {
              console.error(`[GameProvider] Failed to subscribe to private channel:`, error);
            });
            playerChannel.bind("player-ringed", (data: RingNotificationData) => {
              console.log("[GameProvider] Received ring notification from:", data.from.name);
              toast("Ring! Ring!", {
                description: `${data.from.name} is trying to get your attention!`,
                duration: 5000,
              });
              const playSound = () => {
                if (notificationSoundRef.current) {
                  notificationSoundRef.current.currentTime = 0;
                  const playPromise = notificationSoundRef.current.play();
                  if (playPromise !== undefined) {
                    playPromise
                      .then(() => {
                        console.log("[GameProvider] Notification sound played successfully");
                      })
                      .catch(err => {
                        console.error("[GameProvider] Audio play error:", err);
                        const handlePlayOnInteraction = () => {
                          if (notificationSoundRef.current) {
                            notificationSoundRef.current.play()
                              .then(() => {
                                document.removeEventListener("click", handlePlayOnInteraction);
                                document.removeEventListener("keydown", handlePlayOnInteraction);
                                document.removeEventListener("touchstart", handlePlayOnInteraction);
                              })
                              .catch(innerErr => {
                                console.error("[GameProvider] Retry play failed:", innerErr);
                              });
                          }
                        };
                        document.addEventListener("click", handlePlayOnInteraction, { once: false });
                        document.addEventListener("keydown", handlePlayOnInteraction, { once: false });
                        document.addEventListener("touchstart", handlePlayOnInteraction, { once: false });
                        setTimeout(() => {
                          document.removeEventListener("click", handlePlayOnInteraction);
                          document.removeEventListener("keydown", handlePlayOnInteraction);
                          document.removeEventListener("touchstart", handlePlayOnInteraction);
                        }, 15000);
                      });
                  }
                } else {
                  console.error("[GameProvider] No audio element available for notification");
                  try {
                    const fallbackAudio = new Audio("/sounds/notification.wav");
                    fallbackAudio.volume = 0.8;
                    fallbackAudio.play().catch(err => console.error("[GameProvider] Fallback audio play failed:", err));
                  } catch (err) {
                    console.error("[GameProvider] Could not create fallback audio:", err);
                  }
                }
              };
              playSound();
            });
          }
        }
        channel.bind("new-log-entries", (data: { logs: LogEntry[] }) => {
          if (data && Array.isArray(data.logs) && data.logs.length > 0) {
            console.log(`[GameProvider] Received ${data.logs.length} new log entries via Pusher. Triggering state refresh.`);
            refreshGameState();
          } else {
            console.warn("[GameProvider] Received empty or invalid 'new-log-entries' event:", data);
          }
        });
        console.log(`[GameProvider] Successfully subscribed to game-${roomId}`);
      } catch (error) {
        console.error("[GameProvider] Error setting up Pusher:", error);
        setError("Failed to connect to game server. Please refresh the page.");
      }
    };
    setupPusher();
    return () => {
      if (channel) {
        console.log(`[GameProvider] Cleaning up Pusher subscription for game-${roomId}`);
        channel.unbind_all();
      }
      if (playerChannel) {
        console.log(`[GameProvider] Cleaning up private player channel subscription`);
        playerChannel.unbind_all();
        if (pusherClient && currentPlayerId) {
          pusherClient.unsubscribe(`private-player-${currentPlayerId}`);
        } else if (pusher && currentPlayerId) {
          pusher.unsubscribe(`private-player-${currentPlayerId}`);
        }
      }
      if (pusherClient && roomId) {
        pusherClient.unsubscribe(`game-${roomId}`);
      } else if (pusher && roomId) {
        pusher.unsubscribe(`game-${roomId}`);
        pusher.disconnect();
      }
    };
  }, [roomId, currentPlayerId, updateGameState, refreshGameState, state]);

  useEffect(() => {
    if (state.status !== "playing") return;
    const interval = setInterval(() => {
      refreshGameState();
    }, 1500);
    return () => clearInterval(interval);
  }, [state.status, roomId, refreshGameState]);

  useEffect(() => {
    if (state.status !== "playing") return;
    const refreshTimeout = setTimeout(() => {
      refreshGameState();
    }, 300);
    return () => clearTimeout(refreshTimeout);
  }, [state.status, refreshGameState, state.discardPile.length, state.currentColor]);

  useEffect(() => {
    if (state.status === "playing" && state.gameStartTime) {
      console.log("[GameProvider] Setting game start time from state:", state.gameStartTime);
      setGameStartTime(state.gameStartTime);
    }
  }, [state.status, state.gameStartTime]);

  const hasPlayableCard = (): boolean => {
    if (!currentPlayerId || currentPlayerId !== state.currentPlayer) return false;
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return false;
    return currentPlayer.cards.some(card => checkPlayValidityLogic(state, card));
  };

  const handlePlayCard = async (cardId: string, selectedColor?: CardColor) => {
    if (!state || !currentPlayerId) return;
    console.log("Attempting to play card:", { cardId, selectedColor });
    if (isProcessingPlay) {
      console.log("Play blocked: Another play is already in progress.");
      toast.warning("Please wait", { description: "Processing previous action." });
      return;
    }
    setIsProcessingPlay(true);
    setIsLoading(true);
    setError(null);
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) {
      setIsProcessingPlay(false);
      setIsLoading(false);
      return;
    }
    try {
      console.log("[handlePlayCard] Attempting to play card:", { cardId, selectedColor, currentPlayerId, stateCurrentColor: state.currentColor, turn: state.currentPlayer });
      if (state.currentPlayer !== currentPlayerId) {
        console.warn("[GameProvider] Attempted action when not current player's turn.");
        toast.error("Not Your Turn", { description: "Please wait for your turn." });
        setIsProcessingPlay(false);
        return;
      }
      const card = player.cards.find(c => c.id === cardId);
      if (!card) {
        setIsProcessingPlay(false);
        throw new Error("Card not in hand (client check)");
      }
      if (!checkPlayValidityLogic(state, card)) {
        setIsProcessingPlay(false);
        throw new Error("Invalid play (client check)");
      }
      if ((card.type === "wild" || card.type === "wild4") && !selectedColor) {
        setPendingWildCardId(cardId);
        setIsColorSelectionOpen(true);
        setIsProcessingPlay(false);
        return;
      }
      if (card.type !== "wild" && card.type !== "wild4") {
        const updatedPlayers = state.players.map(p =>
          p.id === currentPlayerId
            ? { ...p, cards: p.cards.filter(c => c.id !== cardId) }
            : p
        );
        const updatedDiscardPile = [...state.discardPile, card];
        const updatedColor = card.color;
        dispatch({
          type: "UPDATE_GAME_STATE",
          payload: {
            ...state,
            players: updatedPlayers,
            discardPile: updatedDiscardPile,
            currentColor: updatedColor,
          },
        });
      }
      await playCard(roomId, currentPlayerId, card, selectedColor);
      setPendingWildCardId(null);
      setIsColorSelectionOpen(false);
    } catch (err) {
      console.error("[handlePlayCard] Error playing card:", err);
      const specificErrors = ["Invalid play", "Card not in hand", "Not Your Turn"];
      const errorMessage = err instanceof Error && specificErrors.some(e => err.message.includes(e))
        ? err.message
        : "Could not play card. Please try again.";
      toast.error("Action Failed", { description: errorMessage });
      await refreshGameState();
    } finally {
      setIsLoading(false);
      setIsProcessingPlay(false);
    }
  };

  const handleDrawCard = async () => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: No player ID");
      return;
    }
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot draw card: Not your turn");
      toast.error("Cannot Draw Card", {
        description: "It's not your turn",
      });
      return;
    }
    if (state.hasDrawnThisTurn) {
      console.error("[GameProvider] Cannot draw card: Already drawn this turn");
      toast.error("Cannot Draw Card", {
        description: "You've already drawn a card this turn",
      });
      return;
    }
    try {
      setIsLoading(true);
      await drawCard(roomId, currentPlayerId);
      setIsLoading(false);
    } catch (error) {
      console.error("[GameProvider] Failed to draw card:", error);
      const specificErrors = ["It's not your turn", "Already drawn"];
      const errorMessage = error instanceof Error && specificErrors.some(e => error.message.includes(e))
        ? error.message
        : "Failed to draw card. Please try again.";
      toast.error("Action Failed", { description: errorMessage });
      setIsLoading(false);
    }
  };

  const handleDeclareUno = async () => {
    if (!roomId || !currentPlayerId) return setError("Missing Room/Player ID");
    if (state.currentPlayer !== currentPlayerId) {
      toast("Not Your Turn", { description: "You can only declare UNO on your turn." });
      return;
    }
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player || player.cards.length !== 2) {
      toast("Invalid Action", { description: "You can only declare UNO when you have exactly two cards." });
      return;
    }
    dispatch({
      type: "UPDATE_GAME_STATE",
      payload: {
        ...state,
        players: state.players.map(p =>
          p.id === currentPlayerId ? { ...p, saidUno: true } : p
        )
      }
    });
    setIsLoading(true);
    setError(null);
    try {
      await declareUno(roomId, currentPlayerId);
    } catch (err) {
      console.error("[handleDeclareUno] Error declaring UNO:", err);
      const errorMessage = err instanceof Error && err.message.includes("Invalid Action")
        ? err.message
        : "Failed to declare UNO. Please try again.";
      toast.error("Action Failed", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWildCardColor = async (color: CardColor) => {
    if (!roomId || !currentPlayerId || !pendingWildCardId || color === 'black') {
      setError("Invalid state or color for selecting wild color.");
      toast.error("Invalid Color", { description: "Please select Red, Blue, Green, or Yellow." });
      return;
    }
    const player = state.players.find(p => p.id === currentPlayerId);
    if (!player) {
      console.error("Player not found for wild card color selection");
      toast.error("Action Failed", { description: "Player data not found." });
      return;
    }
    const cardToPlay = player.cards.find(c => c.id === pendingWildCardId);
    if (!cardToPlay) {
      console.error(`Pending wild card with ID ${pendingWildCardId} not found in player's hand.`);
      toast.error("Action Failed", { description: "Card not found. Please try again." });
      await refreshGameState();
      return;
    }
    console.log(`[GameProvider] Color selected: ${color} for card ${pendingWildCardId}`);
    setIsColorSelectionOpen(false);
    setIsLoading(true);
    try {
      await playCard(roomId, currentPlayerId, cardToPlay, color);
      setPendingWildCardId(null);
    } catch (err) {
      console.error("Failed to play wild card after color selection:", err);
      toast.error("Action Failed", { description: "Could not play the wild card. Please try again." });
      await refreshGameState();
    } finally {
      setIsLoading(false);
      setPendingWildCardId(null);
    }
  };

  const handleCloseColorSelector = () => {
    setIsColorSelectionOpen(false);
    setPendingWildCardId(null);
  };

  const handlePassTurn = async (forcePass: boolean = false) => {
    if (!currentPlayerId) {
      console.error("[GameProvider] Cannot pass turn: No player ID");
      return;
    }
    if (state.status !== "playing") {
      console.error("[GameProvider] Cannot pass turn: Game is not in progress");
      toast.error("Cannot Pass Turn", {
        description: "Game is not in progress yet",
      });
      return;
    }
    if (state.currentPlayer !== currentPlayerId) {
      console.error("[GameProvider] Cannot pass turn: Not your turn");
      toast.error("Cannot Pass Turn", {
        description: "It's not your turn",
      });
      return;
    }
    try {
      setIsLoading(true);
      await passTurn(roomId, currentPlayerId, forcePass);
      setIsLoading(false);
    } catch (error) {
      console.error("[GameProvider] Failed to pass turn:", error);
      const specificErrors = ["It's not your turn", "Game is not in progress"];
      const errorMessage = error instanceof Error && specificErrors.some(e => error.message.includes(e))
        ? error.message
        : "Failed to pass turn. Please try again.";
      toast.error("Action Failed", { description: errorMessage });
      setIsLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || !currentPlayerId) {
      console.error("[GameProvider] Cannot start game: Missing Room/Player ID");
      return;
    }
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer?.isHost) {
      console.error("[GameProvider] Cannot start game: Not the host");
      toast.error("Cannot Start Game", {
        description: "Only the host can start the game",
      });
      return;
    }
    try {
      setIsLoading(true);
      const currentTime = Date.now();
      setGameStartTime(currentTime);
      await startGameAction(roomId, currentPlayerId!, currentTime);
      setIsLoading(false);
    } catch (error) {
      console.error("[GameProvider] Failed to start game:", error);
      const errorMessage = error instanceof Error && error.message.includes("Not the host")
        ? error.message
        : "Failed to start game. Please try again.";
      toast.error("Action Failed", { description: errorMessage });
      setIsLoading(false);
    }
  };

  const handleResetGame = async (): Promise<void> => {
    if (!roomId) {
      setError("Room ID is missing, cannot reset.");
      return;
    }
    setIsResetting(true);
    setError(null);
    console.log(`[GameProvider] Attempting to reset room: ${roomId}`);
    try {
      await resetRoom(roomId);
      console.log(`[GameProvider] Reset action called successfully for room: ${roomId}`);
      toast("Room is resetting...", { duration: 2000 });
    } catch (err) {
      console.error("[GameProvider] Failed to reset game:", err);
      setError(err instanceof Error ? err.message : "Failed to reset room");
      toast.error("Action Failed", { description: "Could not reset the room. Please try again." });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRematch = async (): Promise<void> => {
    if (!roomId || !currentPlayerId) {
      setError("Missing Room/Player ID for rematch.");
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log(`[GameProvider] Attempting rematch for room: ${roomId} by host: ${currentPlayerId}`);
    try {
      await rematchGame(roomId, currentPlayerId);
      console.log(`[GameProvider] Rematch action called successfully for room: ${roomId}`);
      toast("Starting Rematch!", { duration: 2000 });
    } catch (err) {
      console.error("[GameProvider] Failed to initiate rematch:", err);
      setError(err instanceof Error ? err.message : "Failed to start rematch");
      toast.error("Action Failed", { description: "Could not start rematch. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = (): void => {
    console.log("[GameProvider] Leaving room, navigating to home.");
    router.push("/");
  };

  const increaseCardSize = () => {
    setCardScale(prev => Math.min(prev + 10, 150));
  };

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
      
      // Show a clear, generic error to the user
      toast.error("Message Failed", {
        description: "Could not send message, please try again",
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
        description: "Could not send notification. Please try again.",
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
    getGameDuration,
    isProcessingPlay,
    isAutoPlayActive,
    toggleAutoPlay
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
