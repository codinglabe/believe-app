"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useDebounce } from "@/hooks/useDebounce"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import axios from "axios"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/frontend/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/frontend/ui/command"
import { Search, Heart, ThumbsUp, Play, Building2, ChevronDown, Share2, Eye, MessageCircle, Clapperboard, Youtube, Lock, Sparkles, Brain, HardDrive, ChevronsUpDown, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { cn } from "@/lib/utils"

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

interface MyChannel {
  name: string
  avatar: string | null
  subscriber_count: number
  subscriber_count_formatted: string
  channel_slug: string | null
  preview_videos: Array<{ slug: string; title: string; thumbnail_url: string; duration: string }>
}

interface Props {
  seo?: { title?: string; description?: string }
  channelBanners?: ChannelBanner[]
  featuredVideo: VideoItem | null
  videos: VideoItem[]
  shorts?: VideoItem[]
  filters: {
    search: string
    tab: string
    org?: string
  }
  nonprofitOrganizations?: Array<{ id: number; name: string }>
  stats?: { total_videos: number; livestream_replays: number }
  videos_has_more?: boolean
  videos_next_page?: number
  myChannel?: MyChannel | null
  authUserChannelSlug?: string | null
  userOrgHasYoutube?: boolean
  userOrgCanConnect?: boolean
}

function formatCount(n: number) {
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n)
}

const SHORTS_AUTO_ADVANCE_MS = 4500
const SHORTS_PER_PAGE = 4

