"use client"

import { useState } from "react"
import { Link, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import axios from "axios"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Play, Building2, Youtube, Video, Eye, ThumbsUp, MessageCircle, Share2, ArrowLeft, Clapperboard, Heart } from "lucide-react"
import { cn } from "@/lib/utils"

export interface VideoItem {
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

export interface YouTubeVideoItem {
  id: string
  title: string
  thumbnail_url: string
  published_at: string
  views: number
  views_formatted: string
  duration: string
  watch_url: string
  likes?: number
  likes_formatted?: string
  comment_count?: number
  comment_count_formatted?: string
  app_likes?: number
  app_comment_count?: number
  app_shares?: number
  user_liked?: boolean
  total_likes_formatted?: string
  total_comment_count_formatted?: string
}

export interface ShortItem {
  id: string
  slug: string
  title: string
  thumbnail_url: string
  views: number
  views_formatted: string
  channel_slug?: string
  creator?: string
  creatorAvatar?: string | null
}

export interface ChannelPageContentProps {
  channel: {
    slug: string
    name: string
    description: string | null
    avatar: string | null
    banner_url: string | null
    organization_slug: string | null
    youtube_channel_url: string | null
    total_videos: number
    total_views: number
  }
  videos: VideoItem[]
  youtube_videos?: YouTubeVideoItem[]
  shorts?: ShortItem[]
  backLink?: { href: string; label: string }
  /** Use dashboard semantic colors (bg-background, border-border, etc.) when shown inside app dashboard */
  variant?: "default" | "dashboard"
}

export function ChannelPageContent({
  channel,
  videos,
  youtube_videos: initialYoutubeVideos = [],
  shorts = [],
  backLink,
  variant = "default",
}: ChannelPageContentProps) {
  const { auth } = usePage().props as { auth?: { user?: { id: number } } }
  const [activeTab, setActiveTab] = useState<"videos" | "about">("videos")
  const [youtube_videos, setYoutubeVideos] = useState<YouTubeVideoItem[]>(initialYoutubeVideos)
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null)
  const isDashboard = variant === "dashboard"

