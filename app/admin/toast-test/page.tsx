"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from "@/components/ui/toast"

export default function ToastTestPage() {

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Toast Notification Test</h1>
      <p className="mb-4">Click the buttons below to test the toast notifications. All toasts will appear in the bottom-right and auto-dismiss after 5 seconds.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Column 1 */}
        <div className="flex flex-col space-y-2 items-start">
          <h2 className="text-lg font-semibold mb-2">Default Style</h2>
          <Button 
            onClick={() => {
              toast({
                title: "Event Scheduled",
                description: "Friday, February 10, 2023 at 5:57 PM",
              })
            }}
          >
            Show Default
          </Button>

          <Button 
            onClick={() => {
              toast({
                title: "Update Available",
                description: "A new version is ready to install.",
                action: <ToastAction altText="Upgrade">Upgrade</ToastAction>,
              })
            }}
          >
            Default with Action
          </Button>
        </div>

        {/* Column 2 */}
        <div className="flex flex-col space-y-2 items-start">
          <h2 className="text-lg font-semibold mb-2">Destructive Style</h2>
          <Button 
            variant="destructive"
            onClick={() => {
              toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "There was a problem with your request.",
              })
            }}
          >
            Show Destructive
          </Button>

          <Button 
            variant="destructive"
            onClick={() => {
              toast({
                variant: "destructive",
                title: "Action Failed",
                description: "Could not complete the operation.",
                action: <ToastAction altText="Try again">Try again</ToastAction>,
              })
            }}
          >
            Destructive with Action
          </Button>
        </div>

      </div>
    </div>
  )
} 