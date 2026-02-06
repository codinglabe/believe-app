"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link } from "@inertiajs/react"
import { PageHead } from "@/components/frontend/PageHead"
import { CommunityVideoPlayer } from "@/components/frontend/CommunityVideoPlayer"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Building2, ArrowLeft, ChevronDown, ChevronUp, MessageCircle } from "lucide-react"

interface VideoData {
  id: string
  slug: string
  title: string
  description?: string
  creator: string | null
  creatorAvatar: string | null
  thumbnail_url: string
  duration: string
  views: number
  views_formatted: string
  time_ago: string
  likes: number
  likes_formatted?: string
  comment_count?: number
  comment_count_formatted?: string
  channel_slug?: string | null
  embed_url: string
}

interface MoreVideoItem {
  id?: string
  slug: string
  title: string
  creator?: string | null
  creatorAvatar?: string | null
  thumbnail_url: string
  duration: string
  views_formatted: string
  time_ago?: string
  channel_slug?: string | null
}

interface CommentItem {
  authorDisplayName: string
  authorProfileImageUrl: string
  text: string
  likeCount: number
  publishedAt: string
  time_ago: string
}

interface Props {
  seo?: { title?: string; description?: string }
  video: VideoData
  moreVideos?: MoreVideoItem[]
  comments?: CommentItem[]
}

export default function CommunityVideoShowYouTube({ seo, video, moreVideos = [], comments = [] }: Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const descriptionPreview = video.description ? (video.description.length > 150 ? video.description.slice(0, 150) + "…" : video.description) : ""
  const hasMoreDescription = video.description && video.description.length > 150

  const watchHref = (item: MoreVideoItem) => {
    const q = new URLSearchParams()
    if (item.channel_slug) q.set("channel_slug", item.channel_slug)
    if (item.creator) q.set("creator", item.creator)
    if (item.creatorAvatar) q.set("creator_avatar", item.creatorAvatar)
    return `/community-videos/watch/yt/${item.slug}${q.toString() ? `?${q.toString()}` : ""}`
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? video.title} description={seo?.description} />
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="mb-4">
            <Link
              href="/community-videos"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to Community Videos
            </Link>
          </div>
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 min-w-0">
              <CommunityVideoPlayer
                videoId={video.id}
                title={video.title}
                className="w-full"
              />

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
                      {video.likes_formatted ?? video.likes ?? 0}
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

                <div className="flex items-center justify-between gap-4 py-4 border-t border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 min-w-0">
                    <Link
                      href={video.channel_slug ? `/community-videos/channel/${video.channel_slug}` : "#"}
                      className="shrink-0"
                    >
                      <Avatar className="h-12 w-12 rounded-full">
                        {video.creatorAvatar && (video.creatorAvatar.startsWith("http") || video.creatorAvatar.startsWith("/")) && (
                          <AvatarImage src={video.creatorAvatar} alt={video.creator ?? "Channel"} />
                        )}
                        <AvatarFallback className="rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm">
                          {(video.creator ?? "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={video.channel_slug ? `/community-videos/channel/${video.channel_slug}` : "#"}
                        className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 block truncate"
                      >
                        {video.creator ?? "Channel"}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {video.creator ?? "Channel"}
                      </p>
                    </div>
                  </div>
                  {video.channel_slug && (
                    <Button size="sm" className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white shrink-0 border-0" asChild>
                      <Link href={`/community-videos/channel/${video.channel_slug}`}>Subscribe</Link>
                    </Button>
                  )}
                </div>

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

                {/* Comments: list + link to YouTube */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    {video.comment_count_formatted ?? video.comment_count ?? 0} comments
                  </h3>
                  {comments.length > 0 ? (
                    <ul className="space-y-4 mb-4">
                      {comments.map((c, i) => (
                        <li key={i} className="flex gap-3">
                          <Avatar className="h-9 w-9 rounded-full shrink-0">
                            {c.authorProfileImageUrl ? (
                              <AvatarImage src={c.authorProfileImageUrl} alt={c.authorDisplayName} />
                            ) : null}
                            <AvatarFallback className="rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs">
                              {(c.authorDisplayName || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {c.authorDisplayName}
                              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                                {c.time_ago}
                              </span>
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-0.5">
                              {c.text}
                            </p>
                            {c.likeCount > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {c.likeCount} like{c.likeCount !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Comments are not available for this video or are disabled.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <aside className="w-full lg:w-[402px] shrink-0 space-y-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white px-1">More videos</h2>
              {moreVideos.length > 0 ? (
                <div className="space-y-3">
                  {moreVideos.map((item) => (
                    <div key={item.slug} className="flex gap-3 rounded-lg overflow-hidden group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <a
                        href={watchHref(item)}
                        onClick={(e) => { e.preventDefault(); window.location.href = watchHref(item) }}
                        className="relative w-40 shrink-0 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 block"
                      >
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                          {item.duration}
                        </span>
                      </a>
                      <div className="min-w-0 flex-1 py-0.5">
                        <a
                          href={watchHref(item)}
                          onClick={(e) => { e.preventDefault(); window.location.href = watchHref(item) }}
                          className="block"
                        >
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {item.title}
                          </h3>
                        </a>
                        {item.channel_slug ? (
                          <Link
                            href={`/community-videos/channel/${item.channel_slug}`}
                            className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate block hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.creator ?? "Channel"}
                          </Link>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {item.creator ?? "Channel"}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.views_formatted} views{item.time_ago ? ` · ${item.time_ago}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Link
                  href="/community-videos"
                  className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Browse all videos</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Back to Community Videos</p>
                </Link>
              )}
            </aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
