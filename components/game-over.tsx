"use client"

import { useGame } from "./game-context"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Award, ChevronRight, Clock, Home, RotateCw, Trophy, Users } from "lucide-react"
import UnoCard from "./uno-card"

export default function GameOver() {
  const { state, refreshGameState } = useGame()
  const router = useRouter()
  const [isRematchLoading, setIsRematchLoading] = useState(false)

  const winner = state.players.find((p) => p.id === state.winner)
  
  const handleRematch = async () => {
    try {
      setIsRematchLoading(true)
      await fetch('/api/reset-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId: state.roomId })
      })
      await refreshGameState()
      router.replace(`/room/${state.roomId}`)
    } catch (error) {
      console.error("Error starting rematch:", error)
    } finally {
      setIsRematchLoading(false)
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-yellow-400/10 animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-blue-400/10 animate-pulse-slow animation-delay-1000"></div>
        <div className="absolute bottom-40 left-[30%] w-40 h-40 rounded-full bg-green-400/10 animate-pulse-slow animation-delay-2000"></div>
      </div>

      <Card className="max-w-2xl w-full backdrop-blur-sm bg-white/90 border-0 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="relative bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-8">
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="w-full h-full bg-[url('/confetti-pattern.svg')]"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-3">
              {winner ? (
                <div className="flex items-center justify-center mb-2">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="w-8 h-8 text-yellow-900" />
                  </div>
                </div>
              ) : (
                <Award className="w-16 h-16 text-yellow-400 mb-2" />
              )}
            </div>
            
            <CardTitle className="text-3xl font-bold mb-2 text-center">Game Over!</CardTitle>
            <CardDescription className="text-white/90 text-lg text-center font-medium">
              {winner 
                ? <span className="font-semibold bg-white/20 px-2 py-0.5 rounded">{winner.name}</span> 
                : "Someone"} has won the game!
            </CardDescription>
          </div>
        </CardHeader>
        
        <Tabs defaultValue="standings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg mx-4 mt-4">
            <TabsTrigger 
              value="standings" 
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
            >
              Standings
            </TabsTrigger>
            <TabsTrigger 
              value="points" 
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
            >
              Points
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
            >
              History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="standings" className="p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>Final Standings</span>
              </h3>
              
              <div className="space-y-2">
                {state.players
                  .sort((a, b) => a.cards.length - b.cards.length)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className={`
                        p-4 rounded-xl flex justify-between items-center
                        ${player.id === state.winner
                          ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-sm"
                          : "bg-white border border-gray-100"}
                        transition-all duration-300 hover:shadow-md
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 
                            ? "bg-yellow-100 text-yellow-700" 
                            : index === 1 
                              ? "bg-gray-100 text-gray-700" 
                              : index === 2 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-gray-50 text-gray-500"}
                        `}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-800">{player.name}</span>
                        {player.id === state.winner && (
                          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
                            Winner
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{player.cards.length} cards</div>
                          {player.points !== undefined && (
                            <div className={`text-sm font-semibold ${player.id === state.winner ? "text-green-600" : "text-gray-800"}`}>
                              {player.id === state.winner ? "Winner!" : `${player.points} points`}
                            </div>
                          )}
                        </div>
                        
                        {player.id === state.winner && (
                          <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                            <Trophy className="w-3 h-3 text-yellow-900" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="points" className="px-4 py-3">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                <span>Points Calculation</span>
              </h3>
              
              <p className="text-sm text-gray-600">
                In UNO, the winner gets points based on cards left in other players' hands.
              </p>
              
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <h4 className="font-medium text-indigo-800 mb-3">Card Point Values</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {cardPointsGuide.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm py-1 border-b border-indigo-100 last:border-0">
                      <span className="font-medium text-gray-700">{item.type}</span>
                      <span className="text-indigo-700">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                <h4 className="font-medium text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span>Players' Cards Point Breakdown</span>
                </h4>
                
                {state.players
                  .filter(player => player.id !== state.winner && player.cards.length > 0)
                  .map((player) => {
                    const numberCards = player.cards.filter(card => card.type === "number");
                    const skipCards = player.cards.filter(card => card.type === "skip");
                    const reverseCards = player.cards.filter(card => card.type === "reverse");
                    const draw2Cards = player.cards.filter(card => card.type === "draw2");
                    const wildCards = player.cards.filter(card => ["wild", "wild4"].includes(card.type));
                    
                    const numberPoints = numberCards.reduce((acc, card) => acc + (card.value || 0), 0);
                    const skipPoints = skipCards.length * 20;
                    const reversePoints = reverseCards.length * 20;
                    const draw2Points = draw2Cards.length * 20;
                    const wildPoints = wildCards.length * 50;
                    
                    return (
                      <div key={player.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <h5 className="font-medium text-gray-800 mb-3 pb-2 border-b border-gray-100">
                          {player.name}'s Cards
                        </h5>
                        
                        <div className="space-y-1.5">
                          {numberCards.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Number Cards ({numberCards.length})</span>
                              <span className="font-medium text-gray-900">{numberPoints} points</span>
                            </div>
                          )}
                          {skipCards.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Skip Cards ({skipCards.length})</span>
                              <span className="font-medium text-gray-900">{skipPoints} points</span>
                            </div>
                          )}
                          {reverseCards.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Reverse Cards ({reverseCards.length})</span>
                              <span className="font-medium text-gray-900">{reversePoints} points</span>
                            </div>
                          )}
                          {draw2Cards.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Draw Two Cards ({draw2Cards.length})</span>
                              <span className="font-medium text-gray-900">{draw2Points} points</span>
                            </div>
                          )}
                          {wildCards.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Wild Cards ({wildCards.length})</span>
                              <span className="font-medium text-gray-900">{wildPoints} points</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between font-medium pt-2 mt-1 border-t border-gray-100">
                            <span className="text-indigo-700">Total</span>
                            <span className="text-indigo-700">{player.points} points</span>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1" style={{ maxWidth: 'calc(5 * 48px)' }}>
                          {player.cards.map((card, idx) => (
                            <div
                              key={card.id}
                              style={{
                                transform: 'scale(0.45)',
                                transformOrigin: 'top left',
                                marginRight: (idx + 1) % 5 === 0 ? 0 : '0.25rem',
                                marginBottom: '0.25rem',
                                width: '48px',
                                height: '86px',
                                display: 'inline-block',
                              }}
                            >
                              <UnoCard card={card} disabled />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                
                {state.players.filter(player => player.id !== state.winner && player.cards.length > 0).length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <p>No cards left to calculate points</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="px-4 py-3">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <span>Match History</span>
              </h3>
              
              {state.matchHistory && state.matchHistory.length > 0 ? (
                <div className="space-y-3">
                  {state.matchHistory.map((match, index) => {
                    const matchWinner = match.playerResults.find(p => p.playerId === match.winner)
                    return (
                      <div key={index} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium text-gray-800">
                                Winner: {matchWinner?.playerName}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(match.date).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Player Points:</h4>
                          <div className="space-y-1">
                            {match.playerResults.map(player => (
                              <div key={player.playerId} className="flex justify-between text-sm px-1 py-1">
                                <span className={player.playerId === match.winner ? "font-medium text-indigo-600" : "text-gray-600"}>
                                  {player.playerName}
                                  {player.playerId === match.winner && (
                                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                      Winner
                                    </span>
                                  )}
                                </span>
                                <span className={`font-medium ${player.playerId === match.winner ? "text-indigo-600" : "text-gray-700"}`}>
                                  {player.points} points
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
                  <p className="text-gray-500">No previous matches in this room</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="flex justify-between p-4 bg-gray-50 border-t border-gray-100">
          <Link href="/">
            <Button variant="outline" className="rounded-lg border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Button>
          </Link>
          
          <Button 
            onClick={handleRematch} 
            disabled={isRematchLoading}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center gap-1"
          >
            {isRematchLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                <span>Starting...</span>
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4" />
                <span>Rematch</span>
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}