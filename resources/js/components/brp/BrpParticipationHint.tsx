"use client"

import { Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type BrpParticipationModuleKey,
  brpEarnMessage,
  formatBrpPoints,
} from "@/lib/brp-participation"
import { useBrpParticipation } from "@/hooks/use-brp-participation"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BrpParticipationHintProps {
  module: BrpParticipationModuleKey
  variant?: "inline" | "alert" | "badge"
  className?: string
  /** Override the default earn message */
  message?: string
  /** Hide module label in the default message */
  hideLabel?: boolean
}

export default function BrpParticipationHint({
  module,
  variant = "inline",
  className,
  message,
  hideLabel = false,
}: BrpParticipationHintProps) {
  const { enabled, award, label } = useBrpParticipation(module)

  if (!enabled || award <= 0) {
    return null
  }

  const text =
    message ??
    brpEarnMessage(award, hideLabel ? undefined : label)

  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
          className,
        )}
      >
        <Gift className="h-3 w-3 shrink-0" aria-hidden />
        +{formatBrpPoints(award)} BRP
      </span>
    )
  }

  if (variant === "alert") {
    return (
      <Alert
        className={cn(
          "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-900/20",
          className,
        )}
      >
        <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <AlertDescription className="text-emerald-900 dark:text-emerald-100">
          {text}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300",
        className,
      )}
    >
      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <span>{text}</span>
    </p>
  )
}
