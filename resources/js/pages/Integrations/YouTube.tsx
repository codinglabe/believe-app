"use client"

import { useEffect, useState } from "react"
import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Youtube, ExternalLink, ArrowLeft, ThumbsUp, MessageCircle, Share2, Eye } from "lucide-react"
import { toast } from "react-hot-toast"
import { ChannelPageContent } from "@/components/frontend/ChannelPageContent"

interface ChannelPageData {
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
    platform_app_likes?: number
    platform_app_comments?: number
    platform_app_shares?: number
    platform_app_views?: number
  }
  videos: Array<{
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
  }>
  youtube_videos: Array<{
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
  }>
  shorts?: Array<{
    id: string
    slug: string
    title: string
    thumbnail_url: string
    views: number
    views_formatted: string
    channel_slug?: string
    creator?: string
    creatorAvatar?: string | null
  }>
}

interface Props {
  youtube_channel_url: string | null
  youtube_redirect_uri?: string | null
  channel_page?: ChannelPageData | null
}

export default function IntegrationsYouTube({ youtube_channel_url, youtube_redirect_uri, channel_page }: Props) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  useEffect(() => {
    if (flash?.success) toast.success(flash.success)
    if (flash?.error) toast.error(flash.error)
  }, [flash?.success, flash?.error])

  const isConnected = !!youtube_channel_url
  const showChannelFull = isConnected && channel_page

  return (
    <AppLayout>
      <Head title="YouTube - Integrations" />
      {showChannelFull ? (
        <div className="w-full bg-background min-h-screen">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <Link
              href={route("integrations.youtube")}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to YouTube Integration
            </Link>
            <div className="flex items-center gap-3">
              <a
                href={`/community-videos/channel/${channel_page.channel.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1.5"
              >
                Open public page
                <ExternalLink className="w-4 h-4" />
              </a>
              <DisconnectButton />
            </div>
          </div>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Platform engagement (on our site)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <ThumbsUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{(channel_page.channel.platform_app_likes ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Likes</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{(channel_page.channel.platform_app_comments ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Comments</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{(channel_page.channel.platform_app_shares ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Shares</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{(channel_page.channel.platform_app_views ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
              </div>
            </div>
          </div>
          <ChannelPageContent
            channel={channel_page.channel}
            videos={channel_page.videos}
            youtube_videos={channel_page.youtube_videos}
            shorts={channel_page.shorts ?? []}
            variant="dashboard"
          />
        </div>
      ) : (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Youtube className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">YouTube Integration</h1>
            <p className="text-muted-foreground text-sm">
              Connect your YouTube channel so your videos appear on Community Videos
            </p>
          </div>
        </div>

        {isConnected ? (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Channel connected</CardTitle>
              <CardDescription>
                      Your YouTube channel is linked. Videos from this channel are shown on your organization’s Community Videos page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisconnectButton />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-600" />
                Connect your channel
              </CardTitle>
              <CardDescription>
                Click the button below to sign in with Google and connect your YouTube channel. Your channel’s videos will then appear on your organization’s Community Videos page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                asChild
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <a
                  href={route("integrations.youtube.redirect")}
                  className="inline-flex items-center gap-2"
                >
                  <Youtube className="w-5 h-5" />
                  Connect with YouTube
                </a>
              </Button>
              {youtube_redirect_uri && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Getting &quot;redirect_uri_mismatch&quot;?
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                    Add this <strong>exact</strong> URL under Authorized redirect URIs in Google Cloud Console → APIs &amp; Services → Credentials → your OAuth client:
                  </p>
                  <code className="block text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-amber-200 dark:border-amber-800 break-all select-all">
                    {youtube_redirect_uri}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      )}
    </AppLayout>
  )
}

function DisconnectButton() {
  const [disconnecting, setDisconnecting] = useState(false)

  const handleDisconnect = () => {
    if (!confirm("Disconnect your YouTube channel? Your videos will no longer appear on Community Videos.")) return
    setDisconnecting(true)
    router.put(route("integrations.youtube.update"), { youtube_channel_url: null }, {
      preserveScroll: true,
      onFinish: () => setDisconnecting(false),
      onSuccess: () => toast.success("YouTube channel disconnected."),
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={handleDisconnect}
      disabled={disconnecting}
    >
      {disconnecting ? "Disconnecting…" : "Disconnect"}
    </Button>
  )
}
