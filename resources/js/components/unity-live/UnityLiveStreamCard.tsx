import { Link } from "@inertiajs/react"
import { Building2, Play, UserRound } from "lucide-react"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"
import UnityLiveOverlayLayer from "@/components/unity-live/UnityLiveOverlayLayer"
import { UnityLiveBadge } from "@/components/unity-live/UnityLiveBadge"
import { UnityLivePreviewIframe } from "@/components/unity-live/UnityLivePreviewIframe"
import {
  hostTypeLabel,
  type UnityLiveStreamItem,
} from "@/lib/unity-live-display"
import { useLiveSince } from "@/hooks/useLiveSince"
import { cn } from "@/lib/utils"

type UnityLiveStreamCardProps = {
  stream: UnityLiveStreamItem
  variant?: "grid" | "featured"
  className?: string
}

export function UnityLiveStreamCard({
  stream,
  variant = "grid",
  className,
}: UnityLiveStreamCardProps) {
  const liveSince = useLiveSince(stream.startedAt)
  const isFeatured = variant === "featured"

  return (
    <Link
      href={`/unity-live/${stream.slug}`}
      className={cn("group block min-w-0", className)}
    >
      <div
        className={cn(
          "overflow-hidden bg-black shadow-xl transition-all duration-300",
          isFeatured
            ? "rounded-2xl ring-2 ring-purple-500/30 hover:ring-purple-500/50 dark:ring-purple-400/25 dark:hover:ring-purple-400/40"
            : "rounded-xl ring-1 ring-neutral-200 hover:ring-purple-400/40 dark:ring-white/10 dark:hover:ring-purple-400/30",
        )}
      >
        <div
          className={cn(
            "relative w-full overflow-hidden bg-black",
            isFeatured ? "aspect-[21/9] sm:aspect-[2.4/1]" : "aspect-video",
          )}
        >
          <UnityLivePreviewIframe stream={stream} title={stream.title} />

          {/* Bottom gradient only — keep video visible while text stays readable */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[45%] bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm ring-1 ring-white/25">
              <Play className="h-7 w-7 fill-white text-white" />
            </span>
          </div>

          <div className="absolute left-3 top-3 z-20">
            <UnityLiveBadge size={isFeatured ? "md" : "sm"} />
          </div>
          {stream.overlay ? (
            <UnityLiveOverlayLayer overlay={stream.overlay} className="z-20" hideLiveBadge />
          ) : (
            <UnityMeetVideoLogoOverlay
              className={cn("z-20 origin-top-right", isFeatured ? "scale-100" : "scale-[0.85]")}
            />
          )}

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "line-clamp-2 font-semibold leading-tight text-white drop-shadow-md",
                    isFeatured ? "text-lg sm:text-2xl" : "text-sm sm:text-base",
                  )}
                >
                  {stream.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/90 sm:text-sm">
                  <span className="inline-flex max-w-[200px] items-center gap-1 truncate sm:max-w-none">
                    {stream.hostType === "organization" ? (
                      <Building2 className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    ) : (
                      <UserRound className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    )}
                    {stream.organizationName}
                  </span>
                  {liveSince ? (
                    <>
                      <span className="text-white/50">·</span>
                      <span className="text-white/80">{liveSince}</span>
                    </>
                  ) : null}
                </div>
              </div>
              {isFeatured ? (
                <span className="hidden shrink-0 items-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg sm:inline-flex">
                  Watch now
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {!isFeatured ? (
          <div className="border-t border-neutral-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-neutral-900/80 sm:px-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-purple-600 dark:text-purple-400">
              {hostTypeLabel(stream.hostType)}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  )
}
