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
      router.post(`/livestreams/${livestream.id}/go-live`, {}, { preserveScroll: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg && typeof msg === "string" && (msg.includes("authentication") || msg.includes("missing"))) {
        setObsError("OBS WebSocket requires a password. Enter it in the OBS Setup tab and try again.")
      } else {
        setObsError(msg || "Could not connect to OBS. Is OBS open with WebSocket server enabled?")
      }
    } finally {
      setIsGoingLiveOBS(false)
    }
  }

  const handleEndStream = () => {
    stopOBSStream(true).catch(() => {})
    updateStatus("ended")
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

        <Tabs defaultValue={livestream.youtubeGoLiveEnabled ? "youtube-live" : "dashboard"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Host Dashboard</TabsTrigger>
            {livestream.youtubeGoLiveEnabled && (
              <TabsTrigger value="youtube-live">YouTube Live</TabsTrigger>
            )}
            <TabsTrigger value="obs">OBS Setup</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {livestream.youtubeGoLiveEnabled && (
              <Card className="bg-blue-500/5 border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    How to go live (do this once, then one-click)
                  </CardTitle>
                  <CardDescription>Follow these steps in order. OBS setup is one-time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-300">
                  <p className="font-medium text-gray-200">1. Install OBS on your computer</p>
                  <p className="pl-4 text-gray-400">Download from obsproject.com and install. Use the same computer where you open this app.</p>
                  <p className="font-medium text-gray-200">2. Turn on OBS WebSocket (one-time)</p>
                  <ul className="pl-6 list-disc space-y-1 text-gray-400">
                    <li>Open OBS → top menu <strong className="text-gray-300">Tools</strong> → <strong className="text-gray-300">WebSocket Server Settings</strong></li>
                    <li>Enable the WebSocket server</li>
                    <li>Leave port as <strong className="text-gray-300">4455</strong> (or set it in the OBS tab below if you change it)</li>
                    <li>Click OK and keep OBS open (you can minimize it)</li>
                  </ul>
                  <p className="font-medium text-gray-200">3. When you want to go live</p>
                  <ul className="pl-6 list-disc space-y-1 text-gray-400">
                    <li>Open OBS on your computer</li>
                    <li>Open this livestream page in your browser (same computer)</li>
                    <li><strong className="text-gray-200">So the stream shows video:</strong> open <strong className="text-gray-300">Director Mode</strong> or the <strong className="text-gray-300">Push (Host)</strong> link and allow camera — then the feed appears in OBS</li>
                    <li>Click <strong className="text-red-400">Go Live with OBS (auto)</strong> — the app adds <strong className="text-gray-300">&quot;My Screen&quot;</strong> (your meeting/desktop) so video and sound both go to the stream</li>
                    <li>Click <strong className="text-gray-300">End Stream</strong> when you are done</li>
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

          {livestream.youtubeGoLiveEnabled && livestream.pushLink && livestream.viewLink && livestream.streamKeyDisplay && (
            <TabsContent value="youtube-live" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
                <div className="lg:col-span-8 bg-black border border-gray-700 rounded-lg overflow-hidden relative">
                  <iframe
                    src={livestream.pushLink}
                    title="VDO.Ninja Push (Host)"
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
                  <Card className={youtubeStep === 1 ? "border-yellow-500 bg-yellow-500/5" : ""}>
                    <CardHeader>
                      <CardTitle className="text-base">Step 1: Setup OBS</CardTitle>
                      <CardDescription>Open OBS on your computer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-400">OBS Browser Source URL</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={livestream.viewLink} readOnly className="font-mono text-xs bg-muted" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(livestream.viewLink!, "view")}>
                            <Copy className={`w-4 h-4 ${copied === "view" ? "text-green-400" : ""}`} />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">OBS Stream Key</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={livestream.streamKeyDisplay!} readOnly type="password" className="font-mono text-xs bg-muted" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(livestream.streamKeyDisplay!, "streamkey")}>
                            <Copy className={`w-4 h-4 ${copied === "streamkey" ? "text-green-400" : ""}`} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">In OBS: Settings → Stream → Service: YouTube. Paste server (RTMP) and key.</p>
                    </CardContent>
                  </Card>
                  <Card className={youtubeStep === 2 ? "border-yellow-500 bg-yellow-500/5" : ""}>
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
                  <Card className={youtubeStep === 3 ? "border-red-500/50 bg-red-500/5" : ""}>
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
                          <div className="text-green-400 font-bold">STREAM IS PUBLIC!</div>
                          <p className="text-sm text-gray-400">View and share your live stream on YouTube:</p>
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
                          <p className="text-xs text-gray-500 text-center">Use this only if you started OBS yourself and want to flip YouTube to public.</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="obs" className="space-y-6">
            {livestream.youtubeGoLiveEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">OBS WebSocket (for &quot;Go Live with OBS auto&quot;)</CardTitle>
                  <CardDescription>
                    OBS must be open with WebSocket server enabled (Tools → WebSocket Server Settings). Default: port 4455.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-400">WebSocket URL</Label>
                    <Input
                      value={obsUrl}
                      onChange={(e) => setObsUrl(e.target.value)}
                      placeholder="ws://127.0.0.1:4455"
                      className="font-mono text-sm mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400">Password (if set in OBS)</Label>
                    <Input
                      type="password"
                      value={obsPassword}
                      onChange={(e) => setObsPassword(e.target.value)}
                      placeholder="Leave empty if no password"
                      className="font-mono text-sm mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">If you set a password in OBS → Tools → WebSocket Server Settings, enter it here or &quot;Go Live with OBS (auto)&quot; will fail.</p>
                  </div>
                  <p className="text-xs text-gray-500">Screen capture uses your <strong>primary display</strong>. Two monitors? Put your meeting on the main screen, or in OBS right‑click &quot;My Screen&quot; → Properties → choose the display.</p>
                </CardContent>
              </Card>
            )}

            {livestream.youtubeGoLiveEnabled && (
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Stream is live but screen is black?
                  </CardTitle>
                  <CardDescription>Try these in order. The #1 fix is turning off browser hardware acceleration in OBS.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-amber-200">1. Turn off Browser Source Hardware Acceleration (most common fix)</p>
                    <ul className="list-disc list-inside pl-2 text-gray-300 space-y-1 mt-1">
                      <li>In OBS: <strong>Settings</strong> → <strong>Advanced</strong></li>
                      <li>Uncheck <strong>&quot;Enable Browser Source Hardware Acceleration&quot;</strong></li>
                      <li>Click OK, then <strong>restart OBS</strong> and try Go Live again</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-amber-200">2. Send video into the room first</p>
                    <p className="text-gray-300 mt-1">Open <strong>Director Mode</strong> or the <strong>Push (Host)</strong> link from this page and allow camera. The &quot;VDO Ninja View&quot; in OBS only shows what’s being sent to the room.</p>
                  </div>
                  <div>
                    <p className="font-medium text-amber-200">3. Refresh the browser source in OBS</p>
                    <p className="text-gray-300 mt-1">In OBS: right‑click the source <strong>&quot;VDO Ninja View&quot;</strong> → <strong>Properties</strong> → click <strong>&quot;Refresh cache of current page&quot;</strong>. Uncheck &quot;Shutdown source when not visible&quot;.</p>
                  </div>
                  <div>
                    <p className="font-medium text-amber-200">4. Use Window Capture instead (if browser source never works)</p>
                    <p className="text-gray-300 mt-1">Open the <strong>View</strong> link from this page in Chrome. In OBS add <strong>Sources → Window Capture</strong>, choose that Chrome window. Put that in your scene instead of the browser source.</p>
                  </div>
                  <p className="text-xs text-gray-500 pt-2">We use your <strong>primary display</strong>. Two monitors? Put your meeting on the main screen, or in OBS right‑click &quot;My Screen&quot; → Properties → choose the display. Use step 4 only if you prefer a browser window instead.</p>
                </CardContent>
              </Card>
            )}

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

