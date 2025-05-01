"use client"

import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"
import { Award, Clock, Home, RotateCw, Trophy, Users, List } from "lucide-react"
import UnoCard from "../game/uno-card"
import { AvatarDisplay } from "../game/avatar-display"
import { calculateHandPoints } from "@/lib/game-logic"
import { cn } from "@/lib/utils"
import { LogEntry, Card as UnoCardType } from "@/lib/types"

export default function GameOver() {
  const { state, rematch, leaveRoom, getGameDuration } = useGame()
  const [isRematchLoading, setIsRematchLoading] = useState(false)
  const winner = state.players.find((p) => p.id === state.winner)
  const handleRematch = async () => {
    setIsRematchLoading(true)
    try {
      await rematch()
    } catch (error) {
      console.error("Rematch failed:", error)
    } finally {
      setIsRematchLoading(false)
    }
  }
  const handleGoHome = () => {
    leaveRoom()
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-yellow-400/10 animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-blue-400/10 animate-pulse-slow animation-delay-1000"></div>
        <div className="absolute bottom-40 left-[30%] w-40 h-40 rounded-full bg-green-400/10 animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
      </div>
      <div className="w-full max-w-2xl opacity-0 scale-90 animate-scale-fade-in">
        <Card className="border-0 shadow-2xl rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
          <CardHeader className="relative bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-8">
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="w-full h-full bg-[url('/confetti-pattern.svg')]"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-3">
                {winner ? (
                  <div className="flex items-center justify-center mb-2">
                    <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
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
                <div className="mt-3 flex items-center justify-center text-sm text-white/80">
                  <Clock className="w-4 h-4 mr-1.5" />
                  <span>Game Duration: {getGameDuration()}</span>
                </div>
              </CardDescription>
            </div>
          </CardHeader>
          <Tabs defaultValue="standings" className="w-full">
            <TabsList className="flex overflow-x-auto whitespace-nowrap no-scrollbar justify-center w-full gap-1 sm:gap-2 bg-gray-100/80 backdrop-blur-sm rounded-lg shadow-inner p-1 mt-4 border border-gray-200/80 transition-all duration-300 mx-auto max-w-max">
              <TabsTrigger 
                value="standings" 
                className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] rounded-md px-4 py-1 text-sm sm:text-base font-medium transition-all duration-200 bg-transparent text-gray-700 hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md cursor-pointer"
              >
                Standings
              </TabsTrigger>
              <TabsTrigger 
                value="points" 
                className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] rounded-md px-4 py-1 text-sm sm:text-base font-medium transition-all duration-200 bg-transparent text-gray-700 hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md cursor-pointer"
              >
                Points
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] rounded-md px-4 py-1 text-sm sm:text-base font-medium transition-all duration-200 bg-transparent text-gray-700 hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md cursor-pointer"
              >
                History
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="flex-shrink-0 min-w-[100px] sm:min-w-[120px] rounded-md px-4 py-1 text-sm sm:text-base font-medium transition-all duration-200 bg-transparent text-gray-700 hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-indigo-400 data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-md cursor-pointer"
              >
                Game Logs
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
                    .map(player => ({
                      ...player,
                      points: calculateHandPoints(player.cards)
                    }))
                    .sort((a, b) => a.cards.length - b.cards.length || b.points - a.points)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`
                          p-4 rounded-xl flex justify-between items-center
                          ${player.id === state.winner
                            ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-md"
                            : "bg-white border border-gray-100 hover:border-gray-200"}
                          transition-all duration-300 hover:shadow-md
                          animate-slide-in-right
                        `}
                        style={{animationDelay: `${index * 100}ms`, animationFillMode: 'forwards'}}
                      >
                        <div className="flex items-center gap-3">
                          <AvatarDisplay 
                            index={player.avatarIndex ?? 0} 
                            size="sm" 
                            className={cn(
                              index === 0 && "ring-2 ring-yellow-300",
                              index === 1 && "ring-2 ring-gray-300",
                              index === 2 && "ring-2 ring-amber-300",
                            )}
                          />
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
                            <div className={`text-sm font-semibold ${player.id === state.winner ? "text-green-600" : "text-gray-800"}`}>
                              {player.id === state.winner ? "Winner!" : `${player.points} points`}
                            </div>
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
                    .map((player, playerIndex) => {
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
                      const calculatedTotalPoints = numberPoints + skipPoints + reversePoints + draw2Points + wildPoints;
                      return (
                        <div
                          key={player.id}
                          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in-up"
                          style={{animationDelay: `${playerIndex * 100}ms`, animationFillMode: 'forwards'}}
                        >
                          <h5 className="font-medium text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center gap-2">
                            <AvatarDisplay index={player.avatarIndex ?? 0} size="xs" />
                            <span>{player.name}'s Cards</span>
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
                              <span className="text-indigo-700">{calculatedTotalPoints} points</span>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-1">
                            {player.cards.map((card: UnoCardType) => (
                              <div
                                key={card.id}
                                style={{
                                  transform: 'scale(0.45)',
                                  transformOrigin: 'top left',
                                  width: '48px',
                                  height: '86px',
                                }}
                              >
                                <UnoCard card={card as UnoCardType} disabled />
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
                {/* Total Points Summary Across All Matches */}
                {state.matchHistory && state.matchHistory.length > 0 && (
                  <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-wrap gap-3 items-center justify-center">
                    {(() => {
                      // Aggregate total points per playerId
                      const totals: Record<string, { name: string, avatar: number | null, points: number }> = {};
                      state.matchHistory.forEach(match => {
                        match.playerResults.forEach(p => {
                          if (!totals[p.playerId]) {
                            totals[p.playerId] = { name: p.playerName, avatar: p.avatar_index, points: 0 };
                          }
                          totals[p.playerId].points += p.points;
                        });
                      });
                      // Sort by points ascending
                      const sorted = Object.entries(totals).sort((a, b) => a[1].points - b[1].points);
                      return sorted.map(([playerId, info], index) => (
                        <div 
                          key={playerId} 
                          className={cn(
                            "flex items-center gap-2 bg-white rounded-lg px-3 py-1 shadow-sm border",
                            index === 0 ? "border-yellow-300 ring-1 ring-yellow-300" : "border-gray-100"
                          )}
                        >
                          {index === 0 && <Trophy className="w-3.5 h-3.5 text-yellow-500 mr-1" />}
                          <AvatarDisplay index={info.avatar ?? 0} size="xs" />
                          <span className="font-medium text-gray-800 text-sm">{info.name}</span>
                          <span className="text-indigo-700 font-bold text-sm">{info.points} pts</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
                {state.matchHistory && state.matchHistory.length > 0 ? (
                  <div className="space-y-3">
                    {[...state.matchHistory]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((match, index) => {
                        const matchWinner = match.playerResults.find(p => p.playerId === match.winner)
                        return (
                          <div
                            key={index}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in-up"
                            style={{animationDelay: `${index * 100}ms`, animationFillMode: 'forwards'}}
                          >
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
                                  <div key={player.playerId} className="flex justify-between items-center text-sm px-1 py-1">
                                    <div className="flex items-center gap-2">
                                      <AvatarDisplay 
                                        index={player.avatar_index ?? 0}
                                        size="xs"
                                        className="flex-shrink-0"
                                      />
                                      <span className={player.playerId === match.winner ? "font-medium text-indigo-600" : "text-gray-600"}>
                                        {player.playerName}
                                        {player.playerId === match.winner && (
                                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                                            Winner
                                          </span>
                                        )}
                                      </span>
                                    </div>
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
            <TabsContent value="logs" className="px-4 py-3">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <List className="w-5 h-5 text-blue-500" />
                  <span>Game Logs (Latest First)</span>
                </h3>
                <ScrollArea className="h-[400px] w-full pr-3">
                  {state.log && state.log.length > 0 ? (
                    <div className="space-y-2">
                      {[...state.log]
                        .reverse()
                        .map((log: LogEntry, index: number) => {
                          const isPlayEventWithCard = log.eventType === 'play' && log.cardType && log.cardColor;
                          const cardToShow: Partial<UnoCardType> | null = isPlayEventWithCard ? {
                            id: log.id,
                            type: log.cardType,
                            color: log.cardColor,
                            value: log.cardValue,
                          } : null;

                          return (
                            <div
                              key={`${log.id}-${index}`}
                              className="flex items-start gap-3 p-2 bg-white border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors animate-fade-in-up"
                              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
                            >
                              {cardToShow && (
                                <div
                                  style={{
                                    transform: 'scale(0.45)',
                                    transformOrigin: 'top left',
                                    width: '48px',
                                    height: '86px',
                                    flexShrink: 0,
                                    marginTop: '2px' // Align better with text
                                  }}
                                >
                                  <UnoCard card={cardToShow as UnoCardType} disabled />
                                </div>
                              )}

                              <div className="flex-grow">
                                <div className="text-sm font-medium text-gray-800">{log.message}</div>
                                <div className="flex items-center mt-1">
                                  {log.avatarIndex !== undefined && (
                                    <AvatarDisplay
                                      index={log.avatarIndex}
                                      size="xs"
                                      className="mr-1 flex-shrink-0"
                                    />
                                  )}
                                  <span className="text-xs text-gray-600">
                                    {log.player ? `${log.player}` : 'System'}
                                    {log.timestamp && (
                                      <span className="text-gray-400 ml-1">
                                        {new Date(log.timestamp).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No game logs available for this match.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
          <CardFooter className="flex justify-between p-4 bg-gray-50 border-t border-gray-100">
            <Button 
              onClick={handleGoHome}
              variant="outline" 
              className="rounded-lg border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Button>
            <Button 
              onClick={handleRematch}
              disabled={isRematchLoading}
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center gap-1 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              title="Start a new game with the same players"
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
    </div>
  )
}