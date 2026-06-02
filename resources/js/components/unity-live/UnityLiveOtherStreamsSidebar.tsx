import { Link } from "@inertiajs/react"
import { ArrowLeft, Radio, Sparkles } from "lucide-react"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"
import UnityLiveOverlayLayer from "@/components/unity-live/UnityLiveOverlayLayer"
import { UnityLiveBadge } from "@/components/unity-live/UnityLiveBadge"
import { UnityLivePreviewIframe } from "@/components/unity-live/UnityLivePreviewIframe"
import type { UnityLiveStreamItem } from "@/lib/unity-live-display"

type Props = {
  streams: UnityLiveStreamItem[]
  currentSlug?: string
  title?: string
}

export function UnityLiveOtherStreamsSidebar({
  streams,
  currentSlug,
  title = "Also live",
}: Props) {
  const visible = currentSlug
    ? streams.filter((s) => s.slug !== currentSlug)
    : streams

  return (
    <aside className="w-full shrink-0">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900/60">
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-gradient-to-r from-purple-600/5 to-blue-600/5 px-4 py-3.5 dark:border-white/10 dark:from-purple-950/30 dark:to-blue-950/20">
          <Sparkles className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</span>
        </div>
        <div className="p-3">
          <Link
            href="/unity-live"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/10"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to Unity Live
          </Link>

          {visible.length === 0 ? (
            <p className="px-3 py-5 text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              No other streams live right now. Browse Unity Live for new broadcasts.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {visible.map((stream) => (
                <Link
                  key={stream.id ?? stream.slug}
                  href={`/unity-live/${stream.slug}`}
                  className="group flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-2 transition-all hover:border-purple-400/40 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-black/20 dark:hover:border-purple-400/30 dark:hover:bg-white/5"
                >
                  <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black sm:w-32">
                    <UnityLivePreviewIframe stream={stream} title={stream.title} />
                    <div className="absolute left-1.5 top-1.5 z-20 origin-top-left scale-90">
                      <UnityLiveBadge />
                    </div>
                    {stream.overlay ? (
                      <UnityLiveOverlayLayer overlay={stream.overlay} className="z-20 scale-[0.55] origin-top-right" hideLiveBadge />
                    ) : (
                      <UnityMeetVideoLogoOverlay className="z-20 origin-top-right scale-[0.55]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-neutral-900 group-hover:text-purple-700 dark:text-white dark:group-hover:text-purple-300">
                      {stream.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {stream.organizationName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {visible.length > 0 ? (
            <Link
              href="/unity-live"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 py-2.5 text-xs font-medium text-neutral-600 transition-colors hover:border-purple-400/50 hover:text-purple-700 dark:border-white/15 dark:text-neutral-400 dark:hover:text-purple-300"
            >
              <Radio className="h-3.5 w-3.5" />
              View all live streams
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
