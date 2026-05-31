"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Clock, Loader2, RefreshCw, Share2, UserRound, Video } from "lucide-react"
import { router } from "@inertiajs/react"
import toast from "react-hot-toast"
import { useUnityLiveViewerStatus } from "@/hooks/useUnityLiveViewerStatus"
import GoingLiveOverlay from "@/components/unity-live/GoingLiveOverlay"
import StreamEndedOverlay from "@/components/unity-live/StreamEndedOverlay"
import { UnityLiveOtherStreamsSidebar } from "@/components/unity-live/UnityLiveOtherStreamsSidebar"
import { UnityLiveWatchHeader } from "@/components/unity-live/UnityLiveWatchHeader"
import {
  formatScheduledAt,
  type UnityLiveStreamItem,
} from "@/lib/unity-live-display"

interface LivestreamPreview {
  slug: string
  title: string
  organizationName: string
  status: string
  isPublic: boolean
  scheduledAt: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  preview: LivestreamPreview
  message: string
  hint?: string | null
  otherLivestreams: UnityLiveStreamItem[]
  broadcastChannel: string
}

export default function UnityLiveOffline({ seo, preview, message, hint, otherLivestreams, broadcastChannel }: Props) {
  const { phase, phaseLabel, statusMessage, statusHint, isGoingLive, streamEnded, endedMessage } =
    useUnityLiveViewerStatus(broadcastChannel, { initialStatus: preview.status })

  const displayMessage = isGoingLive
    ? "Going live now — the player will start automatically."
    : phase === "starting"
      ? statusMessage
      : message

  const displayHint = isGoingLive
    ? null
    : phase === "starting"
      ? statusHint
      : hint

  const showRefresh =
    !isGoingLive && (preview.status === "meeting_live" || preview.status === "scheduled" || phase === "starting")

  const scheduledLabel = formatScheduledAt(preview.scheduledAt)

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.share) {
        await navigator.share({ title: preview.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not share link")
    }
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? `${preview.title} | Unity Live`} description={seo?.description} />

      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <UnityLiveWatchHeader />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl ring-2 ring-purple-500/15 dark:border-white/10 dark:bg-neutral-900/60 dark:ring-purple-400/10">
                <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-5 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-purple-600/5 px-6 py-12 dark:from-purple-950/50 dark:via-blue-950/35 dark:to-neutral-950">
                  {streamEnded ? (
                    <StreamEndedOverlay message={endedMessage} />
                  ) : isGoingLive ? (
                    <GoingLiveOverlay />
                  ) : (
                    <>
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 ring-1 ring-purple-500/30">
                        {phase === "starting" ? (
                          <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div className="max-w-md space-y-2 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          {phaseLabel}
                        </p>
                        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white sm:text-2xl">
                          {displayMessage}
                        </h1>
                        {displayHint ? (
                          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                            {displayHint}
                          </p>
                        ) : null}
                      </div>
                    </>
                  )}
                  {showRefresh ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-purple-200 dark:border-purple-500/40"
                      onClick={() => router.visit(window.location.pathname, { preserveScroll: true })}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Check again
                    </Button>
                  ) : null}
                </div>

                <div className="border-t border-neutral-200 px-5 py-4 dark:border-white/10 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-neutral-900 dark:text-white sm:text-xl">
                        {preview.title}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                          {preview.organizationName}
                        </span>
                        {scheduledLabel ? (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {scheduledLabel}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-2 border-purple-500/30 text-purple-700 dark:border-purple-400/30 dark:text-purple-300"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <UnityLiveOtherStreamsSidebar streams={otherLivestreams} currentSlug={preview.slug} />
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
