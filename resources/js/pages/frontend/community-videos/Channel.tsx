"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Play, Building2, ArrowLeft } from "lucide-react"

interface VideoItem {
  id: number
  slug: string
  title: string
  creator: string
  creatorAvatar: string | null
  thumbnail_url: string
  duration: string
  views: number
  views_formatted: string
  time_ago: string
  likes: number
}

interface Props {
  seo?: { title?: string; description?: string }
  channel: {
    slug: string
    name: string
    description: string | null
    avatar: string | null
    organization_slug: string | null
    total_videos: number
    total_views: number
  }
  videos: VideoItem[]
}

export default function CommunityVideosChannel({ seo, channel, videos }: Props) {
  const [activeTab, setActiveTab] = useState<"videos" | "about">("videos")

  const totalViewsFormatted =
    channel.total_views >= 1_000_000
      ? (channel.total_views / 1_000_000).toFixed(1) + "M"
      : channel.total_views >= 1_000
        ? (channel.total_views / 1_000).toFixed(1) + "K"
        : String(channel.total_views)

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? `${channel.name} - Community Videos`}
        description={seo?.description}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Back link */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link
              href="/community-videos"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Community Videos
            </Link>
          </div>
        </div>

        {/* Banner */}
        <div className="h-32 sm:h-36 md:h-44 w-full bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700" />

        {/* Channel header - avatar overlaps banner */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6 pb-6">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shrink-0 shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
              {channel.avatar && <AvatarImage src={channel.avatar} alt={channel.name} />}
              <AvatarFallback className="rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 text-2xl font-semibold">
                {channel.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pt-2 sm:pt-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {channel.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {channel.total_videos} video{channel.total_videos !== 1 ? "s" : ""} · {totalViewsFormatted} views
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium h-9 px-5 hover:opacity-90"
                  asChild
                >
                  <Link href={`/community-videos/channel/${channel.slug}`}>Subscribe</Link>
                </Button>
                {channel.organization_slug && (
                  <Button size="sm" variant="outline" className="rounded-full h-9 px-4" asChild>
                    <Link
                      href={`/organizations/${channel.organization_slug}`}
                      className="inline-flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      View organization
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTab("videos")}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "videos"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Videos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "about"
                  ? "border-purple-600 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              About
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === "videos" && (
            <>
              {videos.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No videos yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">This channel hasn’t uploaded any videos.</p>
                  <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white border-0" asChild>
                    <Link href="/community-videos">Browse Community Videos</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {videos.map((video) => (
                    <Link
                      key={video.id}
                      href={`/community-videos/watch/${video.slug}`}
                      className="group"
                    >
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                          {video.duration}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center">
                            <Play className="w-7 h-7 text-purple-600 ml-1 fill-purple-600" />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {video.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {video.views_formatted} views · {video.time_ago}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "about" && (
            <div className="max-w-2xl">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  About {channel.name}
                </h2>
                {channel.description ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {channel.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No description yet.
                  </p>
                )}
                {channel.organization_slug && (
                  <Button variant="outline" className="mt-6 rounded-full" asChild>
                    <Link href={`/organizations/${channel.organization_slug}`} className="inline-flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      View full organization profile
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}
