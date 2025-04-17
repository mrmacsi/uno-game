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
  
  const cardPointsGuide = [
    { type: "Number cards 0-9", value: "Face value (0-9 points)" },
    { type: "Skip", value: "20 points" },
    { type: "Reverse", value: "20 points" },
    { type: "Draw Two", value: "20 points" },
    { type: "Wild", value: "50 points" },
    { type: "Wild Draw Four", value: "50 points" },
    { type: "Wild Swap Hands", value: "50 points" },
  ]

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="standings">Final Standings</TabsTrigger>
            <TabsTrigger value="points">Points Breakdown</TabsTrigger>
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
          
          <TabsContent value="points" className="p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Points Calculation</h3>
              <p className="text-sm text-center mb-4">
                In UNO, the winner gets points based on cards left in other players' hands.
                Here's how each card is valued:
              </p>
              
              <div className="bg-white rounded-md p-4">
                <h4 className="font-medium mb-2">Card Point Values:</h4>
                <ul className="space-y-2">
                  {cardPointsGuide.map((item, index) => (
                    <li key={index} className="flex justify-between">
                      <span className="font-medium">{item.type}</span>
                      <span>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white rounded-md p-4 mt-4">
                <h4 className="font-medium mb-2">Players' Cards Point Breakdown:</h4>
                {state.players
                  .filter(player => player.id !== state.winner && player.cards.length > 0)
                  .map((player) => {
                    const numberCards = player.cards.filter(card => card.type === "number");
                    const skipCards = player.cards.filter(card => card.type === "skip");
                    const reverseCards = player.cards.filter(card => card.type === "reverse");
                    const draw2Cards = player.cards.filter(card => card.type === "draw2");
                    const wildCards = player.cards.filter(card => ["wild", "wild4", "wildSwap"].includes(card.type));
                    
                    const numberPoints = numberCards.reduce((acc, card) => acc + (card.value || 0), 0);
                    const skipPoints = skipCards.length * 20;
                    const reversePoints = reverseCards.length * 20;
                    const draw2Points = draw2Cards.length * 20;
                    const wildPoints = wildCards.length * 50;
                    
                    return (
                      <div key={player.id} className="mt-3 pt-3 border-t">
                        <h5 className="font-medium mb-1">{player.name}'s Cards:</h5>
                        <ul className="text-sm space-y-1">
                          {numberCards.length > 0 && (
                            <li className="flex justify-between">
                              <span>Number Cards ({numberCards.length})</span>
                              <span>{numberPoints} points</span>
                            </li>
                          )}
                          {skipCards.length > 0 && (
                            <li className="flex justify-between">
                              <span>Skip Cards ({skipCards.length})</span>
                              <span>{skipPoints} points</span>
                            </li>
                          )}
                          {reverseCards.length > 0 && (
                            <li className="flex justify-between">
                              <span>Reverse Cards ({reverseCards.length})</span>
                              <span>{reversePoints} points</span>
                            </li>
                          )}
                          {draw2Cards.length > 0 && (
                            <li className="flex justify-between">
                              <span>Draw Two Cards ({draw2Cards.length})</span>
                              <span>{draw2Points} points</span>
                            </li>
                          )}
                          {wildCards.length > 0 && (
                            <li className="flex justify-between">
                              <span>Wild Cards ({wildCards.length})</span>
                              <span>{wildPoints} points</span>
                            </li>
                          )}
                          <li className="flex justify-between font-medium pt-1 border-t">
                            <span>Total</span>
                            <span>{player.points} points</span>
                          </li>
                        </ul>
                      </div>
                    );
                  })}
                
                {state.players.filter(player => player.id !== state.winner && player.cards.length > 0).length === 0 && (
                  <p className="text-sm text-gray-500 text-center">No cards left to calculate points</p>
                )}
              </div>
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
