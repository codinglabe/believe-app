"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link, router } from "@inertiajs/react"
import { Button } from "@/components/frontend/ui/button"
import { ArrowLeft, Clock, Loader2, Radio, RefreshCw, Video } from "lucide-react"
import { useUnityLiveViewerStatus } from "@/hooks/useUnityLiveViewerStatus"
import GoingLiveOverlay from "@/components/unity-live/GoingLiveOverlay"
import StreamEndedOverlay from "@/components/unity-live/StreamEndedOverlay"

interface LivestreamPreview {
  slug: string
  title: string
  organizationName: string
  status: string
  isPublic: boolean
  scheduledAt: string | null
}

interface LivestreamItem {
  id: string
  slug: string
  title: string
  organizationName: string
  viewUrl: string
  viewUrlMuted?: string
}

interface Props {
  seo?: { title?: string; description?: string }
  preview: LivestreamPreview
  message: string
  hint?: string | null
  otherLivestreams: LivestreamItem[]
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

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? `${preview.title} | Unity Live`}
        description={seo?.description}
      />
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 dark:border-white/10 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <Link
                href="/unity-live"
                className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                All live
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900/60 shadow-lg overflow-hidden">
                <div className="aspect-video w-full relative flex flex-col items-center justify-center gap-5 px-6 py-12 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-600/5 dark:from-purple-950/40 dark:via-blue-950/30 dark:to-neutral-950">
                  {streamEnded ? (
                    <StreamEndedOverlay message={endedMessage} />
                  ) : isGoingLive ? (
                    <GoingLiveOverlay />
                  ) : (
                    <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 ring-1 ring-purple-500/30">
                    {phase === "starting" ? (
                      <Loader2 className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" />
                    ) : (
                      <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div className="text-center max-w-md space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      {phaseLabel}
                    </p>
                    <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white">
                      {displayMessage}
                    </h1>
                    {displayHint ? (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
                <div className="px-5 py-4 border-t border-neutral-200 dark:border-white/10">
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-white truncate">
                    {preview.title}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {preview.organizationName}
                  </p>
                  {preview.scheduledAt ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <Clock className="h-3.5 w-3.5" />
                      Scheduled: {new Date(preview.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="w-full lg:w-72 xl:w-80 shrink-0">
              <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900/50 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/10 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-neutral-500 shrink-0" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">Live now</span>
                </div>
                <div className="p-3">
                  <Link
                    href="/unity-live"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <Radio className="h-4 w-4 shrink-0" />
                    Browse all live
                  </Link>
                  {otherLivestreams.length === 0 ? (
                    <p className="text-xs text-neutral-500 px-3 py-4">Nothing else live right now</p>
                  ) : (
                    <div className="flex flex-col gap-2 mt-3">
                      {otherLivestreams.map((stream) => (
                        <Link
                          key={stream.id}
                          href={`/unity-live/${stream.slug}`}
                          className="block p-2.5 rounded-lg border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/10 text-sm font-medium text-neutral-900 dark:text-white line-clamp-2"
                        >
                          {stream.title}
                          <span className="block text-xs font-normal text-neutral-500 mt-0.5">
                            {stream.organizationName}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
