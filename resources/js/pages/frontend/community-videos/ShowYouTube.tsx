"use client"

import { useState, useEffect } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Link, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { PageHead } from "@/components/frontend/PageHead"
import { CommunityVideoPlayer } from "@/components/frontend/CommunityVideoPlayer"
import { Button } from "@/components/frontend/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Building2, ArrowLeft, ChevronDown, ChevronUp, MessageCircle, Heart } from "lucide-react"
import axios from "axios"

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
  app_likes?: number
  app_comment_count?: number
  app_shares?: number
  user_liked?: boolean
  total_likes_formatted?: string
  total_comment_count_formatted?: string
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

interface AppCommentItem {
  id: number
  body: string
  created_at: string
  time_ago: string
  user: { id: number; name: string; avatar: string | null }
}

interface Props {
  seo?: { title?: string; description?: string }
  video: VideoData
  moreVideos?: MoreVideoItem[]
  comments?: CommentItem[]
  appComments?: AppCommentItem[]
}

export default function CommunityVideoShowYouTube({ seo, video: initialVideo, moreVideos = [], comments = [], appComments: initialAppComments = [] }: Props) {
  const { auth } = usePage().props as { auth?: { user?: { id: number } } }
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [video, setVideo] = useState(initialVideo)
  const [appComments, setAppComments] = useState<AppCommentItem[]>(initialAppComments)
  const [likeLoading, setLikeLoading] = useState(false)
  const [commentBody, setCommentBody] = useState("")
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const descriptionPreview = video.description ? (video.description.length > 150 ? video.description.slice(0, 150) + "…" : video.description) : ""
  const hasMoreDescription = video.description && video.description.length > 150

  const totalLikesFormatted = video.total_likes_formatted ?? video.likes_formatted ?? String(video.likes ?? 0)
  const totalCommentFormatted = video.total_comment_count_formatted ?? video.comment_count_formatted ?? String(video.comment_count ?? 0)

  useEffect(() => {
    if (!auth?.user?.id) return
    axios.post(route("community-videos.engagement.view"), {
      video_id: video.id,
      source: "yt",
      channel_slug: video.channel_slug ?? undefined,
    }).catch(() => {})
  }, [video.id, video.channel_slug, auth?.user?.id])

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!auth?.user?.id) {
      window.location.href = route("login") + "?redirect=" + encodeURIComponent(window.location.pathname + window.location.search)
      return
    }
    setLikeLoading(true)
    try {
      const { data } = await axios.post(route("community-videos.engagement.like"), {
        video_id: video.id,
        source: "yt",
        channel_slug: video.channel_slug ?? undefined,
      })
      const newLiked = data.liked === true
      const newAppLikes = Number(data.app_likes) ?? 0
      setVideo((v) => ({
        ...v,
        user_liked: newLiked,
        app_likes: newAppLikes,
        total_likes_formatted: numberFormat((v.likes ?? 0) + newAppLikes),
      }))
    } catch (_) {
      setLikeLoading(false)
    } finally {
      setLikeLoading(false)
    }
  }

  function numberFormat(n: number) {
    return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/community-videos/watch/yt/${video.id}${video.channel_slug ? `?channel_slug=${encodeURIComponent(video.channel_slug)}&creator=${encodeURIComponent(video.creator ?? "")}` : ""}`
    try {
      await axios.post(route("community-videos.engagement.share"), {
        video_id: video.id,
        source: "yt",
        channel_slug: video.channel_slug ?? undefined,
      })
    } catch (_) {}
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url })
      } catch {
        await navigator.clipboard.writeText(url)
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth?.user?.id || !commentBody.trim()) return
    setCommentSubmitting(true)
    try {
      const { data } = await axios.post(route("community-videos.engagement.comment"), {
        video_id: video.id,
        source: "yt",
        body: commentBody.trim(),
        channel_slug: video.channel_slug ?? undefined,
      })
      setAppComments((prev) => [data.comment, ...prev])
      setVideo((v) => ({
        ...v,
        app_comment_count: data.app_comment_count,
        total_comment_count_formatted: numberFormat((video.comment_count ?? 0) + data.app_comment_count),
      }))
      setCommentBody("")
    } finally {
      setCommentSubmitting(false)
    }
  }

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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`rounded-full h-9 gap-1 ${video.user_liked ? "text-red-500 dark:text-red-400" : ""}`}
                      onClick={handleLike}
                      disabled={likeLoading}
                    >
                      {video.user_liked ? <Heart className="w-4 h-4 fill-current" /> : <ThumbsUp className="w-4 h-4" />}
                      {totalLikesFormatted}
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full h-9">
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full h-9 gap-1" onClick={handleShare}>
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

                {/* Comments: YouTube + app comments */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    {totalCommentFormatted} comments
                  </h3>
                  {auth?.user ? (
                    <form
                      onSubmit={handleCommentSubmit}
                      className="mb-6 flex gap-2"
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Add a comment..."
                        className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500"
                        maxLength={5000}
                      />
                      <Button type="submit" size="sm" disabled={!commentBody.trim() || commentSubmitting} className="rounded-lg">
                        {commentSubmitting ? "…" : "Comment"}
                      </Button>
                    </form>
                  ) : (
                    <Link
                      href={route("login") + "?redirect=" + encodeURIComponent(window.location.pathname + window.location.search)}
                      className="inline-block mb-6 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Sign in to add a comment
                    </Link>
                  )}
                  {appComments.length > 0 && (
                    <ul className="space-y-4 mb-4">
                      {appComments.map((c) => (
                        <li key={c.id} className="flex gap-3">
                          <Avatar className="h-9 w-9 rounded-full shrink-0">
                            {c.user.avatar ? <AvatarImage src={c.user.avatar} alt={c.user.name} /> : null}
                            <AvatarFallback className="rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs">
                              {(c.user.name || "?").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {c.user.name}
                              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">{c.time_ago}</span>
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
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
