"use client"

import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTransition } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"

export function LanguageToggle() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const changeLanguage = (locale: string) => {
    startTransition(() => {
      Cookies.set('NEXT_LOCALE', locale, { expires: 365 })
      router.refresh()
    })
  }

  const currentLocale = Cookies.get('NEXT_LOCALE') || 'en'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          disabled={isPending}
          className="w-8 h-8 sm:w-9 sm:h-9"
        >
          <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => changeLanguage('en')}
          className={currentLocale === 'en' ? 'bg-accent' : ''}
        >
          🇬🇧 English
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => changeLanguage('tr')}
          className={currentLocale === 'tr' ? 'bg-accent' : ''}
        >
          🇹🇷 Türkçe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

