"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={5000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            className={cn(
              "bg-black/80 backdrop-blur-md border border-white/20 text-white rounded-lg shadow-lg",
              props.className
            )}
          >
            <div className="grid gap-1">
              {title && <ToastTitle className="text-white font-semibold">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-white/90">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose className="text-white/70 hover:text-white" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed top-0 left-0 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-[420px]" />
    </ToastProvider>
  )
}
