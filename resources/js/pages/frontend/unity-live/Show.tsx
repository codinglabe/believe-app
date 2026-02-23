"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link } from "@inertiajs/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { ArrowLeft, Loader2, Play, ListVideo, Radio } from "lucide-react"

interface LivestreamItem {
  id: number
  slug: string
  title: string
  organizationName: string
  viewUrl: string
  viewUrlFallback: string
  startedAt: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  livestream: LivestreamItem
  otherLivestreams: LivestreamItem[]
}

export default function UnityLiveShow({ seo, livestream, otherLivestreams }: Props) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? livestream.title + " | Unity Live"}
        description={seo?.description}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section — matches logo text gradient (from-purple-600 to-blue-600) */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/unity-live"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-medium">All live</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Radio className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold line-clamp-2 leading-tight">
                  {livestream.title}
                </h1>
                <p className="text-purple-100 text-sm md:text-base mt-0.5">
                  {livestream.organizationName} · Unity Live
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main — player + info card */}
            <div className="flex-1 min-w-0">
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <div className="aspect-video w-full bg-black relative">
                  <iframe
                    key={livestream.slug}
                    src={livestream.viewUrl}
                    title={livestream.title}
                    allow="autoplay"
                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                    onLoad={() => setIsLoading(false)}
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/95 text-white pointer-events-none">
                      <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 text-purple-500 animate-spin" aria-hidden />
                      <span className="text-sm font-medium">Loading stream…</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-purple-600 hover:bg-purple-600 text-white border-0 gap-1.5 px-2.5 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live
                    </span>
                    <span aria-hidden>·</span>
                    <span>Unity Live</span>
                  </div>
                  <div className="flex items-center gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm">
                      {livestream.organizationName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                        {livestream.organizationName}
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Organization</p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Sidebar — Menu */}
            <aside className="w-full lg:w-72 xl:w-80 shrink-0">
              <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <CardHeader className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-row items-center gap-2 space-y-0">
                  <ListVideo className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                    Menu
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Link
                    href="/unity-live"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Radio className="h-4 w-4 shrink-0" />
                    <span>All live</span>
                  </Link>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-4 mb-2 px-3">
                    Other live streams
                  </p>
                  {otherLivestreams.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">
                      No other streams live right now
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {otherLivestreams.map((stream) => (
                        <Link
                          key={stream.slug}
                          href={`/unity-live/${stream.slug}`}
                          className="flex gap-2.5 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                        >
                          <div className="relative w-24 sm:w-28 aspect-video rounded-md bg-black shrink-0 overflow-hidden">
                            <iframe
                              src={stream.viewUrl}
                              title={stream.title}
                              allow="autoplay"
                              className="absolute inset-0 w-full h-full border-0 pointer-events-none z-0 scale-[1.02]"
                            />
                            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                              <Play className="h-5 w-5 text-white/60 drop-shadow-md" />
                            </div>
                            <div className="absolute bottom-0.5 left-0.5 z-10">
                              <Badge className="bg-purple-600 hover:bg-purple-600 text-white border-0 text-[10px] px-1.5 py-0 h-4">
                                LIVE
                              </Badge>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 py-0.5">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight">
                              {stream.title}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                              {stream.organizationName}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
