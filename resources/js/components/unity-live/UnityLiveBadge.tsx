import { cn } from "@/lib/utils"

type UnityLiveBadgeProps = {
  className?: string
  size?: "sm" | "md"
}

export function UnityLiveBadge({ className, size = "sm" }: UnityLiveBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-red-500/90 font-semibold text-white shadow-sm backdrop-blur-sm",
        size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px] sm:text-xs",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  )
}
