"use client"

import { useGame } from "./game-context"

export default function GameLog() {
  const { state } = useGame()
  const log = state.log || []

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg p-4 pointer-events-none">
      <div className="space-y-2">
        {log.slice().reverse().map((entry, idx) => (
          <div
            key={idx}
            className="bg-black/80 text-white rounded px-4 py-2 shadow-lg text-sm pointer-events-auto animate-fade-in"
          >
            {entry}
          </div>
        ))}
      </div>
    </div>
  )
}
