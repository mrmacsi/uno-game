"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type React from "react"

interface ConfirmationDialogProps {
  triggerButton: React.ReactNode // The button that opens the dialog
  title: string
  description: string
  confirmAction: () => void
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

export function ConfirmationDialog({
  triggerButton,
  title,
  description,
  confirmAction,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{triggerButton}</AlertDialogTrigger>
      <AlertDialogContent className="w-[90vw] max-w-md p-0 border-none bg-transparent shadow-none">
        <div className="rounded-xl border border-border bg-white p-6 shadow-xl dark:bg-gray-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-foreground">{title}</AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">{cancelText}</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={confirmAction} variant={isDestructive ? "destructive" : "default"} className={isDestructive ? "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800" : ""}>
                {confirmText}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
} 