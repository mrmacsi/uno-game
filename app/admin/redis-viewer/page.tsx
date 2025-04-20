'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getAllGameRoomKeys, getRedisValue } from '@/lib/redis-actions'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Database, KeyRound, List, History, ArrowLeft } from 'lucide-react'
import { toast } from "sonner"
import Link from 'next/link'
import type { MatchResult, GameState } from '@/lib/types'
import { AvatarDisplay } from '@/components/game/avatar-display'

const ROOM_PREFIX = "room:" // Define prefix locally if needed for display

export default function RedisViewerPage() {
  const [keys, setKeys] = useState<string[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [keyValue, setKeyValue] = useState<string | null>(null)
  const [matchHistory, setMatchHistory] = useState<MatchResult[] | null>(null)
  const [parsedGameState, setParsedGameState] = useState<Partial<GameState> | null>(null)
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [loadingValue, setLoadingValue] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoadingKeys(true)
    setError(null)
    try {
      const fetchedKeys = await getAllGameRoomKeys()
      setKeys(fetchedKeys.sort()) // Sort keys alphabetically
    } catch (err) {
      console.error("Failed to fetch Redis keys:", err)
      setError("Failed to fetch Redis keys.")
      toast.error("Could not load Redis keys.")
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleKeySelect = useCallback(async (key: string) => {
    setSelectedKey(key)
    setKeyValue(null) // Clear previous value
    setMatchHistory(null)
    setParsedGameState(null) // Clear previous parsed state
    setLoadingValue(true)
    setError(null)
    try {
      const value = await getRedisValue(key)
      setKeyValue(value)
      if (value) {
        // Attempt to parse and extract history and full state
        try {
          const parsedState: Partial<GameState> = JSON.parse(value);
          setParsedGameState(parsedState); // Store the full parsed state
          setMatchHistory(parsedState.matchHistory || null); // Extract history as before
        } catch (parseError) {
           console.error(`Error parsing JSON for key ${key}:`, parseError);
           setMatchHistory(null); 
           setParsedGameState(null); // Ensure parsed state is null on error
           setError(`Failed to parse JSON data for key ${key}.`);
           toast.error(`Invalid JSON data for key ${key}.`);
        }
      } else {
         setMatchHistory(null)
         setParsedGameState(null)
      }
    } catch (err) {
      console.error(`Failed to fetch value for key ${key}:`, err)
      setError(`Failed to fetch value for key ${key}.`)
      toast.error(`Could not load value for ${key}.`)
    } finally {
      setLoadingValue(false)
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 dark:from-red-800 dark:via-orange-700 dark:to-yellow-600">
      <div className="w-full max-w-6xl my-4 sm:my-6">
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-950/80 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden flex flex-col border border-white/20 dark:border-gray-800/60">
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 border-b border-white/15 dark:border-gray-800/50">
             <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                     <Database className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                     <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Redis Viewer</h1>
                 </div>
                 <Link href="/admin">
                   <Button variant="outline" size="sm" className="flex items-center gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-medium">
                     <ArrowLeft className="mr-2 h-4 w-4" />
                     Back to Admin
                   </Button>
                 </Link>
             </div>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                <div className="border-b border-gray-200 dark:border-gray-700/70 p-5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Room Keys ({keys.length})</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a key to view its value.</p>
                </div>
                <div className="p-3">
                  {loadingKeys ? (
                    <div className="flex justify-center items-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : error && keys.length === 0 ? (
                    <p className="text-center text-red-600 dark:text-red-400">{error}</p>
                  ) : keys.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">No room keys found.</p>
                  ) : (
                    <ScrollArea className="h-96 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 bg-white/20 dark:bg-gray-950/20">
                      <div className="p-1">
                        {keys.map((key) => (
                          <Button
                            key={key}
                            variant="ghost"
                            className={`w-full text-left px-3 py-2 rounded-md hover:bg-white/50 dark:hover:bg-gray-800/60 text-sm font-mono text-gray-700 dark:text-gray-300 transition-colors ${selectedKey === key ? 'bg-blue-50 dark:bg-blue-900/40' : ''}`}
                            onClick={() => handleKeySelect(key)}
                          >
                            {key.replace(ROOM_PREFIX, '')}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 bg-white/60 dark:bg-gray-900/70 rounded-xl shadow-md overflow-hidden border border-white/10 dark:border-gray-800/50">
                <div className="border-b border-gray-200 dark:border-gray-700/70 p-5">
                  <div className="flex items-center gap-2">
                    <List className="h-5 w-5 text-green-500 dark:text-green-400" />
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Selected Key Value</h2>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedKey ? `Value for key: ${selectedKey}` : 'Select a key from the list to view details.'}
                  </p>
                </div>
                <div className="p-5">
                  {loadingValue ? (
                    <div className="flex justify-center items-center h-60">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : selectedKey && error && !keyValue ? (
                    <p className="text-center text-red-600 dark:text-red-400">{error}</p>
                  ): !selectedKey ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 h-60 flex items-center justify-center">No key selected.</p>
                  ) : keyValue === null ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 h-60 flex items-center justify-center">Key exists but has no value.</p>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Raw Value (JSON):</h4>
                        <ScrollArea className="h-40 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-800/50 p-4">
                          <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">{keyValue}</pre>
                        </ScrollArea>
                      </div>

                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <History className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                          <span>Parsed Match History:</span>
                        </h4>
                        {matchHistory && matchHistory.length > 0 ? (
                          <ScrollArea className="h-60 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 p-4 bg-gray-50/30 dark:bg-gray-800/30">
                            <div className="space-y-3">
                              {[...matchHistory]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((match, index) => {
                                  const matchWinner = match.playerResults.find(p => p.playerId === match.winner);
                                  return (
                                    <div key={index} className="border border-gray-200 dark:border-gray-700/60 rounded-lg overflow-hidden bg-white/50 dark:bg-gray-900/40 shadow-sm">
                                      <div className="bg-gray-100/60 dark:bg-gray-800/50 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700/60">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            Match #{matchHistory.length - index} ({new Date(match.date).toLocaleString()})
                                          </span>
                                          <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200">Score: {match.finalScore}</Badge>
                                        </div>
                                      </div>
                                      <div className="p-3 space-y-1.5">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                          <span className="text-gray-600 dark:text-gray-400">Winner:</span>
                                          {matchWinner ? (
                                            <>
                                              <AvatarDisplay index={matchWinner.avatar_index ?? 0} size="xs" className="flex-shrink-0 rounded-full shadow-sm"/>
                                              <span className="text-gray-700 dark:text-gray-300">{matchWinner.playerName} ({matchWinner.points} points)</span>
                                            </>
                                          ) : (
                                            <span className="text-gray-500">N/A</span>
                                          )}
                                        </div>
                                        <div>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">Other Players:</span>
                                          <ul className="list-none pl-2 mt-1 space-y-1">
                                            {match.playerResults
                                              .filter(p => p.playerId !== match.winner)
                                              .map(loser => (
                                                  <li key={loser.playerId} className="flex items-center gap-2 text-xs">
                                                      <AvatarDisplay index={loser.avatar_index ?? 0} size="xs" className="flex-shrink-0 rounded-full shadow-sm"/>
                                                      <span className="text-gray-700 dark:text-gray-300">{loser.playerName} ({loser.points} points)</span>
                                                  </li>
                                            ))}
                                            {match.playerResults.filter(p => p.playerId !== match.winner).length === 0 && (
                                              <li className="text-xs text-gray-400 italic">No other players recorded.</li>
                                            )}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </ScrollArea>
                        ) : matchHistory === null && keyValue ? (
                            <p className="text-sm text-orange-600 dark:text-orange-400 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 rounded-md">
                              Could not parse history from JSON, or the `matchHistory` field is missing/null in the data.
                            </p>
                        ) : (
                          <div className="h-40 flex items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400">
                            No match history found in this game state.
                          </div>
                        )}
                      </div>

                      {parsedGameState && (
                        <div>
                          <h4 className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Database className="h-4 w-4 text-blue-500 dark:text-blue-400"/>
                            <span>Full Game State Object:</span>
                          </h4>
                          <ScrollArea className="h-60 overflow-y-auto border rounded-lg border-gray-200/70 dark:border-gray-700/50 bg-gray-50/70 dark:bg-gray-800/50 p-4">
                            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                                {JSON.stringify(parsedGameState, null, 2)}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 