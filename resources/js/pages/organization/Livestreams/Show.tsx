"use client"

import { useState, useEffect } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { startOBSStream, stopOBSStream } from "@/lib/obsLivestream"
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
  youtubeGoLiveEnabled?: boolean
  pushLink?: string | null
  viewLink?: string | null
  streamKeyDisplay?: string | null
  rtmpUrl?: string | null
}

const DEFAULT_OBS_WS = "ws://127.0.0.1:4455"

interface Organization {
  id: number
  name: string
  youtubeChannelUrl: string | null
}

interface Props {
  livestream: Livestream
  organization: Organization
  mediamtxEnabled?: boolean
}

export default function ShowLivestream({ livestream, organization, mediamtxEnabled = false }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [streamKey, setStreamKey] = useState("")
  const [isUpdatingStreamKey, setIsUpdatingStreamKey] = useState(false)
  const [youtubeStep, setYoutubeStep] = useState(1)
  const [isGoingLive, setIsGoingLive] = useState(false)
  const [isGoingLiveBrowser, setIsGoingLiveBrowser] = useState(false)
  const [isGoingLiveOBS, setIsGoingLiveOBS] = useState(false)
  const [obsError, setObsError] = useState<string | null>(null)
  const [obsUrl, setObsUrl] = useState(DEFAULT_OBS_WS)
  const [obsPassword, setObsPassword] = useState("")
  const { props } = usePage<{ errors?: { go_live?: string }; browser_publish_url?: string | null }>()
  const goLiveError = props.errors?.go_live ?? null

  useEffect(() => {
    const url = props.browser_publish_url
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer,width=800,height=600")
    }
  }, [props.browser_publish_url])

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

  const handleYoutubeGoLive = () => {
    setIsGoingLive(true)
    router.post(`/livestreams/${livestream.id}/go-live`, {}, {
      preserveScroll: true,
      onFinish: () => setIsGoingLive(false),
    })
  }

  const handleGoLiveBrowser = () => {
    setIsGoingLiveBrowser(true)
    router.post(`/livestreams/${livestream.id}/go-live-browser`, {}, {
      preserveScroll: true,
      onFinish: () => setIsGoingLiveBrowser(false),
    })
  }

  const handleGoLiveWithOBS = async () => {
    if (!livestream.viewLink || !livestream.streamKeyDisplay) {
      setObsError("Missing stream key or view link")
      return
    }
    const rtmpServer = livestream.rtmpUrl || "rtmp://a.rtmp.youtube.com/live2"
    setObsError(null)
    setIsGoingLiveOBS(true)
    try {
      await startOBSStream({
        obsUrl: obsUrl || DEFAULT_OBS_WS,
        obsPassword: obsPassword || undefined,
        rtmpServer,
        streamKey: livestream.streamKeyDisplay,
        viewUrl: livestream.viewLink,
      })
      router.post(`/livestreams/${livestream.id}/go-live-obs-auto`, {}, { preserveScroll: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg && typeof msg === "string" && (msg.includes("authentication") || msg.includes("missing"))) {
        setObsError("OBS is asking for a password. In OBS go to Tools → WebSocket Server Settings and uncheck \"Enable Authentication\", then try again. No password needed.")
      } else {
        setObsError(msg || "Could not connect to OBS. Is OBS open? In OBS: Tools → WebSocket Server Settings → enable the server and uncheck \"Enable Authentication\".")
      }
    } finally {
      setIsGoingLiveOBS(false)
    }
  }

  const handleEndStream = () => {
    setIsUpdatingStatus(true)
    stopOBSStream(true).catch(() => {})
    router.post(`/livestreams/${livestream.id}/end-stream`, {}, {
      preserveScroll: true,
      onFinish: () => setIsUpdatingStatus(false),
    })
  }

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30" },
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" },
      live: { label: "Live", className: "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40 animate-pulse" },
      ended: { label: "Ended", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30" },
      cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30" },
    }
    const config = statusConfig[livestream.status] || statusConfig.draft
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  return (
    <AppLayout>
      <Head title={`Livestream: ${livestream.title || "Untitled"}`} />
      <div className="w-full px-4 py-8 md:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6">
          <Link
            href="/livestreams"
            className="inline-flex w-fit items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Livestreams
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {livestream.title || "Untitled Livestream"}
              </h1>
              <p className="mt-1 text-muted-foreground">{organization.name}</p>
            </div>
            {getStatusBadge()}
          </div>
        </header>

        <Tabs defaultValue={livestream.youtubeGoLiveEnabled ? "youtube-live" : "dashboard"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Host Dashboard</TabsTrigger>
            {livestream.youtubeGoLiveEnabled && (
              <TabsTrigger value="youtube-live">YouTube Live</TabsTrigger>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {livestream.youtubeGoLiveEnabled && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Info className="h-4 w-4" />
                    Go live in one click (after one-time OBS setup)
                  </CardTitle>
                  <CardDescription>Set up OBS once with WebSocket and no password; then just click &quot;Go Live with OBS (auto)&quot; — the app configures OBS and starts the stream.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">One-time setup (do once)</p>
                  <ol className="list-decimal space-y-2 pl-6">
                    <li>Install OBS from obsproject.com on the same computer where you open this app.</li>
                    <li>In OBS: <strong className="text-foreground">Tools</strong> → <strong className="text-foreground">WebSocket Server Settings</strong> → enable the server, leave port <strong className="text-foreground">4455</strong>, and <strong className="text-foreground">uncheck &quot;Enable Authentication&quot;</strong> so you never need a password. Click OK.</li>
                  </ol>
                  <p className="font-medium text-foreground">Every time you go live</p>
                  <ul className="list-disc space-y-1 pl-6">
                    <li>Open OBS (you can minimize it) and this livestream page on the same computer.</li>
                    <li>For video in the stream: open <strong className="text-foreground">Director Mode</strong> or the <strong className="text-foreground">Push (Host)</strong> link and allow camera.</li>
                    <li>Click <strong className="text-red-600 dark:text-red-400">Go Live with OBS (auto)</strong>. The app will set up the scene, add your screen, and start streaming — no other steps.</li>
                    <li><strong className="text-foreground">Monitor:</strong> If the wrong screen is captured, in OBS double-click the <strong className="text-foreground">&quot;My Screen&quot;</strong> source → <strong className="text-foreground">Display</strong> dropdown → select the monitor you want (e.g. the one that says &quot;Primary Monitor&quot;).</li>
                    <li>Click <strong className="text-foreground">End Stream</strong> when done.</li>
                  </ul>
                </CardContent>
              </Card>
            )}
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {(goLiveError || obsError) && (
                  <Alert variant="destructive">
                    <AlertDescription>{goLiveError || obsError}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap gap-4">
                {livestream.status !== "live" && livestream.status !== "ended" && (
                  <>
                    {livestream.youtubeGoLiveEnabled && (
                      <Button
                        onClick={handleGoLiveWithOBS}
                        disabled={isGoingLiveOBS || !livestream.viewLink || !livestream.streamKeyDisplay}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isGoingLiveOBS ? "Starting OBS…" : "Go Live with OBS (auto)"}
                      </Button>
                    )}
                    {mediamtxEnabled && livestream.youtubeGoLiveEnabled && (
                      <Button
                        onClick={handleGoLiveBrowser}
                        disabled={isGoingLiveBrowser}
                        variant="outline"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {isGoingLiveBrowser ? "Opening…" : "Go Live from browser (no OBS)"}
                      </Button>
                    )}
                    {livestream.youtubeGoLiveEnabled && (
                      <Button
                        onClick={handleYoutubeGoLive}
                        disabled={isUpdatingStatus || isGoingLive}
                        variant="outline"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Go Live (manual OBS)
                      </Button>
                    )}
                    {!livestream.youtubeGoLiveEnabled && (
                      <Button
                        onClick={() => updateStatus("live")}
                        disabled={isUpdatingStatus}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Go Live
                      </Button>
                    )}
                  </>
                )}
                {livestream.status === "live" && (
                  <Button
                    onClick={handleEndStream}
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
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Director Link */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
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
                      <Copy className={`h-4 w-4 ${copied === "director" ? "text-green-600 dark:text-green-400" : ""}`} />
                    </Button>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Click &quot;Enter the room&apos;s Control Center in the director&apos;s role&quot; when the page opens.
                      This allows you to control the stream and appear on screen with guests.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Guest Link */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
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
                      <Copy className={`h-4 w-4 ${copied === "participant" ? "text-green-600 dark:text-green-400" : ""}`} />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Or use the public join page:{" "}
                    <a
                      href={`/livestreams/join/${livestream.roomName}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      /livestreams/join/{livestream.roomName}
                    </a>
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Room Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Room Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Room Name</Label>
                    <div className="mt-1 flex gap-2">
                      <Input value={livestream.roomName} readOnly className="font-mono" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(livestream.roomName, "room")}
                      >
                        <Copy className={`h-4 w-4 ${copied === "room" ? "text-green-600 dark:text-green-400" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Room Password</Label>
                    <div className="mt-1 flex gap-2">
                      <Input value={livestream.roomPassword} readOnly className="font-mono" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(livestream.roomPassword, "password")}
                      >
                        <Copy className={`h-4 w-4 ${copied === "password" ? "text-green-600 dark:text-green-400" : ""}`} />
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
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
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
                      <p className="text-sm text-muted-foreground">
                        Your YouTube Channel:{" "}
                        <a
                          href={organization.youtubeChannelUrl}
                          target="_blank"
                          className="text-primary hover:underline"
                        >
                          {organization.youtubeChannelUrl}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              </Card>
            </div>
          </TabsContent>

          {livestream.youtubeGoLiveEnabled && livestream.directorUrl && livestream.viewLink && livestream.streamKeyDisplay && (
            <TabsContent value="youtube-live" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
                <div className="lg:col-span-8 bg-black border border-border rounded-lg overflow-hidden relative">
                  <iframe
                    src={livestream.directorUrl}
                    title="VDO.Ninja Director (Meeting Preview)"
                    className="w-full h-full"
                    allow="camera; microphone; display-capture; autoplay"
                  />
                  {livestream.status === "live" && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1 rounded font-bold animate-pulse">
                      ● LIVE ON YOUTUBE
                    </div>
                  )}
                </div>
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <Card className={youtubeStep === 1 ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/5 dark:border-yellow-500" : ""}>
                    <CardHeader>
                      <CardTitle className="text-base">Step 1: Setup OBS</CardTitle>
                      <CardDescription>Open OBS on your computer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">OBS Browser Source URL</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={livestream.viewLink} readOnly className="font-mono text-xs bg-muted" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(livestream.viewLink!, "view")}>
                            <Copy className={`w-4 h-4 ${copied === "view" ? "text-green-600 dark:text-green-400" : ""}`} />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">OBS Stream Key</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={livestream.streamKeyDisplay!} readOnly type="password" className="font-mono text-xs bg-muted" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(livestream.streamKeyDisplay!, "streamkey")}>
                            <Copy className={`w-4 h-4 ${copied === "streamkey" ? "text-green-600 dark:text-green-400" : ""}`} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">In OBS: Settings → Stream → Service: YouTube. Paste server (RTMP) and key.</p>
                    </CardContent>
                  </Card>
                  <Card className={youtubeStep === 2 ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/5 dark:border-yellow-500" : ""}>
                    <CardHeader>
                      <CardTitle className="text-base">Step 2: Start engine</CardTitle>
                      <CardDescription>Click &quot;Start Streaming&quot; inside OBS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="secondary" className="w-full" onClick={() => setYoutubeStep(3)}>
                        I have started OBS
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className={youtubeStep === 3 ? "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/5" : ""}>
                    <CardHeader>
                      <CardTitle className="text-base">Step 3: Go live</CardTitle>
                      <CardDescription>Wait ~10 seconds for YouTube to receive signal, then click below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(goLiveError || obsError) && (
                        <Alert variant="destructive">
                          <AlertDescription>{goLiveError || obsError}</AlertDescription>
                        </Alert>
                      )}
                      {livestream.status !== "live" && (
                        <>
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700 mb-2"
                            onClick={handleGoLiveWithOBS}
                            disabled={isGoingLiveOBS || !livestream.viewLink || !livestream.streamKeyDisplay}
                          >
                            {isGoingLiveOBS ? "Starting OBS…" : "Go Live with OBS (auto)"}
                          </Button>
                          {mediamtxEnabled && (
                            <Button
                              className="w-full bg-green-600 hover:bg-green-700 mb-2"
                              onClick={handleGoLiveBrowser}
                              disabled={isGoingLiveBrowser}
                            >
                              {isGoingLiveBrowser ? "Opening…" : "Go Live from browser (no OBS)"}
                            </Button>
                          )}
                        </>
                      )}
                      {livestream.status === "live" ? (
                        <div className="space-y-3 text-center">
                          <div className="text-green-600 font-bold dark:text-green-400">STREAM IS PUBLIC!</div>
                          <p className="text-sm text-muted-foreground">View and share your live stream on YouTube:</p>
                          <Button
                            asChild
                            className="w-full bg-red-600 hover:bg-red-700"
                          >
                            <a
                              href={livestream.youtubeBroadcastId ? `https://www.youtube.com/watch?v=${livestream.youtubeBroadcastId}` : "https://www.youtube.com/live"}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Youtube className="w-4 h-4 mr-2" />
                              Watch on YouTube
                            </a>
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleEndStream}
                            disabled={isUpdatingStatus}
                          >
                            <Square className="w-4 h-4 mr-2" />
                            {isUpdatingStatus ? "Ending…" : "End Stream"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            className="w-full bg-gray-600 hover:bg-gray-700 text-lg font-bold py-6"
                            onClick={handleYoutubeGoLive}
                            disabled={isGoingLive || youtubeStep < 3}
                          >
                            {isGoingLive ? "Please wait…" : "GO LIVE NOW (manual)"}
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">Use this only if you started OBS yourself and want to flip YouTube to public.</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

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
                      <li>Go to <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">YouTube Studio</a> → Go Live</li>
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
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
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

