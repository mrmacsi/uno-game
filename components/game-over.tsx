"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function GameOver() {
  const { state } = useGame()

  const winner = state.players.find((p) => p.id === state.winner)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Game Over!</CardTitle>
          <CardDescription className="text-center">
            {winner ? `${winner.name} has won the game!` : "The game has ended."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Final Standings</h3>
            <ul className="space-y-2">
              {state.players
                .sort((a, b) => a.cards.length - b.cards.length)
                .map((player, index) => (
                  <li
                    key={player.id}
                    className={`p-3 rounded-md flex justify-between items-center ${
                      player.id === state.winner ? "bg-yellow-100" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{index + 1}.</span>
                      <span>{player.name}</span>
                    </div>
                    <span className="text-sm">{player.cards.length} cards left</span>
                  </li>
                ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/">
            <Button className="bg-red-600 hover:bg-red-700">Back to Home</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
