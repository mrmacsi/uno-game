import { useEffect } from 'react';
import pusherClient from "@/lib/pusher-client";
import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';
import type { GameState, Card, LogEntry } from '@/lib/types';
import { toast } from 'sonner';

interface RingNotificationData {
  from: {
    id: string;
    name: string;
    avatarIndex: number;
  };
  timestamp: number;
}

interface NewLogEntriesEvent {
  logs: LogEntry[];
}

interface GamePusherProps {
  roomId: string;
  currentPlayerId: string | null;
  state: GameState;
  updateGameState: (newState: GameState) => void;
  refreshGameState: () => Promise<void>;
  setDrawnCardPlayable: React.Dispatch<React.SetStateAction<Card | null>>;
  notificationSoundRef: React.RefObject<HTMLAudioElement | null>;
}

export function useGamePusher({
  roomId,
  currentPlayerId,
  state,
  updateGameState,
  refreshGameState,
  setDrawnCardPlayable,
  notificationSoundRef
}: GamePusherProps) {
  useEffect(() => {
    let channel: Channel | null = null;
    let pusher: Pusher | null = null;
    let playerChannel: Channel | null = null;

    const setupPusher = () => {
      if (!roomId) return;
      
      try {
        if (pusherClient) {
          channel = pusherClient.subscribe(`game-${roomId}`);
        } else {
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
          setDrawnCardPlayable(null);
          if (data && typeof data === 'object' && data.roomId) {
            const currentState = state;
            const mergedPayload: GameState = {
              ...currentState,
              ...data,
              drawPileCount: data.drawPileCount ?? currentState.drawPileCount,
            };
            updateGameState(mergedPayload);
          } else {
            refreshGameState();
          }
        });
        
        channel.bind("drawn-card-playable", (data: { playerId: string, card: Card }) => {
          if (data.playerId === currentPlayerId) {
            setDrawnCardPlayable(data.card);
          }
        });
        
        channel.bind("room-deleted", (data: { message: string }) => {
          toast.error("Room Deleted", {
            description: data.message,
          });
        });
        
        if (currentPlayerId) {
          const channelName = `private-player-${currentPlayerId}`;
          
          if (pusherClient) {
            playerChannel = pusherClient.subscribe(channelName);
          } else if (pusher) {
            playerChannel = pusher.subscribe(channelName);
          }
          
          if (playerChannel) {
            playerChannel.bind("player-ringed", (data: RingNotificationData) => {
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
                      .catch(err => {
                        const handlePlayOnInteraction = () => {
                          if (notificationSoundRef.current) {
                            notificationSoundRef.current.play()
                              .then(() => {
                                document.removeEventListener("click", handlePlayOnInteraction);
                                document.removeEventListener("keydown", handlePlayOnInteraction);
                                document.removeEventListener("touchstart", handlePlayOnInteraction);
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
                  try {
                    const fallbackAudio = new Audio("/sounds/notification.wav");
                    fallbackAudio.volume = 0.8;
                    fallbackAudio.play();
                  } catch (err) { }
                }
              };
              playSound();
            });
          }
        }
        
        channel.bind("new-log-entries", (data: NewLogEntriesEvent) => {
          if (data && Array.isArray(data.logs) && data.logs.length > 0) {
            refreshGameState();
          }
        });
      } catch (error) { }
    };
    
    setupPusher();
    
    return () => {
      if (channel) {
        channel.unbind_all();
      }
      if (playerChannel) {
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
  }, [roomId, currentPlayerId, state, updateGameState, refreshGameState, setDrawnCardPlayable, notificationSoundRef]);
} 