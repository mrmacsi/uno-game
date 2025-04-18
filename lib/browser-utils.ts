'use client'

export function isIOS() {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

export function isSafari() {
  if (typeof window === 'undefined') return false
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  return userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1
}

export function applyIOSWorkarounds() {
  if (!isIOS()) return
  
  // iOS-specific workarounds can be added here
  // For example, add additional event listeners, fix viewport issues, etc.
  
  // Fix for potential Safari scrolling issues
  document.documentElement.style.height = '100%'
  document.body.style.height = '100%'
  document.body.style.overflow = 'auto'
  document.body.style['WebkitOverflowScrolling' as any] = 'touch'
} 