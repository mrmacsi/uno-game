'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { applyIOSWorkarounds, isIOS } from '@/lib/browser-utils'

interface SafeHydrationProps {
  children: ReactNode
}

export default function SafeHydration({ children }: SafeHydrationProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    if (isIOS()) {
      console.log('iOS device detected, applying workarounds')
      applyIOSWorkarounds()
    }
  }, [])

  return mounted ? <>{children}</> : null
} 