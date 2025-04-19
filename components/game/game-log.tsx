"use client"

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LogEntry } from "@/lib/types";

interface GameLogProps {
  logs: LogEntry[];
}

export default function GameLog({ logs }: GameLogProps) {
  if (!logs || logs.length === 0) {
    return <p className="text-center text-sm text-white/60 py-4">No game events yet.</p>;
  }

  return (
    <ScrollArea className="h-[300px] w-full p-4 bg-black/20 rounded-md border border-white/10">
      <div className="space-y-2">
        {logs.map((log) => {
          const { id, message, player, card, color } = log;
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

          let display = safeMessage;
          if (player || card || color) {
            display = `${player ? player + ' ' : ''}${card ? card + ' ' : ''}${color ? color + ' ' : ''}- ${safeMessage}`.trim();
          }

          return (
            <p key={id} className={`text-xs ${colorClass}`}>
              {display}
            </p>
          );
        })}
      </div>
    </ScrollArea>
  );
} 