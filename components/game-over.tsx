"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import Link from "next/link"

export default function GameOver() {
  const { state, refreshGameState } = useGame()

  const winner = state.players.find((p) => p.id === state.winner)
  
  const handleRematch = async () => {
    try {
      await fetch('/api/reset-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: state.roomId })
      })
      await refreshGameState()
    } catch (error) {
      console.error("Error starting rematch:", error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-500 to-yellow-500">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <CardTitle className="text-center">Game Over!</CardTitle>
          <CardDescription className="text-center">
            {winner ? `${winner.name} has won the game!` : "The game has ended."}
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standings">Final Standings</TabsTrigger>
            <TabsTrigger value="history">Match History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="standings" className="p-4">
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
                      <div className="flex flex-col items-end">
                        <span className="text-sm">{player.cards.length} cards left</span>
                        <span className="text-sm font-semibold">
                          {player.points ? `${player.points} points` : "Winner!"}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Match History</h3>
              {state.matchHistory && state.matchHistory.length > 0 ? (
                <ul className="space-y-3">
                  {state.matchHistory.map((match, index) => {
                    const matchWinner = match.playerResults.find(p => p.playerId === match.winner)
                    return (
                      <li key={index} className="p-3 bg-white rounded-md">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">
                            Winner: {matchWinner?.playerName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(match.date).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <h4 className="font-medium mb-1">Player Points:</h4>
                          <ul className="space-y-1">
                            {match.playerResults.map(player => (
                              <li key={player.playerId} className="flex justify-between">
                                <span>{player.playerName}</span>
                                <span>{player.points} points</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-center text-gray-500">No previous matches in this room</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="flex justify-between p-4">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          
          <Button onClick={handleRematch} className="bg-red-600 hover:bg-red-700">
            Rematch
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
