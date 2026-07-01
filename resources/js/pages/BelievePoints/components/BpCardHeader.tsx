import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { BpSectionHeader } from "./BpSectionHeader"

/** Shared card shell for Believe Points page sections. */
export const bpCardClassName =
  "gap-0 overflow-hidden rounded-xl border border-border/60 p-0 shadow-sm"

/** Shared content padding for Believe Points cards. */
export const bpCardContentClassName = "px-4 py-5 sm:px-6"

export function BpCardHeader({
  step,
  title,
  description,
  icon,
  trailing,
  className,
}: {
  step?: string
  title: string
  description?: string
  icon?: LucideIcon
  trailing?: ReactNode
  className?: string
}) {
  return (
    <CardHeader
      className={cn(
        "relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-purple-500/[0.06] via-card to-blue-500/[0.06] px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600" aria-hidden />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-600/10 to-blue-600/5 blur-2xl"
        aria-hidden
      />
      <div className="relative">
        {trailing ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <BpSectionHeader step={step} title={title} description={description} icon={icon} />
            <div className="shrink-0">{trailing}</div>
          </div>
        ) : (
          <BpSectionHeader step={step} title={title} description={description} icon={icon} />
        )}
      </div>
    </CardHeader>
  )
}
