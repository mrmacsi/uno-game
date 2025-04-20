'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getAllGameRoomKeys, getRedisValue } from '@/lib/redis-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    <main className="min-h-screen flex flex-col items-center p-6 md:p-12 bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-6xl"> 
        <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-red-600 dark:text-red-500" />
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Redis Viewer</h1>
            </div>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Key List Column */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Room Keys ({keys.length})</span>
              </CardTitle>
              <CardDescription>Select a key to view its value.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : error && keys.length === 0 ? (
                 <p className="text-center text-red-600 dark:text-red-400">{error}</p>
              ) : keys.length === 0 ? (
                 <p className="text-center text-gray-500 dark:text-gray-400">No room keys found.</p>
              ) : (
                <ScrollArea className="h-96 border rounded-md dark:border-gray-700">
                  <div className="p-2">
                    {keys.map((key) => (
                      <Button
                        key={key}
                        variant="ghost"
                        className={`w-full justify-start mb-1 text-left h-auto py-1.5 px-2 ${selectedKey === key ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                        onClick={() => handleKeySelect(key)}
                      >
                        <span className="truncate font-mono text-sm">{key.replace(ROOM_PREFIX, '')}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Value and History Column */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>Selected Key Value</span>
              </CardTitle>
              <CardDescription>
                {selectedKey ? `Value for key: ${selectedKey}` : 'Select a key from the list.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingValue ? (
                <div className="flex justify-center items-center h-60">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : selectedKey && error && !keyValue ? ( // Show error only if value couldn't be fetched at all
                <p className="text-center text-red-600 dark:text-red-400">{error}</p>
              ): !selectedKey ? (
                 <p className="text-center text-gray-500 dark:text-gray-400 h-60 flex items-center justify-center">No key selected.</p>
              ) : keyValue === null ? (
                 <p className="text-center text-gray-500 dark:text-gray-400 h-60 flex items-center justify-center">Key exists but has no value (or was deleted).</p>
              ) : (
                <div className="space-y-4">
                  <div>
                     <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1 text-sm">Raw Value (JSON):</h4>
                     <ScrollArea className="h-40 border rounded-md dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                       <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">{keyValue}</pre>
                     </ScrollArea>
                  </div>
                  
                  <div>
                     <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2 text-sm flex items-center gap-1.5">
                       <History className="h-4 w-4 text-purple-600 dark:text-purple-400"/>
                       <span>Parsed Match History:</span>
                     </h4>
                     {matchHistory && matchHistory.length > 0 ? (
                       <ScrollArea className="h-60 border rounded-md dark:border-gray-700">
                         <div className="space-y-3 p-3">
                           {[...matchHistory]
                             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                             .map((match, index) => {
                               const matchWinner = match.playerResults.find(p => p.playerId === match.winner);
                               return (
                                 <div key={index} className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800/50">
                                   <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 border-b dark:border-gray-700">
                                     <div className="flex justify-between items-center">
                                       <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                         Match #{matchHistory.length - index} ({new Date(match.date).toLocaleString()})
                                       </span>
                                       <Badge variant="secondary" className="text-xs">Score: {match.finalScore}</Badge>
                                     </div>
                                   </div>
                                   <div className="p-3 space-y-1.5">
                                     <div className="flex items-center gap-2 text-sm font-medium">
                                       <span className="text-gray-600 dark:text-gray-400">Winner:</span>
                                       {matchWinner ? (
                                         <>
                                            <AvatarDisplay index={matchWinner.avatar_index ?? 0} size="xs" className="flex-shrink-0"/>
                                            <span>{matchWinner.playerName} ({matchWinner.points} points)</span>
                                         </>
                                       ) : (
                                         <span>N/A</span>
                                       )}
                                     </div>
                                     <div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Other Players:</span>
                                        <ul className="list-none pl-2 mt-1 space-y-1">
                                          {match.playerResults
                                             .filter(p => p.playerId !== match.winner)
                                             .map(loser => (
                                                <li key={loser.playerId} className="flex items-center gap-2 text-xs">
                                                    <AvatarDisplay index={loser.avatar_index ?? 0} size="xs" className="flex-shrink-0"/>
                                                    <span>{loser.playerName} ({loser.points} points)</span>
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
                         <p className="text-sm text-orange-600 dark:text-orange-400 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 rounded-md">
                            Could not parse history from JSON, or the `matchHistory` field is missing/null in the data.
                         </p>
                     ) : (
                       <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">No match history found in this game state.</p>
                     )}
                  </div>
                  
                  {/* Display Full Parsed Game State */} 
                  {parsedGameState && (
                     <div>
                       <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1 text-sm flex items-center gap-1.5">
                         <Database className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                         <span>Full Game State Object:</span>
                       </h4>
                       <ScrollArea className="h-60 border rounded-md dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                         <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                            {JSON.stringify(parsedGameState, null, 2)}
                         </pre>
                       </ScrollArea>
                     </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
} 