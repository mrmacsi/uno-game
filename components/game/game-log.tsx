"use client"

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GameLogProps {
  logs: string[];
}

export default function GameLog({ logs }: GameLogProps) {
  if (!logs || logs.length === 0) {
    return <p className="text-center text-sm text-white/60 py-4">No game events yet.</p>;
  }

  return (
    <ScrollArea className="h-[300px] w-full p-4 bg-black/20 rounded-md border border-white/10">
      <div className="space-y-2">
        {logs.map((log, index) => {
          const isUnoDeclaration = log.startsWith("UNO!");
          const isPenalty = log.includes("penalty");
          const isDraw = log.includes("draws") || log.includes("drew");
          const isSkip = log.includes("skipped");
          const isReverse = log.includes("reversed");
          const isPlay = log.includes("played") || log.includes("passed");

          let colorClass = "text-white/80"; // Default
          if (isUnoDeclaration) colorClass = "text-yellow-400 font-semibold";
          else if (isPenalty) colorClass = "text-red-400";
          else if (isDraw) colorClass = "text-blue-300";
          else if (isSkip) colorClass = "text-orange-400";
          else if (isReverse) colorClass = "text-purple-300";
          else if (isPlay) colorClass = "text-green-300";
          
          return (
            <p key={index} className={`text-xs ${colorClass}`}>
              {log}
            </p>
          );
        })}
      </div>
    </ScrollArea>
  );
} 