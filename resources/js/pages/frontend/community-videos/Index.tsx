"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import axios from "axios"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Heart, ThumbsUp, Play, Building2, ChevronDown, Share2, Eye, MessageCircle, Clapperboard } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"

interface VideoItem {
  id: number | string
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
  likes_formatted?: string
  comment_count?: number
  comment_count_formatted?: string
  nonprofit?: string | null
  channel_slug?: string | null
  source?: "upload" | "youtube"
  watch_url?: string | null
  app_likes?: number
  app_comment_count?: number
  app_shares?: number
  user_liked?: boolean
  total_likes_formatted?: string
  total_comment_count_formatted?: string
}

interface ChannelBanner {
  slug: string
  name: string
  banner_url: string
}

interface Props {
  seo?: { title?: string; description?: string }
  channelBanners?: ChannelBanner[]
  featuredVideo: VideoItem | null
  videos: VideoItem[]
  shorts?: VideoItem[]
  filters: {
    search: string
    category: string
    tab: string
  }
}

function formatCount(n: number) {
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n)
}

const BANNER_AUTO_ADVANCE_MS = 5000
const SHORTS_AUTO_ADVANCE_MS = 4500
const SHORTS_PER_PAGE = 4

export default function CommunityVideosIndex({ seo, channelBanners = [], featuredVideo: initialFeatured, videos: initialVideos, shorts = [], filters }: Props) {
  const { auth } = usePage().props as { auth?: { user?: { id: number } } }
  const [featuredVideo, setFeaturedVideo] = useState<VideoItem | null>(initialFeatured)
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos)
  const [searchInput, setSearchInput] = useState(filters.search)
  const [likeLoadingId, setLikeLoadingId] = useState<string | number | null>(null)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [shortsIndex, setShortsIndex] = useState(0)
  const bannerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const shortsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setFeaturedVideo(initialFeatured)
    setVideos(initialVideos)
  }, [initialFeatured, initialVideos])

  // Auto-advance channel banner slider
  useEffect(() => {
    if (channelBanners.length <= 1) return
    bannerIntervalRef.current = setInterval(() => {
      setBannerIndex((i) => (i + 1) % channelBanners.length)
    }, BANNER_AUTO_ADVANCE_MS)
    return () => {
      if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current)
    }
  }, [channelBanners.length])

  const shortsSlides = useMemo(() => {
    const pages: VideoItem[][] = []
    for (let i = 0; i < shorts.length; i += SHORTS_PER_PAGE) {
      pages.push(shorts.slice(i, i + SHORTS_PER_PAGE))
    }
    return pages
  }, [shorts])

  useEffect(() => {
    if (shortsSlides.length <= 1) return
    shortsIntervalRef.current = setInterval(() => {
      setShortsIndex((i) => (i + 1) % shortsSlides.length)
    }, SHORTS_AUTO_ADVANCE_MS)
    return () => {
      if (shortsIntervalRef.current) clearInterval(shortsIntervalRef.current)
    }
  }, [shortsSlides.length])

  const activeTab = (filters.tab === "latest" || filters.tab === "trending" || filters.tab === "nonprofits"
    ? filters.tab
    : "latest") as "latest" | "trending" | "nonprofits"
  const category = filters.category || "all"

  const updateVideoLike = useCallback((videoId: string | number, newLiked: boolean, newAppLikes: number) => {
    setFeaturedVideo((f) =>
      f && (f.id === videoId || f.slug === videoId)
        ? { ...f, user_liked: newLiked, app_likes: newAppLikes, total_likes_formatted: formatCount((f.likes ?? 0) + newAppLikes) }
        : f
    )
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId || v.slug === videoId
          ? { ...v, user_liked: newLiked, app_likes: newAppLikes, total_likes_formatted: formatCount((v.likes ?? 0) + newAppLikes) }
          : v
      )
    )
  }, [])

  const handleLike = useCallback(
    async (e: React.MouseEvent, video: VideoItem) => {
      e.preventDefault()
      e.stopPropagation()
      if (!auth?.user?.id) {
        window.location.href = route("login") + "?redirect=" + encodeURIComponent("/community-videos")
        return
      }
      const id = video.slug ?? video.id
      setLikeLoadingId(id)
      try {
        const { data } = await axios.post(route("community-videos.engagement.like"), {
          video_id: String(video.slug ?? video.id),
          source: "yt",
          channel_slug: video.channel_slug ?? undefined,
        })
        const newLiked = data.liked === true
        const newAppLikes = Number(data.app_likes) || 0
        updateVideoLike(id, newLiked, newAppLikes)
      } finally {
        setLikeLoadingId(null)
      }
    },
    [auth?.user?.id, updateVideoLike]
  )

  const handleShare = useCallback(async (e: React.MouseEvent, video: VideoItem) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/community-videos/watch/yt/${video.slug}${video.channel_slug ? `?channel_slug=${encodeURIComponent(video.channel_slug)}&creator=${encodeURIComponent(video.creator)}` : ""}`
    try {
      await axios.post(route("community-videos.engagement.share"), {
        video_id: String(video.slug ?? video.id),
        source: "yt",
        channel_slug: video.channel_slug ?? undefined,
      })
    } catch { /* ignore share API errors */ }
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url })
      } catch {
        await navigator.clipboard.writeText(url)
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }, [])

  const applyFilters = useCallback(
    (updates: { search?: string; category?: string; tab?: string }) => {
      router.get("/community-videos", {
        search: updates.search !== undefined ? updates.search : filters.search,
        category: updates.category !== undefined ? updates.category : filters.category,
        tab: updates.tab !== undefined ? updates.tab : filters.tab,
      }, { preserveState: false })
    },
    [filters.search, filters.category, filters.tab]
  )

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters({ search: searchInput })
  }

  const handleCategoryChange = (value: string) => {
    applyFilters({ category: value })
  }

  const handleTabChange = (tab: "latest" | "trending" | "nonprofits") => {
    applyFilters({ tab })
  }

  const hasContent = featuredVideo || videos.length > 0

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Community Videos"} description={seo?.description} />
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <header className="fixed top-16 left-0 right-0 z-10 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Row 1 on mobile: search */}
              <div className="flex items-center gap-2 min-w-0 flex-1 w-full sm:max-w-2xl">
                <div className="relative flex-1 min-w-0">
                  <Input
                    placeholder="Search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-8 sm:h-9 pl-3 sm:pl-4 pr-9 sm:pr-10 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus-visible:ring-1"
                  />
                  <button
                    type="submit"
                    className="absolute right-0 top-0 h-8 sm:h-9 w-9 flex items-center justify-center rounded-r-full bg-gray-100 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600"
                  >
                    <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              {/* Row 2 on mobile: categories */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-8 sm:h-9 flex-1 min-w-0 sm:flex-none sm:w-[130px] rounded-full border border-gray-300 dark:border-gray-600 text-sm bg-gray-50 dark:bg-gray-900">
                    <SelectValue placeholder="Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                    <SelectItem value="stories">Stories</SelectItem>
                    <SelectItem value="impact">Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </div>
        </header>

        {/* Channel banner slider - full width, animated */}
        {channelBanners.length > 0 && (
          <section className="w-full pt-16 sm:pt-14" aria-label="Channel banners">
            <div className="relative w-full overflow-hidden h-[140px] sm:h-[180px] lg:h-[220px] bg-gray-900">
              <div
                className="flex h-full transition-transform duration-700 ease-out"
                style={{
                  width: `${channelBanners.length * 100}%`,
                  transform: `translateX(-${bannerIndex * (100 / channelBanners.length)}%)`,
                }}
              >
                {channelBanners.map((channel) => (
                  <Link
                    key={channel.slug}
                    href={`/community-videos/channel/${channel.slug}`}
                    className="relative flex-shrink-0 h-full block group"
                    style={{ width: `${100 / channelBanners.length}%` }}
                  >
                    <img
                      src={channel.banner_url}
                      alt={`${channel.name} channel banner`}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <span className="text-white font-semibold text-sm sm:text-base drop-shadow-sm">{channel.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {channelBanners.length > 1 && (
                <>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {channelBanners.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBannerIndex(i) }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === bannerIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"}`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <div className={`container mx-auto px-4 sm:px-6 lg:px-8 pb-6 ${channelBanners.length > 0 ? "pt-6" : "pt-24 sm:pt-20"}`}>
          <main className="min-w-0">
          {featuredVideo && (() => {
            const fp = new URLSearchParams()
            if (featuredVideo.channel_slug) fp.set("channel_slug", featuredVideo.channel_slug)
            if (featuredVideo.creator) fp.set("creator", featuredVideo.creator)
            if (featuredVideo.creatorAvatar) fp.set("creator_avatar", featuredVideo.creatorAvatar)
            const fq = fp.toString()
            const featuredWatchHref = `/community-videos/watch/yt/${featuredVideo.slug}${fq ? `?${fq}` : ""}`
            return (
            <section className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                <a
                  href={featuredWatchHref}
                  onClick={(e) => { e.preventDefault(); window.location.href = featuredWatchHref }}
                  className="lg:col-span-3 block h-full"
                >
                  <div className="relative h-[180px] sm:h-[200px] bg-black group">
                    <img
                      src={featuredVideo.thumbnail_url}
                      alt={featuredVideo.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 flex items-center justify-center group-hover:bg-white transition-colors">
                        <Play className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 ml-0.5 fill-gray-900" />
                      </div>
                    </div>
                    <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${featuredVideo.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}>
                      {featuredVideo.duration}
                    </div>
                  </div>
                </a>
                <div className="lg:col-span-2 flex flex-col bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <span>{featuredVideo.views_formatted} views</span>
                      {featuredVideo.time_ago ? (
                        <>
                          <span className="text-white/60" aria-hidden>·</span>
                          <span>{featuredVideo.time_ago}</span>
                        </>
                      ) : null}
                    </div>
                    {featuredVideo.channel_slug ? (
                      <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 h-7 text-xs gap-1" asChild>
                        <Link href={`/community-videos/channel/${featuredVideo.channel_slug}`}>
                          Visit Channel
                          <ChevronDown className="w-4 h-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 h-7 text-xs gap-1">
                        Visit Channel
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <a
                    href={featuredWatchHref}
                    onClick={(e) => { e.preventDefault(); window.location.href = featuredWatchHref }}
                    className="flex-1 min-w-0 block"
                  >
                    <h2 className="text-base sm:text-lg font-bold text-white mb-1 line-clamp-2 hover:underline">
                      {featuredVideo.title}
                    </h2>
                  </a>
                  {featuredVideo.nonprofit && (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-white/90 mb-2">
                      <Building2 className="w-3.5 h-3.5 shrink-0 text-white/80" />
                      <span>{featuredVideo.nonprofit}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className={`h-7 rounded border-0 text-xs gap-1 ${!!featuredVideo.user_liked ? "bg-white/30 text-pink-300 hover:bg-white/40" : "bg-white/20 hover:bg-white/30 text-white"}`}
                      onClick={(e) => handleLike(e, featuredVideo)}
                      disabled={likeLoadingId === featuredVideo.slug || likeLoadingId === featuredVideo.id}
                    >
                      {!!featuredVideo.user_liked ? <Heart className="w-4 h-4 fill-current" /> : <ThumbsUp className="w-4 h-4" />}
                      {featuredVideo.total_likes_formatted ?? featuredVideo.likes_formatted ?? featuredVideo.likes}
                    </Button>
                  </div>
                  <div className="flex items-center justify-end mt-auto">
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-white/10 text-white/90 flex items-center gap-1.5 text-xs"
                      onClick={(e) => handleShare(e, featuredVideo)}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </section>
            )
          })()}

          {shorts.length > 0 && (
            <section className="mb-6" aria-label="Shorts">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 px-0.5 flex items-center gap-2">
                <Clapperboard className="w-5 h-5 text-purple-500 dark:text-purple-400" aria-hidden />
                Shorts
              </h2>
              <div className="relative w-full overflow-hidden">
                <div
                  className="flex transition-transform duration-700 ease-out"
                  style={{
                    width: `${shortsSlides.length * 100}%`,
                    transform: `translateX(-${shortsIndex * (100 / shortsSlides.length)}%)`,
                  }}
                >
                  {shortsSlides.map((pageShorts, pageIdx) => (
                    <div
                      key={pageIdx}
                      className="flex gap-3"
                      style={{ width: `${100 / shortsSlides.length}%` }}
                    >
                      {pageShorts.map((short) => {
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
                            <div className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
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
                  ))}
                </div>
                {shortsSlides.length > 1 && (
                  <div className="flex justify-center gap-1.5 pt-3">
                    {shortsSlides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShortsIndex(i) }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === shortsIndex ? "w-5 bg-purple-600" : "w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"}`}
                        aria-label={`Shorts slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 scrollbar-none border-b border-gray-200 dark:border-gray-700 mb-6">
            {(["latest", "trending", "nonprofits"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {tab === "nonprofits" ? "Nonprofits" : tab === "latest" ? "Latest" : "Trending"}
              </button>
            ))}
          </div>

          {!hasContent ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No videos found.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => {
                const params = new URLSearchParams()
                if (video.channel_slug) params.set("channel_slug", video.channel_slug)
                if (video.creator) params.set("creator", video.creator)
                if (video.creatorAvatar) params.set("creator_avatar", video.creatorAvatar)
                const q = params.toString()
                const watchHref = `/community-videos/watch/yt/${video.slug}${q ? `?${q}` : ""}`
                return (
                  <div key={video.id} className="group block">
                    <a
                      href={watchHref}
                      onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                      className="block"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${video.duration === "LIVE" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}>
                          {video.duration}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-7 h-7 text-purple-600 ml-1 fill-purple-600" />
                          </div>
                        </div>
                      </div>
                    </a>
                    <div className="flex gap-3 mt-2">
                      <Avatar className="h-9 w-9 rounded-full shrink-0">
                        {video.creatorAvatar && <AvatarImage src={video.creatorAvatar} alt={video.creator} />}
                        <AvatarFallback className="rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs">
                          {video.creator.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <a
                          href={watchHref}
                          onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                          className="block"
                        >
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {video.title}
                          </h3>
                        </a>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                          {video.channel_slug ? (
                            <button
                              type="button"
                              className="text-left truncate w-full hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                router.visit(`/community-videos/channel/${video.channel_slug}`)
                              }}
                            >
                              {video.creator}
                            </button>
                          ) : (
                            video.creator
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1.5 text-purple-500 dark:text-purple-400">
                            <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            {video.views_formatted} views
                          </span>
                          {video.time_ago ? (
                            <>
                              <span className="text-gray-400 dark:text-gray-500" aria-hidden>·</span>
                              <span className="text-gray-500 dark:text-gray-400">{video.time_ago}</span>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className={`flex items-center gap-1 transition-colors ${!!video.user_liked ? "text-red-500 dark:text-red-400" : "text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"}`}
                            onClick={(e) => handleLike(e, video)}
                            disabled={likeLoadingId === video.slug || likeLoadingId === video.id}
                            title={!!video.user_liked ? "Unlike" : "Like"}
                          >
                            {!!video.user_liked ? <Heart className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden /> : <ThumbsUp className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                            {video.total_likes_formatted ?? video.likes_formatted ?? video.likes ?? 0}
                          </button>
                          <span className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            {video.total_comment_count_formatted ?? video.comment_count_formatted ?? video.comment_count ?? 0}
                          </span>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                            title="Share"
                            onClick={(e) => handleShare(e, video)}
                          >
                            <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            Share
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </main>
        </div>
      </div>
    </FrontendLayout>
  )
}
