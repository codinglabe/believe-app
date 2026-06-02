import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import { ArrowLeft, Eye, Info } from "lucide-react"
import { UnityLiveBadge } from "@/components/unity-live/UnityLiveBadge"
import { cn } from "@/lib/utils"

type UnityLiveWatchHeaderProps = {
  showLiveBadge?: boolean
  title?: string
  viewerCount?: number
  trailing?: ReactNode
  actions?: ReactNode
  className?: string
}

export function UnityLiveWatchHeader({
  showLiveBadge = false,
  title,
  viewerCount,
  trailing,
  actions,
  className,
}: UnityLiveWatchHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/85",
        className,
      )}
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
      <div className="mx-auto flex min-h-14 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:min-h-16 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/unity-live"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-neutral-600 transition-colors hover:text-purple-700 dark:text-neutral-300 dark:hover:text-purple-300"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                Unity Live
              </span>
            </span>
          </Link>

          {showLiveBadge ? <UnityLiveBadge size="md" /> : null}

          {typeof viewerCount === "number" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
              <Eye className="h-3.5 w-3.5" />
              {viewerCount.toLocaleString()}
            </span>
          ) : null}

          {title ? (
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <h1 className="truncate text-sm font-semibold text-neutral-900 dark:text-white lg:text-base">{title}</h1>
              <Info className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
            </div>
          ) : null}

          {trailing}
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
