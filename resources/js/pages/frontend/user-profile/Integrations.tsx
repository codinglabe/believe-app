"use client"

import { useState } from "react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Youtube, Cloud, Link2Off, Megaphone } from "lucide-react"
import { Link, router } from "@inertiajs/react"
import { toast } from "react-hot-toast"

/** Set to false when YouTube OAuth connect is ready to ship. */
const YOUTUBE_INTEGRATION_COMING_SOON = true

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
  dropboxLinked?: boolean
}

export default function ProfileIntegrations({ youtube_channel_url, myChannel = null, dropboxLinked = false }: Props) {
  const isConnected = !!youtube_channel_url
  const [youtubeDisconnectOpen, setYoutubeDisconnectOpen] = useState(false)
  const [dropboxDisconnectOpen, setDropboxDisconnectOpen] = useState(false)
  const [youtubeDisconnecting, setYoutubeDisconnecting] = useState(false)
  const [dropboxDisconnecting, setDropboxDisconnecting] = useState(false)

  // const handleConnect = () => {
  //   window.location.href = route("integrations.youtube.redirect") + "?upload=1"
  // }

  const handleDisconnect = () => {
    setYoutubeDisconnectOpen(true)
  }

  const confirmDisconnectYoutube = () => {
    setYoutubeDisconnecting(true)
    router.put(route("integrations.youtube.update"), { youtube_channel_url: null }, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("YouTube channel disconnected.")
        setYoutubeDisconnectOpen(false)
      },
      onFinish: () => setYoutubeDisconnecting(false),
    })
  }

  const handleDisconnectDropbox = () => {
    setDropboxDisconnectOpen(true)
  }

  const confirmDisconnectDropbox = () => {
    setDropboxDisconnecting(true)
    router.post(route("integrations.dropbox.disconnect"), {}, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Dropbox disconnected.")
        setDropboxDisconnectOpen(false)
      },
      onFinish: () => setDropboxDisconnecting(false),
    })
  }

  return (
    <ProfileLayout title="Integrations" description="Connect your YouTube channel and Dropbox">
      <PageHead title="Integrations - Profile" description="Manage your YouTube channel and Dropbox for recordings." />
<div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* YouTube */}
        <div className="min-w-0">
        {YOUTUBE_INTEGRATION_COMING_SOON ? (
          <Card className="bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 h-full flex flex-col rounded-xl shadow-sm overflow-hidden">
            <CardContent className="flex flex-col items-center text-center px-6 py-8 sm:py-10 flex-1">
              <div className="w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center shrink-0 mb-5">
                <Youtube className="w-8 h-8 text-white" aria-hidden />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                <CardTitle className="text-gray-900 dark:text-white text-lg mb-0">YouTube</CardTitle>
                <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-medium text-white">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-8">
                YouTube integration is coming soon.
                <br />
                We&apos;re working on bringing this feature to you.
              </p>
              <div
                className="mt-auto w-full max-w-[220px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600/70 px-8 py-10 flex items-center justify-center"
                aria-hidden
              >
                <div className="relative">
                  <Megaphone
                    className="h-16 w-16 text-violet-500 dark:text-violet-400"
                    strokeWidth={1.5}
                    fill="currentColor"
                    fillOpacity={0.15}
                  />
                  <span className="absolute -right-3 top-2 h-1 w-4 rounded-full bg-amber-400/90 rotate-[25deg]" />
                  <span className="absolute -right-5 top-5 h-1 w-5 rounded-full bg-amber-400/70 rotate-[15deg]" />
                  <span className="absolute -right-4 top-8 h-1 w-3 rounded-full bg-amber-400/50 rotate-[5deg]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isConnected && myChannel ? (
          <div className="rounded-xl border border-gray-700/50 bg-gray-900/80 dark:bg-gray-900/80 p-5 sm:p-6 h-full flex flex-col shadow-sm">
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
              Add videos from the Import YouTube Video panel on the Unity Videos page.
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
          <Card className="bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 h-full flex flex-col rounded-xl shadow-sm">
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
          <Card className="bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 h-full flex flex-col rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <Youtube className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-gray-900 dark:text-white text-lg">YouTube</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                    Connect your channel so your videos appear on Unity Videos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* <Button
                type="button"
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white rounded-lg"
                onClick={handleConnect}
              >
                <Youtube className="w-4 h-4 mr-2" />
                Connect with YouTube
              </Button> */}
            </CardContent>
          </Card>
        )}
        </div>

        {/* Dropbox */}
        <div className="min-w-0">
        <Card className="bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 h-full flex flex-col rounded-xl shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Cloud className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-gray-900 dark:text-white text-lg">Dropbox</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                  {dropboxLinked
                    ? "Meeting recordings are saved to your Dropbox. View and manage your recordings."
                    : "Connect Dropbox to save meeting recordings from your livestreams."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/integrations/dropbox">
                <Button
                  type="button"
                  variant={dropboxLinked ? "outline" : "default"}
                  className={!dropboxLinked ? "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg" : "rounded-lg"}
                >
                  <Cloud className="w-4 h-4 mr-2" />
                  {dropboxLinked ? "View recordings" : "Connect Dropbox"}
                </Button>
              </Link>
              {dropboxLinked && (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={handleDisconnectDropbox}
                >
                  <Link2Off className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* YouTube disconnect confirmation modal */}
      <Dialog open={youtubeDisconnectOpen} onOpenChange={setYoutubeDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect YouTube channel?</DialogTitle>
            <DialogDescription>
              Your videos will no longer appear on Unity Videos. You can reconnect your channel anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYoutubeDisconnectOpen(false)} disabled={youtubeDisconnecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisconnectYoutube}
              disabled={youtubeDisconnecting}
              className="gap-2"
            >
              <Link2Off className="h-4 w-4 shrink-0" />
              {youtubeDisconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dropbox disconnect confirmation modal */}
      <Dialog open={dropboxDisconnectOpen} onOpenChange={setDropboxDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Dropbox?</DialogTitle>
            <DialogDescription>
              New recordings will no longer be saved to your Dropbox. Your existing files in Dropbox will not be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDropboxDisconnectOpen(false)} disabled={dropboxDisconnecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisconnectDropbox}
              disabled={dropboxDisconnecting}
              className="gap-2"
            >
              <Link2Off className="h-4 w-4 shrink-0" />
              {dropboxDisconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProfileLayout>
  )
}
