import { Mail } from "lucide-react"
import { cn } from "@/lib/utils"

type EmailCreditsBadgeProps = {
  emailsLeft: number
  size?: "sm" | "md"
  compact?: boolean
  className?: string
}

export default function EmailCreditsBadge({
  emailsLeft,
  size = "md",
  compact = false,
  className,
}: EmailCreditsBadgeProps) {
  const isEmpty = emailsLeft <= 0
  const isLow = !isEmpty && emailsLeft < 10

  const iconBox =
    size === "sm" ? "h-5 w-5" : "h-6 w-6"
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
  const countText = size === "sm" ? "text-xs" : "text-sm"
  const labelText = size === "sm" ? "text-[10px]" : "text-xs"
  const leftLabel = compact
    ? "left"
    : emailsLeft === 1
      ? "credit left"
      : "credits left"

  return (
    <div
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border py-0.5 shadow-sm transition-colors duration-300",
        compact ? "px-1.5" : "px-2",
        size === "md" && !compact && "px-2.5 py-1",
        isEmpty
          ? "border-destructive/25 bg-destructive/5 dark:bg-destructive/10"
          : isLow
            ? "border-amber-300/70 bg-amber-50/90 dark:border-amber-500/35 dark:bg-amber-950/35"
            : "border-purple-200/80 bg-gradient-to-r from-purple-50/95 to-blue-50/95 dark:border-purple-500/30 dark:from-purple-950/50 dark:to-blue-950/40",
        className
      )}
      title={`${emailsLeft.toLocaleString()} email credit${emailsLeft === 1 ? "" : "s"} remaining`}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full text-white shadow-sm",
          iconBox,
          isEmpty
            ? "bg-muted-foreground/50"
            : isLow
              ? "bg-gradient-to-br from-amber-500 to-orange-600"
              : "bg-gradient-to-br from-purple-600 to-blue-600"
        )}
      >
        <Mail className={iconSize} aria-hidden />
      </span>
      <span className="flex min-w-0 items-baseline gap-1 tabular-nums leading-none">
        <span
          className={cn(
            "shrink-0 font-bold tracking-tight transition-all duration-300",
            countText,
            isEmpty
              ? "text-muted-foreground"
              : isLow
                ? "text-amber-800 dark:text-amber-200"
                : "bg-gradient-to-r from-purple-700 to-blue-700 bg-clip-text text-transparent dark:from-purple-300 dark:to-blue-300"
          )}
        >
          {emailsLeft.toLocaleString()}
        </span>
        <span
          className={cn(
            "truncate font-medium text-muted-foreground",
            labelText
          )}
        >
          {leftLabel}
        </span>
      </span>
    </div>
  )
}
