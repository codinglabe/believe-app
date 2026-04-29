"use client"

import type { LucideIcon } from "lucide-react"
import {
  Tag,
  BookOpen,
  HeartPulse,
  Leaf,
  PawPrint,
  HandHeart,
  CloudLightning,
  Users,
  Sprout,
  Building2,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CauseBadgeCause = {
  id: number
  name: string
  slug?: string
}

function pickCauseIcon(c: Pick<CauseBadgeCause, "name" | "slug">): LucideIcon {
  const key = `${c.slug ?? ""} ${c.name}`.toLowerCase()
  if (/(education|school|literacy|stem|youth)/.test(key)) return BookOpen
  if (/(health|medical|mental|hospital|wellness|care)/.test(key)) return HeartPulse
  if (/(environment|climate|sustain|green|planet|conservation)/.test(key)) return Leaf
  if (/(animal|wildlife|pets?|rescue)/.test(key)) return PawPrint
  if (/(poverty|hunger|food|housing|community|basic need)/.test(key)) return HandHeart
  if (/(disaster|emergency|fire|flood|hurricane|relief)/.test(key)) return CloudLightning
  if (/(veteran|military|service member)/.test(key)) return Shield
  if (/(children|family|community|social|human)/.test(key)) return Users
  if (/(faith|religion|spiritual|church|ministry)/.test(key)) return Building2
  if (/(agricult|farm|garden|food system)/.test(key)) return Sprout
  return Tag
}

type CauseBadgeProps = {
  c: CauseBadgeCause
  /** Renders as a button (e.g. directory popular causes). */
  onClick?: () => void
  selected?: boolean
}

/** Same violet pill as the Organizations directory Cause(s) column — span by default, button when clickable. */
export function CauseBadge({ c, onClick, selected }: CauseBadgeProps) {
  const Icon = pickCauseIcon(c)
  const className = cn(
    "inline-flex max-w-full items-start gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1 text-left text-xs font-medium leading-snug text-violet-900 dark:border-violet-500/40 dark:bg-slate-950/60 dark:text-violet-100",
    onClick &&
      "cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
    selected && "ring-2 ring-violet-500/50 ring-offset-1 ring-offset-white dark:ring-violet-400/45 dark:ring-offset-slate-950",
  )

  const inner = (
    <>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{c.name}</span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    )
  }

  return <span className={className}>{inner}</span>
}
