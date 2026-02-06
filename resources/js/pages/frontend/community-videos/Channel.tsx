"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { ChannelPageContent, type VideoItem, type YouTubeVideoItem, type ShortItem } from "@/components/frontend/ChannelPageContent"

interface Props {
  seo?: { title?: string; description?: string }
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
}

export default function CommunityVideosChannel({ seo, channel, videos, youtube_videos = [], shorts = [] }: Props) {
  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? `${channel.name} - Community Videos`}
        description={seo?.description}
      />
      <ChannelPageContent
        channel={channel}
        videos={videos}
        youtube_videos={youtube_videos}
        shorts={shorts}
        backLink={{ href: "/community-videos", label: "Back to Community Videos" }}
      />
    </FrontendLayout>
  )
}
