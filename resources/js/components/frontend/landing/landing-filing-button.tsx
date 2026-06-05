"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { LandingFilingModal } from "./landing-filing-modal"
import { landingTheme } from "./landing-theme"
import { cn } from "@/lib/utils"

type LandingFilingButtonProps = {
  className?: string
  /** hero = hero row (matches Get Started height); compact = legacy; outline = final CTA */
  variant?: "hero" | "compact" | "outline"
}

export function LandingFilingButton({ className, variant = "compact" }: LandingFilingButtonProps) {
  const [open, setOpen] = useState(false)

  const buttonClass =
    variant === "hero"
      ? cn(
          "inline-flex w-auto shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-purple-600/80 bg-white px-3 text-purple-700 shadow-sm transition hover:border-purple-600 hover:bg-purple-50 sm:gap-2 sm:px-5 dark:border-purple-500/40 dark:bg-white/5 dark:text-purple-200 dark:hover:bg-white/10",
          landingTheme.heroBtnHeight,
          landingTheme.heroBtnText,
        )
      : variant === "compact"
        ? "inline-flex w-auto shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-purple-600/80 bg-white px-3 py-2.5 text-xs font-semibold text-purple-700 shadow-sm transition hover:border-purple-600 hover:bg-purple-50 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm dark:border-purple-500/40 dark:bg-white/5 dark:text-purple-200 dark:hover:bg-white/10"
        : "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-purple-600 bg-white/80 px-6 py-3 text-sm font-semibold text-purple-700 transition hover:border-purple-700 hover:bg-purple-50 sm:w-auto sm:px-8 sm:py-3.5 sm:text-base dark:border-white/60 dark:bg-transparent dark:text-white dark:hover:border-white dark:hover:bg-white/10"

  const iconClass =
    variant === "hero"
      ? cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white", landingTheme.heroBtnIcon)
      : "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white"

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(buttonClass, className)}>
        <span className={iconClass}>
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
        501c3ers Filing
      </button>
      <LandingFilingModal open={open} onOpenChange={setOpen} />
    </>
  )
}
