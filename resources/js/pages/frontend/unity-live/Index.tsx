"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link } from "@inertiajs/react"
import { Radio, Play } from "lucide-react"

interface LivestreamItem {
  id: number
  slug: string
  title: string
  organizationName: string
  viewUrl: string
  viewUrlMuted?: string
  viewUrlFallback?: string
  startedAt: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  livestreams: LivestreamItem[]
}

export default function UnityLiveIndex({ seo, livestreams }: Props) {
  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? "Unity Live"}
        description={seo?.description}
      />
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Compact header */}
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 dark:border-white/10 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-200 dark:bg-white/10">
                  <Radio className="h-5 w-5 text-neutral-700 dark:text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">Unity Live</h1>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Watch live from organizations</p>
                </div>
              </div>
              {livestreams.length > 0 && (
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Live now ({livestreams.length})
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {livestreams.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900/50 overflow-hidden shadow-sm">
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 mb-4">
                  <Radio className="h-8 w-8 text-neutral-500" />
                </div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                  No live streams right now
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
                  Check back later to watch organizations go live.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {livestreams.map((stream) => (
                <Link
                  key={stream.slug}
                  href={`/unity-live/${stream.slug}`}
                  className="group block"
                >
                  <div className="rounded-xl overflow-hidden bg-black shadow-xl ring-1 ring-neutral-200 dark:ring-white/10 hover:ring-neutral-300 dark:hover:ring-white/20 transition-all duration-300 h-full">
                    <div className="relative aspect-video w-full overflow-hidden">
                      <iframe
                        src={stream.viewUrlMuted ?? stream.viewUrl}
                        title={stream.title}
                        allow="autoplay"
                        className="absolute inset-0 w-full h-full border-0 pointer-events-none z-0 scale-[1.02]"
                      />
                      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20 group-hover:bg-black/10 transition-colors">
                        <Play className="h-12 w-12 text-white/60 group-hover:text-white/80 drop-shadow-lg transition-colors" />
                      </div>
                      <div className="absolute top-3 left-3 z-10">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          LIVE
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/70 text-white text-xs font-medium px-2.5 py-1 rounded-md">
                          Watch
                        </span>
                      </div>
                    </div>
                    <div className="p-4 border-t border-neutral-200 bg-white dark:border-white/10 dark:bg-transparent">
                      <h3 className="text-base font-semibold text-neutral-900 dark:text-white line-clamp-2 leading-tight group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                        {stream.title}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                        {stream.organizationName}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}
