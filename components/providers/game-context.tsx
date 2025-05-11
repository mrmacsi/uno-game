"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { createContext, useContext, useReducer, useState, type ReactNode, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import type { GameState, GameAction, Card, CardColor } from "@/lib/types";
import { playCard, drawCard, declareUno, passTurn, startGame as startGameAction, rematchGame } from "@/lib/game-actions";
import { getRoom, resetRoom } from "@/lib/room-actions";
import { getPlayerIdFromLocalStorage } from "@/lib/client-utils";
import { checkPlayValidity } from '@/lib/game-logic';
import { toast } from "sonner";
import { useAutoPlay, useAutoPlayLogic } from "@/hooks/use-auto-play";
import { useGamePusher } from "@/hooks/use-game-pusher";
import { useGameLogs } from "@/hooks/use-game-logs";
import { useGameEffects } from "@/hooks/use-game-effects";

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
  const [drawnCardPlayable, setDrawnCardPlayable] = useState<Card | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

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

  const refreshGameState = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const gameState = await getRoom(roomId);
      if (gameState) {
        updateGameState(gameState);
      } else {
        setError("Room not found or invalid state");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh game state");
    } finally {
      setIsLoading(false);
    }
  }, [roomId, updateGameState]);

  // Custom hooks
  const { isAutoPlayActive, toggleAutoPlay } = useAutoPlay();
  
  useGamePusher({
    roomId,
    currentPlayerId,
    state,
    updateGameState,
    refreshGameState,
    setDrawnCardPlayable,
    notificationSoundRef
  });
  
  useGameLogs({ 
    state,
    getGameDuration
  });
  
  useGameEffects({
    currentPlayerId,
    setCurrentPlayerId,
    state,
    refreshGameState,
    setGameStartTime,
    notificationSoundRef
  });
  
  useAutoPlayLogic({
    isAutoPlayActive,
    currentPlayerId,
    state
  });

  const hasPlayableCard = (): boolean => {
    if (!currentPlayerId || currentPlayerId !== state.currentPlayer) return false;
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return false;
    return currentPlayer.cards.some(card => checkPlayValidity(state, card));
  };

  const handlePlayCard = async (cardId: string, selectedColor?: CardColor) => {
    if (!state || !currentPlayerId) return;
    if (isProcessingPlay) {
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
      if (state.currentPlayer !== currentPlayerId) {
        toast.error("Not Your Turn", { description: "Please wait for your turn." });
        setIsProcessingPlay(false);
        return;
      }
      const card = player.cards.find(c => c.id === cardId);
      if (!card) {
        setIsProcessingPlay(false);
        throw new Error("Card not in hand (client check)");
      }
      if (!checkPlayValidity(state, card)) {
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
      return;
    }
    if (state.currentPlayer !== currentPlayerId) {
      toast.error("Cannot Draw Card", {
        description: "It's not your turn",
      });
      return;
    }
    if (state.hasDrawnThisTurn) {
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
  } catch (error) {
    const errorMessage = error instanceof Error && error.message.includes("Invalid Action")
      ? error.message
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
      toast.error("Action Failed", { description: "Player data not found." });
      return;
    }
    const cardToPlay = player.cards.find(c => c.id === pendingWildCardId);
    if (!cardToPlay) {
      toast.error("Action Failed", { description: "Card not found. Please try again." });
      await refreshGameState();
      return;
    }
    setIsColorSelectionOpen(false);
    setIsLoading(true);
    try {
      await playCard(roomId, currentPlayerId, cardToPlay, color);
      setPendingWildCardId(null);
    } catch (error) {
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
      return;
    }
    if (state.status !== "playing") {
      toast.error("Cannot Pass Turn", {
        description: "Game is not in progress yet",
      });
      return;
    }
    if (state.currentPlayer !== currentPlayerId) {
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
      return;
    }
    const currentPlayer = state.players.find(p => p.id === currentPlayerId);
    if (!currentPlayer?.isHost) {
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
    try {
      await resetRoom(roomId);
      toast("Room is resetting...", { duration: 2000 });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reset room");
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
    try {
      await rematchGame(roomId, currentPlayerId);
      toast("Starting Rematch!", { duration: 2000 });
      
      if (roomId === "DEFAULT") {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to start rematch");
      toast.error("Action Failed", { description: "Could not start rematch. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = (): void => {
    router.push("/");
  };

  const increaseCardSize = () => {
    setCardScale(prev => Math.min(prev + 10, 150));
  };

  const decreaseCardSize = () => {
    setCardScale(prev => Math.max(prev - 10, 70)) 
  }

  const handleSendGameMessage = async (message: string): Promise<void> => {
    if (!roomId || !currentPlayerId) return
    
    try {
      const player = state.players.find(p => p.id === currentPlayerId)
      if (!player) return
      
      const response = await fetch(`/api/game/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          playerId: currentPlayerId,
          message
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to send message: ${response.status}`)
      } else {
        toast(`${player.name || 'You'} said:`, {
          description: message,
          duration: 3000 
        });
      }
    } catch (error) {
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
    } catch (error) {
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
        return
      }
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