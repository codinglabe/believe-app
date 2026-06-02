"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { uliveRewardCardThemes } from "@/lib/unity-live-theme"

type CardTheme = (typeof uliveRewardCardThemes)[number]

type Props = {
  theme: CardTheme
  children: ReactNode
  className?: string
}

/** Dark card shell shared by Earn Rewards grid and below-player banners. */
export function UnityLiveGridCard({ theme, children, className }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-neutral-950 shadow-lg",
        theme.border,
        className,
      )}
    >
      <div
        className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", theme.glow)}
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}

export function UnityLiveGridCardButton({
  theme,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { theme: CardTheme }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm",
        theme.button,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
