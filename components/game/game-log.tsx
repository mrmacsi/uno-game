"use client"

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LogEntry } from "@/lib/types";
import { AvatarDisplay } from "./avatar-display";
import { cn } from "@/lib/utils";

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
          const { id, message, player, avatarIndex } = log;
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

          return (
            <div key={id} className={cn(
              "flex items-start gap-2 text-xs", 
              colorClass
            )}>
              {avatarIndex !== undefined ? (
                 <AvatarDisplay index={avatarIndex} size="xs" className="mt-0.5 flex-shrink-0" />
              ) : (
                 <div className="w-[24px] h-[24px] flex-shrink-0"></div> 
              )}
              <p className="flex-grow">
                {player && <span className="font-medium">{player}: </span>}
                {safeMessage}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
} 