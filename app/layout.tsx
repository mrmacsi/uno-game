import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "../styles/globals.css"
import "@/styles/animations.css"
import { ThemeProvider } from "next-themes"
import SafeHydration from "@/components/layout/safe-hydration"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'

// Better font loading with display swap
const fontSans = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap" 
})

// Metadata without viewport and themeColor
export const metadata: Metadata = {
  title: "UNO Online | Play Cards With Friends",
  description: "A modern, multiplayer UNO card game. Create rooms, invite friends, and enjoy the classic card game online.",
  keywords: ["UNO", "card game", "multiplayer", "online game", "Next.js"],
  authors: [{ name: "UNO Online Team" }],
  generator: 'v0.dev'
}

// Dedicated Viewport export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" }
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )} suppressHydrationWarning={true}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider 
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
            storageKey="uno-theme-preference"
            forcedTheme={undefined}
          >
            <SafeHydration>
              <div className="relative flex min-h-screen flex-col">
                {children}
              </div>
              <Toaster 
                richColors 
                position="top-right" 
                toastOptions={{ 
                  classNames: {
                    toast: 'p-0.5 border',
                    title: 'text-xs font-semibold',
                    description: 'text-[10px]',
                    closeButton: 'right-0.5 top-0.5 h-4 w-4',
                  },
                }}
              />
            </SafeHydration>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}