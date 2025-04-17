"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle
} from "@/components/ui/toast"

import { useState } from "react"

export function Toaster() {
  const { toasts } = useToast()
  const sortedToasts = [...toasts].reverse()
  const latestToast = sortedToasts.length > 0 ? [sortedToasts[0]] : []
  const hasHistory = sortedToasts.length > 1
  const [showHistory, setShowHistory] = useState(false)

  return (
    <ToastProvider>
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-end p-2 max-h-32 sm:items-end sm:right-0 sm:left-auto sm:top-0 sm:max-w-[360px]">
        {latestToast.map(({ id, title, description, action, ...props }) => (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        ))}
        {hasHistory && (
          <button
            className="mt-2 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => setShowHistory(true)}
          >
            See History
          </button>
        )}
        {showHistory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded shadow-lg max-h-96 w-80 overflow-y-auto p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Toast History</span>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowHistory(false)}>
                  Close
                </button>
              </div>
              {sortedToasts.map(({ id, title, description, action, ...props }) => (
                <Toast key={id} {...props}>
                  <div className="grid gap-1">
                    {title && <ToastTitle>{title}</ToastTitle>}
                    {description && (
                      <ToastDescription>{description}</ToastDescription>
                    )}
                  </div>
                  {action}
                </Toast>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  )
}
