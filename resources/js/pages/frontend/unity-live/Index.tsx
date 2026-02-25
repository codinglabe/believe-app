"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { Radio } from "lucide-react"

interface LivestreamItem {
  id: number
  slug: string
  title: string
  organizationName: string
  viewUrl: string
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section — matches logo text gradient (from-purple-600 to-blue-600) */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Radio className="h-8 w-8" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                Unity Live
              </h1>
              <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto">
                Watch live streams from organizations on Believe
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {livestreams.length === 0 ? (
            <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <Radio className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No live streams right now
                </CardTitle>
                <CardDescription className="text-base">
                  Check back later to watch organizations go live.
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Live now ({livestreams.length})
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {livestreams.map((stream) => (
                  <Link key={stream.slug} href={`/unity-live/${stream.slug}`} className="group block">
                    <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg hover:border-purple-500/30 transition-all duration-300 h-full">
                      <div className="relative aspect-video w-full bg-black overflow-hidden">
                        <iframe
                          src={stream.viewUrl}
                          title={stream.title}
                          allow="autoplay"
                          className="absolute inset-0 w-full h-full border-0 pointer-events-none z-0 scale-[1.02]"
                        />
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20 group-hover:bg-black/10 transition-colors">
                          <Radio className="h-12 w-12 text-white/60 group-hover:text-white/80 drop-shadow-lg transition-colors" />
                        </div>
                        <div className="absolute top-3 left-3 z-10">
                          <Badge className="bg-purple-600 hover:bg-purple-600 text-white border-0 gap-1.5 px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-black/70 text-white text-xs font-medium px-2.5 py-1 rounded-md">
                            Watch
                          </span>
                        </div>
                      </div>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {stream.title}
                        </CardTitle>
                        <CardDescription className="text-sm line-clamp-1 mt-0.5">
                          {stream.organizationName}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}
