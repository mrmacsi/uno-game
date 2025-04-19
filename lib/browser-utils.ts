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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  document.body.style['WebkitOverflowScrolling' as any] = 'touch'
}

export const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(";");
  for(let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      // Does this cookie string begin with the name we want?
      if (part.startsWith(name + "=")) {
          try {
              return decodeURIComponent(part.substring(name.length + 1));
          } catch (e) {
              console.error("Error decoding cookie part:", part, e);
              return ""; // Return empty string on decode error
          }
      }
  }
  return "";
};

// Utility to copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!navigator.clipboard) {
    console.warn('Clipboard API not available');
    // Fallback for older browsers (less reliable)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed'; // Prevent scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: unknown) {
      console.error('Fallback copy failed:', err);
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: unknown) {
    console.error('Async clipboard copy failed:', err);
    return false;
  }
};

// Function to detect if the user is likely on a mobile device
export const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false; 
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Prevent body scroll
export const preventBodyScroll = (prevent: boolean): void => {
  if (typeof document === 'undefined') return;
  if (prevent) {
    document.body.style.overflow = 'hidden';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document.body.style as any)['WebkitOverflowScrolling'] = 'none'; 
  } else {
    document.body.style.overflow = 'auto';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document.body.style as any)['WebkitOverflowScrolling'] = 'touch'; 
  }
}; 