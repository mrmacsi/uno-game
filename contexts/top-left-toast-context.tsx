"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface ToastState {
  id: string;
  isOpen: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
}

interface TopLeftToastContextType {
  showToast: (options: { title: React.ReactNode; description?: React.ReactNode; duration?: number }) => void;
  toastState: ToastState | null;
  hideToast: (id: string) => void; // Expose hideToast
}

const TopLeftToastContext = createContext<TopLeftToastContextType | undefined>(undefined);

let toastCount = 0;

export function TopLeftToastProvider({ children }: { children: ReactNode }) {
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const hideToast = useCallback((id: string) => {
    setToastState(current => (current?.id === id ? { ...current, isOpen: false } : current));
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    // Add a delay before clearing state to allow for fade-out animation
    setTimeout(() => {
       setToastState(current => current?.id === id ? null : current)
    }, 500); // Adjust delay based on animation duration

  }, [timeoutId]);

  const showToast = useCallback(({ title, description, duration = 3000 }: { title: React.ReactNode; description?: React.ReactNode; duration?: number }) => {
    // If a toast is already showing, hide it first
    if (toastState?.isOpen && timeoutId) {
      clearTimeout(timeoutId);
    }
    
    const newId = `top-left-toast-${toastCount++}`;
    setToastState({ id: newId, isOpen: true, title, description });

    const newTimeoutId = setTimeout(() => {
      hideToast(newId);
    }, duration);
    setTimeoutId(newTimeoutId);

  }, [hideToast, toastState, timeoutId]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <TopLeftToastContext.Provider value={{ showToast, toastState, hideToast }}>
      {children}
    </TopLeftToastContext.Provider>
  );
}

export function useTopLeftToast() {
  const context = useContext(TopLeftToastContext);
  if (context === undefined) {
    throw new Error('useTopLeftToast must be used within a TopLeftToastProvider');
  }
  return context;
} 