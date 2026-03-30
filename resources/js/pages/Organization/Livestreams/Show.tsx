"use client"

import { useState } from "react"
import { Head, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AppLayout from "@/layouts/app-layout"
import {
  Video,
  Copy,
  ExternalLink,
  Play,
  Square,
  Youtube,
  Users,
  Key,
  Info,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Code,
  FileText,
  ArrowLeft,
} from "lucide-react"
import { Link } from "@inertiajs/react"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  directorUrl: string
  participantUrl: string
  status: "draft" | "scheduled" | "live" | "ended" | "cancelled"
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  hasStreamKey: boolean
  youtubeBroadcastId: string | null
}

interface Organization {
  id: number
  name: string
  youtubeChannelUrl: string | null
}

interface Props {
  livestream: Livestream
  organization: Organization
}

export default function ShowLivestream({ livestream, organization }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [streamKey, setStreamKey] = useState("")
  const [isUpdatingStreamKey, setIsUpdatingStreamKey] = useState(false)

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const updateStatus = (status: string) => {
    setIsUpdatingStatus(true)
    router.patch(
      `/livestreams/${livestream.id}/status`,
      { status },
      {
        preserveScroll: true,
        onFinish: () => setIsUpdatingStatus(false),
      }
    )
  }

  const updateStreamKey = (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingStreamKey(true)
    router.patch(
      `/livestreams/${livestream.id}/stream-key`,
      { youtube_stream_key: streamKey },
      {
        preserveScroll: true,
        onFinish: () => {
          setIsUpdatingStreamKey(false)
          setStreamKey("")
        },
      }
    )
  }

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-500/20 text-gray-400" },
      scheduled: { label: "Scheduled", className: "bg-blue-500/20 text-blue-400" },
      live: { label: "Live", className: "bg-red-500/20 text-red-400 animate-pulse" },
      ended: { label: "Ended", className: "bg-gray-500/20 text-gray-400" },
      cancelled: { label: "Cancelled", className: "bg-red-500/20 text-red-400" },
    }
    const config = statusConfig[livestream.status] || statusConfig.draft
    return <Badge className={config.className}>{config.label}</Badge>
  }

  return (
    <AppLayout>
      <Head title={`Livestream: ${livestream.title || "Untitled"}`} />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Link href="/livestreams" className="inline-flex items-center text-gray-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Livestreams
        </Link>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {livestream.title || "Untitled Livestream"}
            </h1>
            <p className="text-gray-400">{organization.name}</p>
          </div>
          {getStatusBadge()}
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Host Dashboard</TabsTrigger>
            <TabsTrigger value="obs">OBS Setup</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                {livestream.status !== "live" && livestream.status !== "ended" && (
                  <Button
                    onClick={() => updateStatus("live")}
                    disabled={isUpdatingStatus}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Go Live
                  </Button>
                )}
                {livestream.status === "live" && (
                  <Button
                    onClick={() => updateStatus("ended")}
                    disabled={isUpdatingStatus}
                    variant="destructive"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    End Stream
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => window.open(livestream.directorUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Director Mode
                </Button>
              </CardContent>
            </Card>

            {/* Director Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Director Link (For You)
                </CardTitle>
                <CardDescription>
                  Use this link to control the stream and appear on screen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={livestream.directorUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(livestream.directorUrl, "director")}
                  >
                    <Copy className={`w-4 h-4 ${copied === "director" ? "text-green-400" : ""}`} />
                  </Button>
                </div>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Click "Enter the room's Control Center in the director's role" when the page opens.
                    This allows you to control the stream and appear on screen with guests.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Guest Link */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Guest Join Link
                </CardTitle>
                <CardDescription>
                  Share this link with your guests - no accounts needed!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={livestream.participantUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(livestream.participantUrl, "participant")}
                  >
                    <Copy className={`w-4 h-4 ${copied === "participant" ? "text-green-400" : ""}`} />
                  </Button>
                </div>
                <p className="text-sm text-gray-400">
                  Or use the public join page:{" "}
                  <a
                    href={`/livestreams/join/${livestream.roomName}`}
                    target="_blank"
                    className="text-[#FF1493] hover:underline"
                  >
                    /livestreams/join/{livestream.roomName}
                  </a>
                </p>
              </CardContent>
            </Card>

            {/* Room Details */}
            <Card>
              <CardHeader>
                <CardTitle>Room Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Room Name</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={livestream.roomName} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(livestream.roomName, "room")}
                    >
                      <Copy className={`w-4 h-4 ${copied === "room" ? "text-green-400" : ""}`} />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Room Password</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={livestream.roomPassword} readOnly className="font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(livestream.roomPassword, "password")}
                    >
                      <Copy className={`w-4 h-4 ${copied === "password" ? "text-green-400" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* YouTube Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="w-5 h-5" />
                  YouTube Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                {livestream.hasStreamKey ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Stream key configured - Ready to broadcast</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        No YouTube stream key configured. Add one in the Settings tab to enable OBS → YouTube streaming.
                      </AlertDescription>
                    </Alert>
                    {organization.youtubeChannelUrl && (
                      <p className="text-sm text-gray-400">
                        Your YouTube Channel:{" "}
                        <a
                          href={organization.youtubeChannelUrl}
                          target="_blank"
                          className="text-[#FF1493] hover:underline"
                        >
                          {organization.youtubeChannelUrl}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="obs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  OBS Studio Setup Guide
                </CardTitle>
                <CardDescription>
                  Connect guest feeds to OBS and stream to YouTube
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Step 1: Add Guest Feeds</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>Open OBS Studio</li>
                    <li>For each guest, click <strong>Sources → Add → Browser Source</strong></li>
                    <li>Paste the guest's VDO.Ninja participant URL</li>
                    <li>Set width: <code className="bg-gray-800 px-1 rounded">1920</code>, height: <code className="bg-gray-800 px-1 rounded">1080</code></li>
                    <li>Check "Shutdown source when not visible" and "Refresh browser when scene becomes active"</li>
                    <li>Repeat for each guest</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 2: Configure YouTube Stream</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>In OBS, go to <strong>Settings → Stream</strong></li>
                    <li>Service: <strong>YouTube</strong></li>
                    <li>Paste your YouTube Stream Key (get it from Settings tab if not set)</li>
                    <li>Click <strong>OK</strong></li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 3: Start Streaming</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>Arrange your guest feeds in OBS (resize, position, add graphics)</li>
                    <li>Click <strong>Start Streaming</strong> in OBS</li>
                    <li>Your stream will appear on YouTube Live</li>
                  </ol>
                </div>

                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Pro Tip:</strong> Create different OBS scenes for different layouts (2-person, panel, spotlight).
                    Switch between scenes during your stream for variety.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {!livestream.hasStreamKey && (
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-sm">⚠️ Stream Key Required</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 mb-4">
                    You need to add your YouTube stream key before you can broadcast. Go to the Settings tab to add it.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const settingsTab = document.querySelector('[value="settings"]') as HTMLElement
                      settingsTab?.click()
                    }}
                  >
                    Go to Settings
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  YouTube Stream Key
                </CardTitle>
                <CardDescription>
                  Add or update your YouTube stream key for OBS broadcasting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>How to get your Stream Key:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Go to <a href="https://studio.youtube.com" target="_blank" className="text-[#FF1493] hover:underline">YouTube Studio</a> → Go Live</li>
                      <li>Create a new stream or select an existing one</li>
                      <li>Copy the "Stream Key" (usually starts with characters like "rtmp://" or a long alphanumeric string)</li>
                      <li>Paste it below</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <form onSubmit={updateStreamKey}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="stream_key">Stream Key</Label>
                      <Input
                        id="stream_key"
                        type="password"
                        value={streamKey}
                        onChange={(e) => setStreamKey(e.target.value)}
                        placeholder="Paste your YouTube stream key here"
                        className="mt-1 font-mono text-sm"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isUpdatingStreamKey || !streamKey}
                      className="bg-gradient-to-r from-[#FF1493] to-[#DC143C]"
                    >
                      {isUpdatingStreamKey ? "Updating..." : livestream.hasStreamKey ? "Update Stream Key" : "Add Stream Key"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

