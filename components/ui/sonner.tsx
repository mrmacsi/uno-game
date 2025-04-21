"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps as SonnerProps } from "sonner"
import { cva, type VariantProps } from "class-variance-authority"

const toastVariants = cva(
  "group toast rounded-md shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5", // Add base structural styles
  {
    variants: {
      size: {
        sm: "p-3 text-xs", // Reduced padding and font size
        md: "p-4 text-sm", // Default sonner padding seems to be p-4, standard text
        lg: "p-6 text-base", // Larger padding and base text size
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

type ToasterProps = SonnerProps & VariantProps<typeof toastVariants>

const Toaster = ({ size, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as SonnerProps["theme"]}
      className="toaster group" // Base className for the container if needed
      toastOptions={{
        classNames: {
          toast: toastVariants({ size }), // Apply size variants to individual toasts
          // You can add other classNames here if needed (e.g., title, description)
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
