import type React from "react"
import type { Metadata } from "next"
import { Inter as FontSans } from "next/font/google"
import "@/styles/globals.css"
import "@/styles/animations.css"
import { ThemeProvider } from "@/components/theme-provider"
import SafeHydration from "@/components/safe-hydration"
import { cn } from "@/lib/utils"

// Better font loading with display swap
const fontSans = FontSans({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap" 
})

export const metadata: Metadata = {
  title: "UNO Online | Play Cards With Friends",
  description: "A modern, multiplayer UNO card game. Create rooms, invite friends, and enjoy the classic card game online.",
  keywords: ["UNO", "card game", "multiplayer", "online game", "Next.js"],
  authors: [{ name: "UNO Online Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" }
  ],
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SafeHydration>
            <div className="relative flex min-h-screen flex-col">
              {children}
            </div>
          </SafeHydration>
        </ThemeProvider>
      </body>
    </html>
  )
}