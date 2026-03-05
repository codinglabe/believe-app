"use client"

import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { Youtube } from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { toast } from "react-hot-toast"

interface MyChannel {
  name: string
  avatar: string | null
  subscriber_count: number
  subscriber_count_formatted: string
  channel_slug: string | null
}

interface Props {
  youtube_channel_url: string | null
  myChannel?: MyChannel | null
}

export default function ProfileIntegrations({ youtube_channel_url, myChannel = null }: Props) {
  const isConnected = !!youtube_channel_url

  const handleConnect = () => {
    window.location.href = route("integrations.youtube.redirect")
  }

  const handleDisconnect = () => {
    if (!confirm("Disconnect your YouTube channel? Your videos will no longer appear on Unity Videos.")) return
    router.put(route("integrations.youtube.update"), { youtube_channel_url: null }, {
      preserveScroll: true,
      onSuccess: () => toast.success("YouTube channel disconnected."),
    })
  }

  return (
    <ProfileLayout title="Integrations" description="Connect your YouTube channel to Unity Videos">
      <PageHead title="Integrations - Profile" description="Manage your YouTube channel connection for Unity Videos." />
      <div className="max-w-2xl space-y-6">
        {/* Channel-style card when connected */}
        {isConnected && myChannel ? (
          <div className="rounded-xl border border-gray-700/50 bg-gray-900/80 dark:bg-gray-900/80 p-4 sm:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Your YouTube Channel</h3>
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 rounded-full border-2 border-gray-700 shrink-0">
                {myChannel.avatar && <AvatarImage src={myChannel.avatar} alt={myChannel.name} />}
                <AvatarFallback className="rounded-full bg-gray-700 text-gray-300 text-sm">
                  {myChannel.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white dark:text-white truncate flex items-center gap-1">
                  {myChannel.name}
                  <span className="text-blue-400" title="Verified">✓</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{myChannel.subscriber_count_formatted} Subscribers</p>
              </div>
            </div>
            {myChannel.channel_slug && (
              <Link href={`/unity-videos/channel/${myChannel.channel_slug}`}>
                <Button size="sm" className="w-full rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm mb-4">
                  Visit Channel
                </Button>
              </Link>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Your videos are shown on your Unity Videos page.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={handleDisconnect}
            >
              Disconnect channel
            </Button>
          </div>
        ) : isConnected ? (
          /* Fallback when connected but no channel data */
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">YouTube</CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Your YouTube channel is linked.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDisconnect}
              >
                Disconnect channel
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Not connected: simple connect card */
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Youtube className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">YouTube</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Connect your channel so your videos appear on Unity Videos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Connect your YouTube channel to have your videos appear on Unity Videos.
              </p>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConnect}
              >
                <Youtube className="w-4 h-4 mr-2" />
                Connect with YouTube
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProfileLayout>
  )
}
