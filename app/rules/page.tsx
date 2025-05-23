"use client"

import Link from 'next/link';
import React from 'react';

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-900 text-white">
      <div className="container mx-auto p-4 sm:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">UNO Game Rules</h1>
        </header>

        <nav className="mb-8 text-center">
          <Link href="/" legacyBehavior>
            <a className="inline-block bg-white/20 dark:bg-gray-800/40 hover:bg-white/30 dark:hover:bg-gray-700/60 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
              &larr; Back to Home
            </a>
          </Link>
        </nav>

        <main className="space-y-8 bg-white/10 dark:bg-gray-950/20 backdrop-blur-md p-6 sm:p-8 rounded-xl shadow-lg border border-white/20 dark:border-gray-800/50">
          <section>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 border-b-2 border-white/30 pb-2">Objective</h2>
            <p className="text-base sm:text-lg leading-relaxed">
              The primary objective of UNO is to be the first player to get rid of all the cards in your hand. Points are scored by the winner based on the cards remaining in opponents' hands.
            </p>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 border-b-2 border-white/30 pb-2">Setup</h2>
            <p className="text-base sm:text-lg leading-relaxed">
              Each player is dealt 7 cards at the beginning of the game. The remaining cards are placed face down to form a draw pile. The top card of the draw pile is turned over to begin a discard pile.
            </p>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 border-b-2 border-white/30 pb-2">Gameplay</h2>
            <ul className="list-disc list-inside space-y-2 text-base sm:text-lg leading-relaxed">
              <li>Players take turns matching a card from their hand with the top card on the discard pile.</li>
              <li>Matching can be done by color, number, or symbol (for action cards).</li>
              <li>If a player does not have a playable card, they must draw one card from the draw pile. If the drawn card is playable, they can play it immediately. Otherwise, their turn ends.</li>
              <li>When a player has only one card left, they must shout "UNO!" to alert other players. If they fail to do so and are caught by another player before the next player takes their turn, they must draw two cards as a penalty.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 border-b-2 border-white/30 pb-2">Special Cards</h2>
            <div className="space-y-6">
              <div className="p-4 bg-white/5 dark:bg-gray-900/30 rounded-lg shadow">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-yellow-300 dark:text-yellow-400">Skip Card</h3>
                <p className="text-base sm:text-lg leading-relaxed">
                  When a Skip card is played, the next player in sequence loses their turn. If played at the beginning of the game (from the initial discard pile setup), the first player to start loses their turn.
                </p>
              </div>

              <div className="p-4 bg-white/5 dark:bg-gray-900/30 rounded-lg shadow">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-red-400 dark:text-red-500">Reverse Card</h3>
                <p className="text-base sm:text-lg leading-relaxed">
                  A Reverse card changes the direction of play. If play is currently moving clockwise, it will switch to counter-clockwise, and vice versa.
                </p>
                <p className="text-base sm:text-lg leading-relaxed mt-1">
                  In a 2-player game, a Reverse card acts like a Skip card; the other player misses a turn.
                </p>
              </div>

              <div className="p-4 bg-white/5 dark:bg-gray-900/30 rounded-lg shadow">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-green-400 dark:text-green-500">Draw Two Card (+2)</h3>
                <p className="text-base sm:text-lg leading-relaxed">
                  When a Draw Two card is played, the next player must draw two cards from the draw pile and lose their turn. This card can only be played on a card of the same color or another Draw Two card.
                </p>
              </div>

              <div className="p-4 bg-white/5 dark:bg-gray-900/30 rounded-lg shadow">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-purple-400 dark:text-purple-500">Wild Card</h3>
                <p className="text-base sm:text-lg leading-relaxed">
                  A Wild card can be played on any card, regardless of color or number. When playing a Wild card, the player who plays it chooses the color that will continue play.
                </p>
              </div>

              <div className="p-4 bg-white/5 dark:bg-gray-900/30 rounded-lg shadow">
                <h3 className="text-xl sm:text-2xl font-semibold mb-2 text-pink-400 dark:text-pink-500">Wild Draw Four Card (+4)</h3>
                <p className="text-base sm:text-lg leading-relaxed">
                  A Wild Draw Four card allows the player to change the current color and forces the next player to draw four cards from the draw pile and lose their turn.
                </p>
                <p className="text-base sm:text-lg leading-relaxed mt-1">
                  However, this card can only be played if the player holding it does not have any other card in their hand that matches the *color* of the card on the discard pile. If played illegally, the player may be challenged and forced to draw cards if caught. If the card is played legally, the challenger must draw additional penalty cards.
                </p>
              </div>
            </div>
          </section>
          
          <section className="text-center mt-10">
             <Link href="/" legacyBehavior>
                <a className="inline-block bg-white/20 dark:bg-gray-800/40 hover:bg-white/30 dark:hover:bg-gray-700/60 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                  &larr; Back to Home
                </a>
            </Link>
          </section>

        </main>
        <footer className="text-center mt-8 pb-4">
          <p className="text-sm text-white/70">&copy; {new Date().getFullYear()} UNO Online. Have Fun!</p>
        </footer>
      </div>
    </div>
  );
}
