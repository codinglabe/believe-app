import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import { ArrowLeft } from "lucide-react"
import { UnityLiveBadge } from "@/components/unity-live/UnityLiveBadge"
import { cn } from "@/lib/utils"

type UnityLiveWatchHeaderProps = {
  showLiveBadge?: boolean
  trailing?: ReactNode
  className?: string
}

export function UnityLiveWatchHeader({
  showLiveBadge = false,
  trailing,
  className,
}: UnityLiveWatchHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/85",
        className,
      )}
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/unity-live"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-purple-700 dark:text-neutral-300 dark:hover:text-purple-300"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
              Unity Live
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          {trailing}
          {showLiveBadge ? <UnityLiveBadge size="md" /> : null}
        </div>
      </div>
    </header>
  )
}
