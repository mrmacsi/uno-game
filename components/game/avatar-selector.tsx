"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const avatars = [
  "Panda", "Tiger", "Eagle", "Wolf", "Lion", "Bear",
  "Shark", "Fox", "Rhino", "Sloth", "Kooula", "Dragon",
  "Deer", "Rabbit", "Falcon", "Dragon", "Knight", "Phoenix",
  "Player", "Gamer", "Hero", "Ranger", "Wärior", "Hunter",
]

const baseImageWidth = 952
const baseImageHeight = 800
const rows = 4
const columns = 6
const imageUrl = "https://nfjcunaepkauiowy.public.blob.vercel-storage.com/new-avatars-ZR3xelohwqTPDzmioWp6t5FDVFyXwy.png"

interface SelectedAvatarState { name: string; index: number }

// Animation variants (can potentially be removed if not used elsewhere in the simplified component)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1 }
}

export default function AvatarSelector() {
  const [selectedAvatar, setSelectedAvatar] = useState<SelectedAvatarState | null>(null)
  const [showGridOverlay, setShowGridOverlay] = useState(true)
  const [showImage, setShowImage] = useState(true)
  const gridContainerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerSize({ 
          width: entry.contentRect.width, 
          height: entry.contentRect.height 
        })
      }
    })

    if (gridContainerRef.current) {
      observer.observe(gridContainerRef.current)
      const { width, height } = gridContainerRef.current.getBoundingClientRect()
      setContainerSize({ width, height })
    }

    return () => observer.disconnect()
  }, [])

  const renderedAvatarWidth = containerSize.width / columns
  const renderedAvatarHeight = containerSize.height / rows

  const getPreviewCoordinates = (index: number) => {
    const baseAvatarWidth = baseImageWidth / columns
    const baseAvatarHeight = baseImageHeight / rows
    const baseAvatarSize = Math.min(baseAvatarWidth, baseAvatarHeight)
    const row = Math.floor(index / columns)
    const col = index % columns
    const offsetX = col * baseAvatarWidth
    const offsetY = row * baseAvatarHeight
    return { offsetX, offsetY, width: baseAvatarWidth, height: baseAvatarHeight, size: baseAvatarSize }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Card className="w-full max-w-4xl border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-center text-2xl font-semibold tracking-tight">Choose Your Avatar</CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center">
          <div className="mb-6 w-full flex justify-center items-center gap-3">
            <Button 
              onClick={() => setShowGridOverlay(!showGridOverlay)} 
              size="sm"
              variant="outline"
              className="px-3 py-1 text-xs"
            >
              {showGridOverlay ? 'Hide Grid' : 'Show Grid'}
            </Button>
            <Button 
              onClick={() => setShowImage(!showImage)} 
              size="sm"
              variant="outline"
              className="px-3 py-1 text-xs"
            >
              {showImage ? 'Hide Image' : 'Show Image'}
            </Button>
          </div>

          <div 
            ref={gridContainerRef}
            className="relative w-full aspect-[952/800] border border-gray-300 dark:border-gray-600 mb-6 shadow-inner overflow-hidden"
          >
            {showImage && (
              <img 
                src={imageUrl} 
                alt="Avatar Sprite Sheet" 
                className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                style={{ objectPosition: 'top left' }}
              />
            )}
            {showGridOverlay && containerSize.width > 0 && (
              <div className={`absolute top-0 left-0 w-full h-full ${!showImage ? 'bg-white dark:bg-gray-800' : ''}`}> 
                {Array.from({ length: rows * columns }).map((_, index) => {
                  const row = Math.floor(index / columns)
                  const col = index % columns
                  const x = col * renderedAvatarWidth
                  const y = row * renderedAvatarHeight

                  return (
                    <div
                      key={`grid-${index}`}
                      className={`absolute border border-black/50 flex items-center justify-center cursor-pointer transition-all duration-150 
                                  ${selectedAvatar?.index === index ? 'border-4 border-blue-500 z-10 box-content' : 'hover:bg-black/10 hover:dark:bg-white/10'}`}
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        width: `${renderedAvatarWidth}px`,
                        height: `${renderedAvatarHeight}px`,
                      }}
                      onClick={() => {
                        const name = avatars[index] ?? `Avatar ${index + 1}`
                        setSelectedAvatar({ name, index })
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {selectedAvatar && (
            <motion.div
              className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col items-center w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-lg font-medium mb-4">Selected: <span className="font-semibold">{selectedAvatar.name}</span></h3>
              <div
                className="relative overflow-hidden rounded-full shadow-md bg-gray-100 dark:bg-gray-800"
                style={{ width: `${getPreviewCoordinates(selectedAvatar.index).size}px`, height: `${getPreviewCoordinates(selectedAvatar.index).size}px` }}
              >
                <img
                  src={imageUrl}
                  alt={selectedAvatar.name}
                  className="absolute top-0 left-0 max-w-none"
                  style={{
                    width: `${baseImageWidth}px`,
                    height: `${baseImageHeight}px`,
                    objectFit: "none",
                    objectPosition: `-${getPreviewCoordinates(selectedAvatar.index).offsetX}px -${getPreviewCoordinates(selectedAvatar.index).offsetY}px`,
                    imageRendering: "pixelated"
                  }}
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
} 