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
    
    const savedTheme = localStorage.getItem('uno-theme-preference')
    if (savedTheme) {
      document.documentElement.classList.remove('light', 'dark')
      if (savedTheme !== 'system') {
        document.documentElement.classList.add(savedTheme)
      } else {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.classList.add(systemTheme)
      }
    }
  }, [])

  return mounted ? <>{children}</> : null
} 