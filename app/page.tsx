"use client"

import { Button } from "@/components/ui/button"
import React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link"
import RoomList from "@/components/room-list"
import { PlusCircle, LogIn, ArrowRight } from "lucide-react"

export default function Home() {
  // Default room ID that's always available
  const defaultRoomId = "DEFAULT"

  return (
    <main className="min-h-screen flex flex-col items-center bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 p-2 sm:p-4 md:p-8">
      <div className="w-full max-w-4xl mx-auto my-2 sm:my-8">
        <div className="backdrop-blur-sm bg-white/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="px-4 pt-8 pb-4 sm:px-12 sm:pt-12 sm:pb-6">
            <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
              <Link href="/" className="text-2xl sm:text-3xl font-bold text-gray-800 hover:text-red-600 transition-colors">UNO</Link>
              <ThemeToggle />
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">UNO</h1>
            <p className="mt-2 sm:mt-3 text-gray-600 text-base sm:text-lg">Play the classic card game online with friends</p>
          </div>
          <div className="flex-grow px-2 sm:px-12 pb-4 sm:pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              <div className="space-y-4">
                <h2 className="font-bold text-lg sm:text-xl text-gray-800 mb-2 sm:mb-4">Quick Actions</h2>
                <div className="space-y-3 stagger-fade-in-up">
                  <Link href="/create-room" className="w-full block">
                    <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 sm:py-5 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-base">
                      <PlusCircle className="h-5 w-5" />
                      Create New Room
                    </Button>
                  </Link>
                  <Link href="/join-room" className="w-full block">
                    <Button variant="outline" className="w-full py-4 sm:py-5 rounded-xl shadow-sm transition-all duration-200 border-2 hover:bg-gray-100 flex items-center justify-center gap-2 text-base">
                      <LogIn className="h-5 w-5" />
                      Join Room with Code
                    </Button>
                  </Link>
                  <div className="relative py-3 sm:py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white/90 px-3 sm:px-4 text-xs sm:text-sm text-gray-500">or join public room</span>
                    </div>
                  </div>
                  <Link href={`/join-room?roomId=${defaultRoomId}`} className="w-full block">
                    <Button variant="secondary" className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 sm:py-4 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center text-base">
                      Join Default Room
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-500 text-center">
                    A public room that&apos;s always available for quick play
                  </p>
                </div>
              </div>
              <div className="animate-fade-in-up">
                <RoomList />
              </div>
            </div>
          </div>
          <div className="px-4 sm:px-8 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-500 w-full mt-auto border-t border-gray-200">
            <p>Built with love in London</p>
          </div>
        </div>
      </div>
    </main>
  )
}