  const handleYoutubeLike = async (e: React.MouseEvent, yt: YouTubeVideoItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (!auth?.user?.id) {
      window.location.href = route("login") + "?redirect=" + encodeURIComponent(window.location.pathname)
      return
    }
    setLikeLoadingId(yt.id)
    try {
      const { data } = await axios.post(route("community-videos.engagement.like"), {
        video_id: yt.id,
        source: "yt",
        channel_slug: channel.slug ?? undefined,
      })
      const newLiked = data.liked === true
      const newAppLikes = Number(data.app_likes) ?? 0
      const formatCount = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n))
      setYoutubeVideos((prev) =>
        prev.map((v) =>
          v.id === yt.id
            ? {
                ...v,
                user_liked: newLiked,
                app_likes: newAppLikes,
                total_likes_formatted: formatCount((v.likes ?? 0) + newAppLikes),
              }
            : v
        )
      )
    } finally {
      setLikeLoadingId(null)
    }
  }

  const handleYoutubeShare = async (yt: YouTubeVideoItem) => {
    const url = `${window.location.origin}/community-videos/watch/yt/${yt.id}${channel.slug ? `?channel_slug=${encodeURIComponent(channel.slug)}&creator=${encodeURIComponent(channel.name)}` : ""}`
    try {
      await axios.post(route("community-videos.engagement.share"), {
        video_id: yt.id,
        source: "yt",
        channel_slug: channel.slug ?? undefined,
      })
    } catch (_) {}
    if (navigator.share) {
      try {
        await navigator.share({ title: yt.title, url })
      } catch {
        await navigator.clipboard.writeText(url)
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }
  const totalViewsFormatted =
    channel.total_views >= 1_000_000
      ? (channel.total_views / 1_000_000).toFixed(1) + "M"
      : channel.total_views >= 1_000
        ? (channel.total_views / 1_000).toFixed(1) + "K"
        : String(channel.total_views)

  return (
    <div className={isDashboard ? "min-h-screen bg-background" : "min-h-screen bg-gray-50 dark:bg-gray-900"}>
      {backLink && (
        <div className={isDashboard ? "border-b border-border bg-background" : "border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-transparent"}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Link
              href={backLink.href}
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDashboard ? "text-muted-foreground hover:text-foreground" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {backLink.label}
            </Link>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        <div
          className="max-w-[1400px] mx-auto h-32 sm:h-40 md:h-52 rounded-t-2xl overflow-hidden bg-cover bg-center bg-no-repeat"
          style={
            channel.banner_url
              ? { backgroundImage: `url(${channel.banner_url})` }
              : undefined
          }
        >
          {!channel.banner_url && (
            <div className="w-full h-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 dark:from-red-900/90 dark:via-gray-900 dark:to-gray-900" aria-hidden />
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-white dark:border-white bg-gray-200 dark:bg-gray-800 shrink-0 shadow-xl dark:shadow-2xl">
            {channel.avatar && <AvatarImage src={channel.avatar} alt={channel.name} />}
            <AvatarFallback className="rounded-full bg-purple-600/80 text-white text-2xl font-semibold">
              {channel.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pt-2 sm:pt-0 space-y-1">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDashboard ? "text-foreground" : "text-gray-900 dark:text-white"}`}>
              {channel.name}
            </h1>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${isDashboard ? "text-muted-foreground" : "text-gray-500 dark:text-gray-400"}`}>
              <span>@{channel.slug}</span>
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-purple-500 dark:text-purple-400" aria-hidden />
                <span>
                  {channel.total_videos} video{channel.total_videos !== 1 ? "s" : ""}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-500 dark:text-purple-400" aria-hidden />
                <span>{totalViewsFormatted} views</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {channel.organization_slug && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-9 px-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
                  asChild
                >
                  <Link href={`/organizations/${channel.organization_slug}`} className="inline-flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    View organization
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className={`flex gap-0 border-b mt-3 ${isDashboard ? "border-border" : "border-gray-200 dark:border-gray-800"}`}>
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "videos"
                ? isDashboard ? "border-primary text-foreground" : "border-purple-500 text-gray-900 dark:text-white"
                : isDashboard ? "border-transparent text-muted-foreground hover:text-foreground" : "border-transparent text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Videos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "about"
                ? isDashboard ? "border-primary text-foreground" : "border-purple-500 text-gray-900 dark:text-white"
                : isDashboard ? "border-transparent text-muted-foreground hover:text-foreground" : "border-transparent text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            About
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-1 pb-8">
        {activeTab === "videos" && (
          <>
            {shorts.length > 0 && (
              <section className="mb-6">
                <h2 className={`text-base font-semibold mb-3 px-0.5 flex items-center gap-2 ${isDashboard ? "text-foreground" : "text-gray-900 dark:text-white"}`}>
                  <Clapperboard className="w-5 h-5 text-purple-500 dark:text-purple-400" aria-hidden />
                  Shorts
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-0.5 scrollbar-none">
                  {shorts.map((short) => {
                    const params = new URLSearchParams()
                    if (short.channel_slug) params.set("channel_slug", short.channel_slug)
                    if (short.creator) params.set("creator", short.creator)
                    if (short.creatorAvatar) params.set("creator_avatar", short.creatorAvatar)
                    const watchHref = `/community-videos/shorts/yt/${short.slug}${params.toString() ? `?${params.toString()}` : ""}`
                    return (
                      <a
                        key={short.id}
                        href={watchHref}
                        onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                        className="shrink-0 w-[140px] sm:w-[160px] group block"
                      >
                        <div className={`relative aspect-[9/16] w-full rounded-xl overflow-hidden ${isDashboard ? "bg-muted" : "bg-gray-200 dark:bg-gray-800"}`}>
                          <img
                            src={short.thumbnail_url}
                            alt={short.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:bg-white transition-colors">
                              <Play className="w-5 h-5 text-gray-900 ml-0.5 fill-gray-900" />
                            </div>
                          </div>
                          <div className="absolute bottom-1 left-1 right-1 text-xs font-medium text-white drop-shadow-md line-clamp-2">
                            {short.title}
                          </div>
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                            {short.views_formatted} views
                          </div>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </section>
            )}
            {videos.length === 0 && youtube_videos.length === 0 ? (
              <div className={`text-center py-20 rounded-xl border ${isDashboard ? "bg-card border-border" : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"}`}>
                <p className={`mb-2 ${isDashboard ? "text-muted-foreground" : "text-gray-600 dark:text-gray-400"}`}>No videos yet</p>
                <p className={`text-sm mb-6 ${isDashboard ? "text-muted-foreground" : "text-gray-500 dark:text-gray-500"}`}>This channel hasn't uploaded any videos.</p>
                <Button className="bg-purple-600 hover:bg-purple-500 text-white border-0 rounded-lg" asChild>
                  <Link href="/community-videos">Browse Community Videos</Link>
                </Button>
              </div>
            ) : null}
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {videos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/community-videos/watch/${video.slug}`}
                    className="group"
                  >
                    <div className={`relative aspect-video w-full rounded-lg overflow-hidden ${isDashboard ? "bg-muted" : "bg-gray-200 dark:bg-gray-800"}`}>
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                        {video.duration}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                          <Play className="w-7 h-7 text-white ml-1 fill-white" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h3 className={`text-sm font-medium line-clamp-2 transition-colors ${isDashboard ? "text-foreground group-hover:text-primary" : "text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400"}`}>
                        {video.title}
                      </h3>
                      <p className={`text-xs mt-1 flex items-center gap-1.5 ${isDashboard ? "text-muted-foreground" : "text-gray-500 dark:text-gray-400"}`}>
                        <Eye className="w-3.5 h-3.5 shrink-0 text-purple-500 dark:text-purple-400" aria-hidden />
                        <span>{video.views_formatted} views</span>
                        <span>·</span>
                        <span>{video.time_ago}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}

            {youtube_videos.length > 0 && (
              <div className={videos.length > 0 ? "mt-10" : "mt-2"}>
                <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDashboard ? "text-foreground" : "text-gray-900 dark:text-white"}`}>
                  <Youtube className="w-5 h-5 text-red-500" />
                  Videos
                </h2>
                <p className={`text-sm mb-6 ${isDashboard ? "text-muted-foreground" : "text-gray-500 dark:text-gray-400"}`}>
                  Click a video to watch on our site.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {youtube_videos.map((yt) => {
                    const q = new URLSearchParams()
                    if (channel.slug) q.set("channel_slug", channel.slug)
                    if (channel.name) q.set("creator", channel.name)
                    if (channel.avatar) q.set("creator_avatar", channel.avatar)
                    const watchHref = `/community-videos/watch/yt/${yt.id}${q.toString() ? `?${q.toString()}` : ""}`
                    return (
                      <div key={yt.id} className="group block">
                        <a
                          href={watchHref}
                          onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                          className="block"
                        >
                          <div className={`relative aspect-video w-full rounded-lg overflow-hidden ${isDashboard ? "bg-muted" : "bg-gray-200 dark:bg-gray-800"}`}>
                            <img
                              src={yt.thumbnail_url}
                              alt={yt.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${yt.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}>
                              {yt.duration}
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                                <Play className="w-7 h-7 text-white ml-1 fill-white" />
                              </div>
                            </div>
                          </div>
                        </a>
                        <div className="mt-3">
                          <a
                            href={watchHref}
                            onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                            className="block"
                          >
                            <h3 className={`text-sm font-medium line-clamp-2 transition-colors ${isDashboard ? "text-foreground group-hover:text-primary" : "text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400"}`}>
                              {yt.title}
                            </h3>
                          </a>
                          <Link
                            href={`/community-videos/channel/${channel.slug}`}
                            className="text-xs text-gray-500 dark:text-gray-400 mt-1 block truncate hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          >
                            {channel.name}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="flex items-center gap-1.5 text-purple-500 dark:text-purple-400">
                              <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              {yt.views_formatted} views
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleYoutubeLike(e, yt)}
                              disabled={likeLoadingId === yt.id}
                              className={cn(
                                "flex items-center gap-1 transition-colors",
                                yt.user_liked ? "text-red-500 dark:text-red-400" : "text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                              )}
                              title={yt.user_liked ? "Unlike" : "Like"}
                            >
                              {yt.user_liked ? <Heart className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden /> : <ThumbsUp className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                              {yt.total_likes_formatted ?? yt.likes_formatted ?? yt.likes ?? 0}
                            </button>
                            <span className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              {yt.total_comment_count_formatted ?? yt.comment_count_formatted ?? yt.comment_count ?? 0}
                            </span>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                              title="Share"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleYoutubeShare(yt) }}
                            >
                              <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              Share
                            </button>
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "about" && (
            <div className="max-w-2xl">
            <div className={`rounded-xl border p-6 ${isDashboard ? "bg-card border-border" : "bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDashboard ? "text-foreground" : "text-gray-900 dark:text-white"}`}>
                About {channel.name}
              </h2>
              {channel.description ? (
                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDashboard ? "text-muted-foreground" : "text-gray-600 dark:text-gray-300"}`}>
                  {channel.description}
                </p>
              ) : (
                <p className={`text-sm ${isDashboard ? "text-muted-foreground" : "text-gray-500 dark:text-gray-500"}`}>
                  No description yet.
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-6">
                {channel.organization_slug && (
                  <Button
                    variant="outline"
                    className="rounded-lg border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white"
                    asChild
                  >
                    <Link href={`/organizations/${channel.organization_slug}`} className="inline-flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      View full organization profile
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
