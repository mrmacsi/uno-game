"use client"

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LogEntry, CardColor } from "@/lib/types";
import { AvatarDisplay } from "./avatar-display";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GameLogProps {
  logs: LogEntry[];
}

// Card mini display component for logs
// Export the component for reuse
export const CardMiniDisplay = ({ color, type, value }: { color: CardColor; type: string; value?: number }) => {
  const getColorClass = (color: CardColor): string => {
    switch (color) {
      case "red": return "bg-red-600 text-white";
      case "blue": return "bg-blue-600 text-white";
      case "green": return "bg-green-600 text-white";
      case "yellow": return "bg-yellow-400 text-black";
      case "wild": 
      case "black": 
      default: return "bg-gradient-to-br from-red-600 via-blue-600 to-green-600 text-white";
    }
  };

  const cardText = type === "number" ? `${value}` : 
                  type === "wild4" ? "+4" :
                  type === "draw2" ? "+2" :
                  type === "skip" ? "⊘" :
                  type === "reverse" ? "↺" : 
                  type;

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center rounded px-1 mx-0.5 font-bold text-[10px] leading-none h-4",
        getColorClass(color)
      )}
    >
      {cardText}
    </span>
  );
};

// Function to format message with card display
const formatMessageWithCard = (message: string, cardColor?: CardColor, cardType?: string, cardValue?: number) => {
  if (!cardColor || !cardType) return message;
  
  // Replace mentions of cards with the card display
  const parts = message.split(/played a |played the |chose |with /);
  if (parts.length <= 1) return message;
  
  return (
    <>
      {parts[0]}played <CardMiniDisplay color={cardColor} type={cardType} value={cardValue} />
      {parts.length > 2 ? parts.slice(2).join(" ") : ""}
    </>
  );
};

export default function GameLog({ logs }: GameLogProps) {
  if (!logs || logs.length === 0) {
    return <p className="text-center text-sm text-white/60 py-4">No game events yet.</p>;
  }

  const handleMessageClick = async (messageText: string) => {
    if (!navigator.clipboard) {
      console.error("Clipboard API not available");
      return;
    }
    try {
      await navigator.clipboard.writeText(messageText);
      toast.success("Copied!", { 
        description: "Message copied to clipboard.",
        duration: 2000
      });
    } catch (err) {
      console.error("Failed to copy message: ", err);
    }
  };

  // Reverse logs to show newest first
  const reversedLogs = [...logs].reverse();

  return (
    <ScrollArea className="h-[300px] w-full p-4 bg-black/20 rounded-md border border-white/10">
      <div className="space-y-2">
        {reversedLogs.map((log) => {
          const { id, message, player, avatarIndex, timestamp, cardColor, cardType, cardValue } = log;
          const safeMessage = typeof message === 'string' ? message : '';
          const isUnoDeclaration = safeMessage.startsWith("UNO!");
          const isPenalty = safeMessage.includes("penalty");
          const isDraw = safeMessage.includes("draws") || safeMessage.includes("drew");
          const isSkip = safeMessage.includes("skipped");
          const isReverse = safeMessage.includes("reversed");
          const isPlay = safeMessage.includes("played") || safeMessage.includes("passed");

          let colorClass = "text-white/80";
          if (isUnoDeclaration) colorClass = "text-yellow-400 font-semibold";
          else if (isPenalty) colorClass = "text-red-400";
          else if (isDraw) colorClass = "text-blue-300";
          else if (isSkip) colorClass = "text-orange-400";
          else if (isReverse) colorClass = "text-purple-300";
          else if (isPlay) colorClass = "text-green-300";

          const formattedMessage = (isPlay && cardColor && cardType) 
            ? formatMessageWithCard(safeMessage, cardColor, cardType, cardValue) 
            : safeMessage;
            
          const formattedTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

          // Construct the full text to copy
          const fullMessageText = `${player ? player + ": " : ""}${safeMessage}${formattedTime ? ` (${formattedTime})` : ""}`;

          return (
            <div 
              key={id} 
              className={cn(
                "flex items-start gap-2 text-xs cursor-pointer hover:bg-white/5 p-1 rounded transition-colors",
                colorClass
              )}
              onClick={() => handleMessageClick(fullMessageText)}
              title="Click to copy message"
            >
              {avatarIndex !== undefined ? (
                 <AvatarDisplay index={avatarIndex} size="xs" className="mt-0.5 flex-shrink-0" />
              ) : (
                 <div className="w-[24px] h-[24px] flex-shrink-0"></div> 
              )}
              <div className="flex-grow flex flex-col">
                <p>
                  {(() => {
                    if (player && typeof formattedMessage === 'string' && formattedMessage.trim().startsWith(player)) {
                      return formattedMessage;
                    }
                    if (player) {
                      return <><span className="font-medium">{player}: </span>{formattedMessage}</>;
                    }
                    return formattedMessage;
                  })()}
                </p>
                {formattedTime && (
                  <span className="text-[10px] text-white/50 mt-0.5">{formattedTime}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
} 