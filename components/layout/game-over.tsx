"use client"

import React, { useMemo, useState } from "react"
import { useGame } from "../providers/game-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, History, Award, ChevronRight, Home, RotateCw } from "lucide-react"
import type { Card as UnoCardType, Player, MatchResult } from "@/lib/types"

// Helper function to calculate points from cards
const calculateHandPoints = (cards: UnoCardType[]): number => {
  return cards.reduce((sum, card) => {
    if (card.type === "number" && typeof card.value === 'number') return sum + card.value;
    if (["skip", "reverse", "draw2"].includes(card.type)) return sum + 20;
    if (["wild", "wild4"].includes(card.type)) return sum + 50;
    return sum;
  }, 0);
};

export default function GameOver() {
  const { state, resetGame, leaveRoom } = useGame()
  const [showHistory, setShowHistory] = useState(false)
  const [showScores, setShowScores] = useState(false)

  const winner = useMemo(() => {
    if (state.status !== "finished" || !state.winner) return null
    return state.players.find((p: Player) => p.id === state.winner)
  }, [state.status, state.winner, state.players])

  const finalScores = useMemo(() => {
    if (state.status !== "finished") return [];
    return state.players.map((player: Player) => ({
      ...player,
      finalPoints: calculateHandPoints(player.cards),
    }));
  }, [state.status, state.players]);

  const sortedScores = useMemo(() => {
    return [...finalScores].sort((a: { finalPoints: number }, b: { finalPoints: number }) => a.finalPoints - b.finalPoints);
  }, [finalScores]);

  const matchHistory = useMemo(() => state.matchHistory || [], [state.matchHistory]);

  if (state.status !== "finished" || !winner) {
    return null
  }

  const handlePlayAgain = () => {
    setShowHistory(false)
    setShowScores(false)
    resetGame()
  }

  const handleLeave = () => {
    leaveRoom()
  }

  return (
    <Dialog open={state.status === "finished"} onOpenChange={(open) => !open && handleLeave()}>
      <DialogContent className="max-w-md sm:max-w-lg md:max-w-2xl">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader>
              <DialogTitle className="text-center text-3xl font-bold flex items-center justify-center gap-2">
                <Trophy className="text-yellow-400 w-8 h-8" />
                Game Over!
              </DialogTitle>
              <DialogDescription className="text-center text-lg mt-2">
                {winner.name} wins the round!
              </DialogDescription>
            </DialogHeader>
          
            <div className="my-6 flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4">Final Scores</h3>
              <Button variant="outline" size="sm" onClick={() => setShowScores(!showScores)} className="mb-4">
                {showScores ? "Hide" : "Show"} Detailed Scores <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showScores ? 'rotate-90' : ''}`} />
              </Button>
              {showScores && (
                <ScrollArea className="h-[200px] w-full rounded-md border mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-right">Points (Cards Left)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedScores.map((player: Player & { finalPoints: number }, index: number) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{player.name} {player.id === winner.id ? <Award className="inline w-4 h-4 ml-1 text-yellow-500" /> : ''}</TableCell>
                          <TableCell className="text-right">{player.finalPoints} ({player.cards.length})</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              {!showScores && (
                  <p className="text-muted-foreground text-center mb-4">
                      Winner: {winner.name} with {calculateHandPoints(winner.cards)} points (0 cards). Winner gains points from other players' hands.
                  </p>
                            )}
              
              <h4 className="font-semibold mt-2 mb-2">Winner's Hand (Empty)</h4>
              <div className="flex justify-center items-center h-20 w-full bg-muted rounded-md mb-6">
                  <p className="text-muted-foreground">No cards left!</p>
              </div>

              {matchHistory.length > 0 && (
                <div className="w-full mt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="w-full mb-2">
                    <History className="w-4 h-4 mr-2" /> {showHistory ? "Hide" : "Show"} Match History ({matchHistory.length} rounds)
                  </Button>
                  {showHistory && (
                     <ScrollArea className="h-[150px] w-full rounded-md border p-2">
                       {matchHistory.map((match: MatchResult, index: number) => (
                         <div key={match.date || index} className="mb-2 pb-2 border-b last:border-b-0">
                           <p className="text-sm font-semibold">Round {matchHistory.length - index} ({new Date(match.date).toLocaleTimeString()})</p>
                           <p className="text-xs text-muted-foreground">Winner: {match.playerResults.find((pr: { playerId: string; playerName: string; }) => pr.playerId === match.winner)?.playerName || 'Unknown'} (+{match.finalScore} pts)</p>
                      </div>
                    ))}
                    </ScrollArea>
                  )}
                  </div>
                )}
              </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
              <Button onClick={handleLeave} variant="outline">
                <Home className="w-4 h-4 mr-2" /> Leave Room
              </Button>
              <Button onClick={handlePlayAgain} className="bg-green-600 hover:bg-green-700">
                <RotateCw className="w-4 h-4 mr-2" /> Play Again
            </Button>
            </DialogFooter>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}