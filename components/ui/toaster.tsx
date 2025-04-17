"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,

} from "@/components/ui/toast"

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useState } from "react"

export function Toaster() {
  const { toasts } = useToast()
  const [historyOpen, setHistoryOpen] = useState(false)

  const sortedToasts = [...toasts].reverse()
  const latestToast = sortedToasts.length > 0 ? [sortedToasts[0]] : []
  const hasHistory = sortedToasts.length > 1

  return (
    <ToastProvider>
      <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-end p-2 space-y-1 max-h-32 overflow-y-auto sm:items-end sm:right-0 sm:left-auto sm:top-0 sm:max-w-[360px]">
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
          <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
            <PopoverTrigger asChild>
              <button className="mt-2 px-3 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => setHistoryOpen(true)}>
                See History
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-h-96 overflow-y-auto w-80">
              <div className="flex flex-col gap-2">
                {sortedToasts.slice(1).map(({ id, title, description, action, ...props }) => (
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
            </PopoverContent>
          </Popover>
        )}
      </div>
    </ToastProvider>
  )
}
