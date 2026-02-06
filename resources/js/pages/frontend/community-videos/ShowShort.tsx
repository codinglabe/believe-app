"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { ShortsVideoPlayer } from "@/components/frontend/ShortsVideoPlayer"

interface VideoData {
  id: string
  title: string
  likes_formatted?: string
  comment_count_formatted?: string
  channel_slug?: string | null
  creator?: string | null
  creatorAvatar?: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  video: VideoData
}

export default function CommunityVideoShowShort({ seo, video }: Props) {
  return (
    <FrontendLayout>
      <PageHead title={seo?.title ?? video.title} description={seo?.description} />
      <div className="min-h-screen bg-black">
        <ShortsVideoPlayer
          videoId={video.id}
          title={video.title}
          likesFormatted={video.likes_formatted ?? "0"}
          commentCountFormatted={video.comment_count_formatted ?? "0"}
          channelSlug={video.channel_slug ?? undefined}
          creator={video.creator ?? undefined}
          creatorAvatar={video.creatorAvatar ?? undefined}
          className="min-h-[100dvh]"
        />
      </div>
    </FrontendLayout>
  )
}
