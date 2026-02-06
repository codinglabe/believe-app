"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Heart, ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Play, Building2, ChevronDown, ChevronUp } from "lucide-react"

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
  channel_slug?: string | null
}

interface VideoData extends VideoItem {
  description?: string
  video_url?: string | null
  nonprofit?: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  video: VideoData
  relatedVideos?: VideoItem[]
}

export default function CommunityVideoShow({ seo, video, relatedVideos = [] }: Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const descriptionPreview = video.description ? (video.description.length > 150 ? video.description.slice(0, 150) + "…" : video.description) : ""
  const hasMoreDescription = video.description && video.description.length > 150

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? video.title} description={seo?.description} />
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main content - YouTube style */}
            <div className="flex-1 min-w-0">
              <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
                {video.video_url ? (
                  <video
                    src={video.video_url}
                    poster={video.thumbnail_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <>
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-contain bg-black"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg">
                        <Play className="w-10 h-10 text-white ml-1 fill-white" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {video.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {video.views_formatted} views · {video.time_ago}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="rounded-full h-9 gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {video.likes}
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full h-9">
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full h-9 gap-1">
                      <Share2 className="w-4 h-4" />
                      Share
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Channel row - YouTube style */}
                <div className="flex items-center justify-between gap-4 py-4 border-t border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 min-w-0">
                    <Link
                      href={video.channel_slug ? `/community-videos/channel/${video.channel_slug}` : "#"}
                      className="shrink-0"
                    >
                      <Avatar className="h-12 w-12 rounded-full">
                        {video.creatorAvatar && <AvatarImage src={video.creatorAvatar} alt={video.creator} />}
                        <AvatarFallback className="rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm">
                          {video.creator.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={video.channel_slug ? `/community-videos/channel/${video.channel_slug}` : "#"}
                        className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 block truncate"
                      >
                        {video.creator}
                      </Link>
                      {video.nonprofit && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {video.nonprofit}
                        </p>
                      )}
                    </div>
                  </div>
                  {video.channel_slug && (
                    <Button size="sm" className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white shrink-0 border-0" asChild>
                      <Link href={`/community-videos/channel/${video.channel_slug}`}>Subscribe</Link>
                    </Button>
                  )}
                </div>

                {/* Description - expandable */}
                {video.description && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {descriptionExpanded ? video.description : descriptionPreview}
                    </div>
                    {hasMoreDescription && (
                      <button
                        type="button"
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1"
                      >
                        {descriptionExpanded ? (
                          <>Show less <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>Show more <ChevronDown className="w-4 h-4" /></>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Related videos sidebar - YouTube style */}
            <aside className="w-full lg:w-[402px] shrink-0 space-y-2">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white px-1 mb-2">
                Related
              </h2>
              {relatedVideos.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No related videos.</p>
              ) : (
                relatedVideos.map((related) => (
                  <Link
                    key={related.id}
                    href={`/community-videos/watch/${related.slug}`}
                    className="flex gap-3 p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
                  >
                    <div className="relative w-[168px] h-[94px] shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                      <img
                        src={related.thumbnail_url}
                        alt={related.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                        {related.duration}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {related.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {related.creator}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {related.views_formatted} views · {related.time_ago}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