export default function CommunityVideosIndex({ seo, channelBanners = [], featuredVideo: initialFeatured, videos: initialVideos, shorts = [], filters, nonprofitOrganizations = [], stats = { total_videos: 0, livestream_replays: 0 }, videos_has_more = false, videos_next_page = 2, myChannel = null, authUserChannelSlug = null, userOrgHasYoutube = false, userOrgCanConnect = false }: Props) {
  const { auth } = usePage().props as { auth?: { user?: { id: number } } }
  const [featuredVideo, setFeaturedVideo] = useState<VideoItem | null>(initialFeatured)
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos)
  const [hasMore, setHasMore] = useState(videos_has_more)
  const [nextPage, setNextPage] = useState(videos_next_page)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)
  const [likeLoadingId, setLikeLoadingId] = useState<string | number | null>(null)
  const [shortsIndex, setShortsIndex] = useState(0)
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [orgSearchQuery, setOrgSearchQuery] = useState("")
  const [orgSearchResults, setOrgSearchResults] = useState<Array<{ id: number; name: string }>>([])
  const [orgSearchLoading, setOrgSearchLoading] = useState(false)
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null)
  const shortsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const orgDropdownJustOpenedRef = useRef(false)

  // Sync video list and pagination from server when props change (e.g. after search or tab change)
  useEffect(() => {
    setFeaturedVideo(initialFeatured)
    setVideos(initialVideos)
    setHasMore(videos_has_more)
    setNextPage(videos_next_page)
  }, [initialFeatured, initialVideos, videos_has_more, videos_next_page, filters.search, filters.tab, filters.org])

  // Keep search input in sync with URL (e.g. back/forward, or after server response)
  useEffect(() => {
    const urlSearch = filters.search ?? ""
    setSearchInput(urlSearch)
  }, [filters.search])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    axios.get(route("unity-videos.index"), {
      params: { page: nextPage, search: filters.search, tab: filters.tab, org: filters.org },
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    }).then(({ data }) => {
      const list = Array.isArray(data?.videos) ? data.videos : []
      setVideos((prev) => [...prev, ...list])
      setHasMore(!!data?.has_more)
      setNextPage((v) => (Number(data?.next_page) > 0 ? Number(data.next_page) : v + 1))
    }).catch(() => {
      setHasMore(false)
    }).finally(() => {
      setLoadingMore(false)
    })
  }, [loadingMore, hasMore, nextPage, filters.search, filters.tab, filters.org])

  useEffect(() => {
    const el = loadMoreSentinelRef.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) loadMore()
      },
      { rootMargin: "200px", threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadingMore, loadMore])

  const fetchOrganizations = useCallback((search: string) => {
    setOrgSearchLoading(true)
    axios.get(route("unity-videos.organizations"), { params: { search } })
      .then(({ data }) => setOrgSearchResults(data?.data ?? []))
      .catch(() => setOrgSearchResults([]))
      .finally(() => setOrgSearchLoading(false))
  }, [])

  useEffect(() => {
    if (!orgDropdownOpen) return
    fetchOrganizations(orgSearchQuery)
  }, [orgDropdownOpen])

  const debouncedFetchOrgs = useDebounce((q: string) => {
    if (!orgDropdownOpen) return
    fetchOrganizations(q)
  }, 300)

  useEffect(() => {
    if (!orgDropdownOpen) return
    debouncedFetchOrgs(orgSearchQuery)
  }, [orgSearchQuery, orgDropdownOpen])

  useEffect(() => {
    if (!orgDropdownOpen) {
      setOrgSearchQuery("")
    }
  }, [orgDropdownOpen])

  // Sync selected org display name when page loads with org in URL
  const orgFilter = filters.org ?? "all"
  useEffect(() => {
    if (orgFilter !== "all" && nonprofitOrganizations.length > 0) {
      const name = nonprofitOrganizations.find((o) => String(o.id) === orgFilter)?.name
      if (name) setSelectedOrgName((prev) => prev ?? name)
    }
  }, [orgFilter, nonprofitOrganizations])

  const orgDropdownDisplayName = useMemo(() => {
    if (orgFilter === "all") return "All organizations"
    return (
      selectedOrgName ??
      nonprofitOrganizations.find((o) => String(o.id) === orgFilter)?.name ??
      orgSearchResults.find((o) => String(o.id) === orgFilter)?.name ??
      "Organization"
    )
  }, [orgFilter, selectedOrgName, nonprofitOrganizations, orgSearchResults])

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

  const activeTab = (filters.tab === "latest" || filters.tab === "trending" || filters.tab === "nonprofits" || filters.tab === "supporter"
    ? filters.tab
    : "latest") as "latest" | "trending" | "nonprofits" | "supporter"
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
        window.location.href = route("login") + "?redirect=" + encodeURIComponent("/unity-videos")
        return
      }
      const id = video.slug ?? video.id
      setLikeLoadingId(id)
      try {
        const { data } = await axios.post(route("unity-videos.engagement.like"), {
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
    const url = `${window.location.origin}/unity-videos/watch/yt/${video.slug}${video.channel_slug ? `?channel_slug=${encodeURIComponent(video.channel_slug)}&creator=${encodeURIComponent(video.creator)}` : ""}`
    try {
      await axios.post(route("unity-videos.engagement.share"), {
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

  // Defaults: only include in URL when different from these
  const defaultSearch = ""
  const defaultTab = "latest"
  const defaultOrg = "all"

  const applyFilters = useCallback(
    (updates: { search?: string; tab?: string; org?: string }) => {
      const search = updates.search !== undefined ? updates.search : filters.search
      const tab = updates.tab !== undefined ? updates.tab : filters.tab
      const org = updates.org !== undefined ? updates.org : (filters.org ?? defaultOrg)
      const params: Record<string, string> = {}
      if (search !== defaultSearch) params.search = search
      if (tab !== defaultTab) params.tab = tab
      if (tab === "nonprofits" && org !== defaultOrg) params.org = org
      router.get("/unity-videos", params, { preserveState: false })
    },
    [filters.search, filters.tab, filters.org]
  )

  // Debounced search: apply filters automatically after user stops typing (400ms)
  const debouncedApplySearch = useDebounce((value: string) => {
    if (value === filters.search) return
    applyFilters({ search: value })
  }, 400)

  useEffect(() => {
    if (searchInput === filters.search) return
    debouncedApplySearch(searchInput)
  }, [searchInput, filters.search])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters({ search: searchInput })
  }

  const handleOrgChange = (value: string, displayName?: string | null) => {
    setSelectedOrgName(value === "all" ? null : displayName ?? null)
    applyFilters({ tab: "nonprofits", org: value })
  }

  const handleTabChange = (tab: "latest" | "trending" | "nonprofits" | "supporter") => {
    applyFilters({ tab })
  }

  const hasContent = featuredVideo || videos.length > 0

  // When search returns only one result it's shown as featured and grid is empty; show it in the grid too so the grid is visible
  const gridVideos =
    (filters.search?.trim() && featuredVideo && videos.length === 0)
      ? [featuredVideo]
      : videos

  const connectYoutubeUrl = route("login") + "?redirect=" + encodeURIComponent("/integrations/youtube/redirect")

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? "Unity Video Hub"} description={seo?.description} />
      <div className="min-h-screen bg-neutral-50 dark:bg-gray-950 text-neutral-900 dark:text-gray-100">
        {/* Profile completion banner - logged-in user (org or supporter) without YouTube */}
        {userOrgCanConnect && !userOrgHasYoutube && auth?.user && (
          <div className="bg-amber-500/15 border-b border-amber-500/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Complete Your Profile to Unlock All Unity Video Hub Features:</strong> 1. Connect your YouTube channel
              </p>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full bg-neutral-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full w-[80%] rounded-full bg-amber-400" />
                </div>
                <Button
                  size="sm"
                  type="button"
                  className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium"
                  onClick={() => { window.location.href = route("integrations.youtube.redirect"); }}
                >
                  Continue &gt;
                </Button>
              </div>
            </div>
          </div>
        )}

        <header className="sticky top-16 left-0 right-0 z-10 w-full bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-neutral-200 dark:border-gray-800">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <form onSubmit={handleSearchSubmit} className="flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-gray-500 pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search videos..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-10 pl-10 pr-20 w-full rounded-lg border border-neutral-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-neutral-900 dark:text-gray-100 placeholder:text-neutral-400 dark:placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-500/50"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 rounded-md text-sm font-medium text-neutral-600 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-gray-700/80 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </header>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <main className="min-w-0 flex-1">
          {featuredVideo && (() => {
            const fp = new URLSearchParams()
            if (featuredVideo.channel_slug) fp.set("channel_slug", featuredVideo.channel_slug)
            if (featuredVideo.creator) fp.set("creator", featuredVideo.creator)
            if (featuredVideo.creatorAvatar) fp.set("creator_avatar", featuredVideo.creatorAvatar)
            const fq = fp.toString()
            const featuredWatchHref = `/unity-videos/watch/yt/${featuredVideo.slug}${fq ? `?${fq}` : ""}`
            return (
            <section className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
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
                <div className="lg:col-span-2 flex flex-col border-l border-neutral-200 dark:border-gray-700 bg-neutral-50 dark:bg-gray-800/90 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-gray-400">
                      <span>{featuredVideo.views_formatted} views</span>
                      {featuredVideo.time_ago ? (
                        <>
                          <span className="text-neutral-400 dark:text-gray-600" aria-hidden>·</span>
                          <span>{featuredVideo.time_ago}</span>
                        </>
                      ) : null}
                    </div>
                    {featuredVideo.channel_slug ? (
                      <Button variant="outline" size="sm" className="border-neutral-300 dark:border-gray-600 bg-neutral-100 dark:bg-gray-800 text-neutral-800 dark:text-gray-200 hover:bg-neutral-200 dark:hover:bg-gray-700 h-7 text-xs gap-1" asChild>
                        <Link href={`/unity-videos/channel/${featuredVideo.channel_slug}`}>
                          {featuredVideo.channel_slug === authUserChannelSlug ? "Visit Channel" : "Subscribe"}
                          <ChevronDown className="w-4 h-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="border-neutral-300 dark:border-gray-600 bg-neutral-100 dark:bg-gray-800 text-neutral-800 dark:text-gray-200 h-7 text-xs gap-1">
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
                    <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mb-1 line-clamp-2 hover:underline">
                      {featuredVideo.title}
                    </h2>
                  </a>
                  {featuredVideo.nonprofit && (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 dark:text-gray-400 mb-2">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{featuredVideo.nonprofit}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`h-7 rounded border-neutral-300 dark:border-gray-600 text-xs gap-1 ${!!featuredVideo.user_liked ? "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/40 hover:bg-pink-500/30" : "bg-neutral-100 dark:bg-gray-700/50 text-neutral-700 dark:text-gray-300 border-neutral-300 dark:border-gray-600 hover:bg-neutral-200 dark:hover:bg-gray-700"}`}
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
                      className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-gray-700 text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-gray-200 flex items-center gap-1.5 text-xs"
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
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3 px-0.5 flex items-center gap-2">
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
                        const watchHref = `/unity-videos/shorts/yt/${short.slug}${params.toString() ? `?${params.toString()}` : ""}`
                        return (
                          <a
                            key={short.id}
                            href={watchHref}
                            onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                            className="shrink-0 w-[140px] sm:w-[160px] group block"
                          >
                            <div className="relative aspect-9/16 w-full rounded-xl overflow-hidden bg-neutral-200 dark:bg-gray-800">
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
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === shortsIndex ? "w-5 bg-purple-500" : "w-1.5 bg-neutral-400 dark:bg-gray-600 hover:bg-neutral-500 dark:hover:bg-gray-500"}`}
                        aria-label={`Shorts slide ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Filter bar + stats */}
          <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b border-neutral-200 dark:border-gray-800">
            {(["latest", "trending", "nonprofits", "supporter"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-purple-600 text-white hover:bg-purple-500"
                    : "bg-neutral-200 dark:bg-gray-800 text-neutral-700 dark:text-gray-300 hover:bg-neutral-300 dark:hover:bg-gray-700"
                }`}
              >
                {tab === "nonprofits" ? "Non-Profits" : tab === "supporter" ? "Supporter" : tab === "latest" ? "Latest" : "Trending"}
              </button>
            ))}
            {activeTab === "nonprofits" ? (
              <Popover
                open={orgDropdownOpen}
                onOpenChange={(open) => {
                  if (open) {
                    orgDropdownJustOpenedRef.current = true
                    setTimeout(() => { orgDropdownJustOpenedRef.current = false }, 200)
                    setOrgDropdownOpen(true)
                  } else {
                    if (orgDropdownJustOpenedRef.current) return
                    setOrgDropdownOpen(false)
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgDropdownOpen}
                    className="h-9 min-w-[220px] w-[280px] max-w-[320px] shrink-0 justify-between rounded-lg border-neutral-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-neutral-700 dark:text-gray-300 text-sm hover:bg-neutral-100 dark:hover:bg-gray-700 hover:text-neutral-900 dark:hover:text-gray-200"
                  >
                    <span className="truncate" title={orgDropdownDisplayName}>
                      {orgDropdownDisplayName}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[320px] min-w-[320px] p-0 rounded-lg border-neutral-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <Command className="rounded-lg border-0 bg-transparent" shouldFilter={false}>
                    <CommandInput
                      placeholder="Search organizations..."
                      value={orgSearchQuery}
                      onValueChange={setOrgSearchQuery}
                      className="h-11 border-b border-neutral-200 dark:border-gray-700 bg-neutral-50 dark:bg-gray-800/50 text-neutral-900 dark:text-gray-200 placeholder:text-neutral-400 dark:placeholder:text-gray-500 focus:ring-0 text-sm"
                    />
                    <CommandList className="max-h-[280px]">
                      {orgSearchLoading ? (
                        <div className="py-6 text-center text-sm text-neutral-500 dark:text-gray-400">Loading…</div>
                      ) : (
                        <>
                          <CommandEmpty>No organization found.</CommandEmpty>
                          <CommandGroup className="p-1">
                            <CommandItem
                              value="all"
                              onSelect={() => { handleOrgChange("all"); setOrgDropdownOpen(false) }}
                              className={cn(
                                "text-neutral-900 dark:text-gray-200 cursor-pointer rounded-md py-2.5",
                                orgFilter === "all" ? "bg-purple-600/30 text-white font-medium" : "hover:bg-neutral-100 dark:hover:bg-gray-700"
                              )}
                            >
                              <Check className={cn("mr-2 h-4 w-4 shrink-0", orgFilter === "all" ? "opacity-100" : "opacity-0")} />
                              All organizations
                            </CommandItem>
                            {(() => {
                              const hasValidSelectedId = orgFilter !== "all" && orgFilter !== "" && !Number.isNaN(Number(orgFilter))
                              const selectedOrg = hasValidSelectedId
                                ? { id: Number(orgFilter), name: selectedOrgName ?? nonprofitOrganizations.find((o) => String(o.id) === orgFilter)?.name ?? "Organization" }
                                : null
                              const selectedInResults = selectedOrg && orgSearchResults.some((o) => String(o.id) === orgFilter)
                              const orgsToShow = selectedOrg && !selectedInResults ? [selectedOrg, ...orgSearchResults] : orgSearchResults
                              return orgsToShow.map((org) => {
                                const isSelected = orgFilter === String(org.id)
                                return (
                                  <CommandItem
                                    key={org.id}
                                    value={String(org.id)}
                                    onSelect={() => { handleOrgChange(String(org.id), org.name); setOrgDropdownOpen(false) }}
                                    className={cn(
                                      "text-neutral-900 dark:text-gray-200 cursor-pointer rounded-md py-2.5",
                                      isSelected ? "bg-purple-600/30 text-white font-medium" : "hover:bg-neutral-100 dark:hover:bg-gray-700"
                                    )}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                                    {org.name}
                                  </CommandItem>
                                )
                              })
                            })()}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : null}
            <span className="text-sm text-neutral-500 dark:text-gray-500 ml-auto">
              ► {stats.total_videos} Imported Videos · {stats.livestream_replays} Livestream Replays
            </span>
          </div>

          {!hasContent ? (
            <div className="text-center py-16">
              <p className="text-neutral-500 dark:text-gray-400 mb-4">No videos found.</p>
              <p className="text-sm text-neutral-500 dark:text-gray-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                {filters.search?.trim() ? `Search results for "${filters.search.trim()}"` : activeTab === "latest" ? "Latest" : activeTab === "trending" ? "Trending" : activeTab === "supporter" ? "Supporter" : "Non-Profits"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {gridVideos.map((video) => {
                const params = new URLSearchParams()
                if (video.channel_slug) params.set("channel_slug", video.channel_slug)
                if (video.creator) params.set("creator", video.creator)
                if (video.creatorAvatar) params.set("creator_avatar", video.creatorAvatar)
                const q = params.toString()
                const watchHref = `/unity-videos/watch/yt/${video.slug}${q ? `?${q}` : ""}`
                return (
                  <div key={video.id} className="group block">
                    <a
                      href={watchHref}
                      onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                      className="block"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-gray-800">
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
                            <Play className="w-7 h-7 text-red-600 ml-1 fill-red-600" />
                          </div>
                        </div>
                      </div>
                    </a>
                    <div className="flex gap-3 mt-2">
                      <Avatar className="h-9 w-9 rounded-full shrink-0 border border-neutral-200 dark:border-gray-700">
                        {video.creatorAvatar && <AvatarImage src={video.creatorAvatar} alt={video.creator} />}
                        <AvatarFallback className="rounded-full bg-neutral-200 dark:bg-gray-700 text-neutral-600 dark:text-gray-300 text-xs">
                          {video.creator.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <a
                          href={watchHref}
                          onClick={(e) => { e.preventDefault(); window.location.href = watchHref }}
                          className="block"
                        >
                          <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {video.title}
                          </h3>
                        </a>
                        <p className="text-xs text-neutral-500 dark:text-gray-500 mt-0.5 truncate flex items-center gap-1 flex-wrap">
                          <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          {video.channel_slug ? (
                            <>
                              <button
                                type="button"
                                className="text-left truncate hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  router.visit(`/unity-videos/channel/${video.channel_slug}`)
                                }}
                              >
                                {video.creator}
                              </button>
                              <Link
                                href={`/unity-videos/channel/${video.channel_slug}`}
                                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {video.channel_slug === authUserChannelSlug ? "Visit Channel" : "Subscribe"}
                              </Link>
                            </>
                          ) : (
                            video.creator
                          )}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1.5 text-neutral-500 dark:text-gray-400">
                            <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            {video.views_formatted} views
                          </span>
                          {video.time_ago ? (
                            <>
                              <span className="text-neutral-400 dark:text-gray-600" aria-hidden>·</span>
                              <span>{video.time_ago}</span>
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
                          <span className="flex items-center gap-1 text-neutral-500 dark:text-gray-400">
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            {video.total_comment_count_formatted ?? video.comment_count_formatted ?? video.comment_count ?? 0}
                          </span>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-neutral-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
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
            {hasMore && (
              <div ref={loadMoreSentinelRef} className="min-h-[80px] flex items-center justify-center py-6">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-neutral-500 dark:text-gray-400 text-sm">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading more videos…
                  </div>
                )}
              </div>
            )}
            </>
          )}
          </main>

          {/* Right sidebar: Your YouTube Channel or Connect CTA */}
          <aside className="w-full lg:w-[320px] shrink-0 space-y-6">
            {myChannel ? (
              <div className="rounded-xl border border-neutral-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-500 mb-3">Your YouTube Channel</h3>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12 rounded-full border-2 border-neutral-200 dark:border-gray-700">
                    {myChannel.avatar && <AvatarImage src={myChannel.avatar} alt={myChannel.name} />}
                    <AvatarFallback className="rounded-full bg-neutral-200 dark:bg-gray-700 text-neutral-600 dark:text-gray-300 text-sm">{myChannel.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900 dark:text-white truncate flex items-center gap-1">
                      {myChannel.name}
                      <span className="text-blue-500 dark:text-blue-400" title="Verified">✓</span>
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-gray-500">{myChannel.subscriber_count_formatted} Subscribers</p>
                  </div>
                </div>
                {myChannel.channel_slug && (
                  <Link href={`/unity-videos/channel/${myChannel.channel_slug}`}>
                    <Button size="sm" className="w-full rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm mb-4">
                      Visit Channel
                    </Button>
                  </Link>
                )}
                <div className="flex gap-2 border-b border-neutral-200 dark:border-gray-800 pb-2 text-xs text-neutral-500 dark:text-gray-500">
                  <span>Home</span><span>Videos</span><span>Playlists</span><span>About</span>
                </div>
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {myChannel.preview_videos.map((pv) => (
                    <Link key={pv.slug} href={myChannel.channel_slug ? `/unity-videos/watch/yt/${pv.slug}?channel_slug=${encodeURIComponent(myChannel.channel_slug)}&creator=${encodeURIComponent(myChannel.name)}` : `/unity-videos/watch/yt/${pv.slug}`} className="shrink-0 w-[100px] block rounded-lg overflow-hidden bg-neutral-100 dark:bg-gray-800 group">
                      <div className="aspect-video relative">
                        <img src={pv.thumbnail_url} alt={pv.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        {pv.duration === "LIVE" ? (
                          <span className="absolute bottom-0.5 right-0.5 bg-red-600 text-white text-[10px] px-1 rounded">LIVE</span>
                        ) : pv.duration ? (
                          <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded">{pv.duration}</span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-gray-400 truncate px-1 py-0.5 line-clamp-2">{pv.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {(userOrgCanConnect && !userOrgHasYoutube) || !myChannel ? (
              <div className="rounded-xl border border-neutral-200 dark:border-gray-700/50 bg-white dark:bg-gray-900/80 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Youtube className="w-6 h-6 text-red-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Connect Your YouTube Channel</h3>
                </div>
                <p className="text-xs text-neutral-500 dark:text-gray-400 mb-3">To unlock all features of Unity Video Hub:</p>
                <ul className="space-y-2 text-xs text-neutral-500 dark:text-gray-400 mb-4">
                  <li className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-neutral-400 dark:text-gray-500 shrink-0" /> Enable automatic livestream replay storage</li>
                  <li className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-500 shrink-0" /> Import your YouTube videos into the Unity Video Hub</li>
                  <li className="flex items-center gap-2"><Brain className="w-4 h-4 text-neutral-400 dark:text-gray-500 shrink-0" /> Let Navigator AI learn from your video content for better insights.</li>
                </ul>
                {auth?.user ? (
                  <Button
                    type="button"
                    className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold"
                    onClick={() => { window.location.href = route("integrations.youtube.redirect"); }}
                  >
                    Connect Now
                  </Button>
                ) : (
                  <Link href={connectYoutubeUrl}>
                    <Button className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold">
                      Connect Now
                    </Button>
                  </Link>
                )}
              </div>
            ) : null}
          </aside>
        </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
