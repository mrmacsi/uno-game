import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/styles/globals.css"
import "@/styles/animations.css"
import { ThemeProvider } from "@/components/theme-provider"
import SafeHydration from "@/components/safe-hydration"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Uno Online Game",
  description: "A multiplayer Uno card game built with Next.js",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SafeHydration>
            {children}
          </SafeHydration>
        </ThemeProvider>
      </body>
    </html>
  )
}