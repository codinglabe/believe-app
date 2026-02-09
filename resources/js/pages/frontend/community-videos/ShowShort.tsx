"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { ShortsVideoPlayer } from "@/components/frontend/ShortsVideoPlayer"
import { route } from "ziggy-js"
import axios from "axios"

interface VideoData {
  id: string
  title: string
  likes_formatted?: string
  comment_count_formatted?: string
  total_likes?: number
  total_likes_formatted?: string
  total_comment_count_formatted?: string
  user_liked?: boolean
  app_likes?: number
  channel_slug?: string | null
  creator?: string | null
  creatorAvatar?: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  video: VideoData
}

function formatCount(n: number) {
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n)
}

export default function CommunityVideoShowShort({ seo, video: initialVideo }: Props) {
  const [video, setVideo] = useState(initialVideo)
  const [likeLoading, setLikeLoading] = useState(false)

  const likesFormatted = video.total_likes_formatted ?? video.likes_formatted ?? "0"
  const commentCountFormatted = video.total_comment_count_formatted ?? video.comment_count_formatted ?? "0"

  const handleLike = async () => {
    setLikeLoading(true)
    try {
      const { data } = await axios.post(route("community-videos.engagement.like"), {
        video_id: video.id,
        source: "yt",
        channel_slug: video.channel_slug ?? undefined,
      })
      const newLiked = data.liked === true
      const newAppLikes = Number(data.app_likes) ?? 0
      setVideo((v) => {
        const ytLikes = (v.total_likes ?? 0) - (v.app_likes ?? 0)
        const newTotal = ytLikes + newAppLikes
        return {
          ...v,
          user_liked: newLiked,
          app_likes: newAppLikes,
          total_likes: newTotal,
          total_likes_formatted: formatCount(newTotal),
        }
      })
    } catch {
      window.location.href = route("login") + "?redirect=" + encodeURIComponent(window.location.pathname + window.location.search)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/community-videos/shorts/yt/${video.id}${video.channel_slug ? `?channel_slug=${encodeURIComponent(video.channel_slug)}&creator=${encodeURIComponent(video.creator ?? "")}` : ""}`
    try {
      await axios.post(route("community-videos.engagement.share"), {
        video_id: video.id,
        source: "yt",
        channel_slug: video.channel_slug ?? undefined,
      })
    } catch (_) {}
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title ?? "Short", url })
      } catch {
        await navigator.clipboard.writeText(url)
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? video.title} description={seo?.description} />
      <div className="min-h-screen bg-black">
        <ShortsVideoPlayer
          videoId={video.id}
          title={video.title}
          likesFormatted={likesFormatted}
          commentCountFormatted={commentCountFormatted}
          userLiked={video.user_liked}
          likeLoading={likeLoading}
          onLike={handleLike}
          onShare={handleShare}
          channelSlug={video.channel_slug ?? undefined}
          creator={video.creator ?? undefined}
          creatorAvatar={video.creatorAvatar ?? undefined}
          className="min-h-[100dvh]"
        />
      </div>
    </FrontendLayout>
  )
}
