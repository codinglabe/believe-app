import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function BpSectionHeader({
  step,
  title,
  description,
  icon: Icon,
  className,
}: {
  step?: string
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/15 to-blue-500/15 text-purple-600 dark:text-purple-400">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 space-y-1">
        {step && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            {step}
          </p>
        )}
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
