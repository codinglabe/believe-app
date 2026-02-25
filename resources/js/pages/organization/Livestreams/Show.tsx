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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/admin/ui/switch"
import AppLayout from "@/layouts/app-layout"
import {
  Video,
  Copy,
  ExternalLink,
  Play,
  Square,
  Youtube,
  Key,
  Info,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  MoreVertical,
  Maximize2,
  HelpCircle,
  Settings,
  Radio,
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
  hostPushUrl?: string
  watchUrl?: string | null
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
  unityLiveUrl?: string
  isPublic?: boolean
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
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const [goLiveTab, setGoLiveTab] = useState("streaming")
  const [infoOpen, setInfoOpen] = useState(false)
  const [iframeTab, setIframeTab] = useState<"director" | "host">("director")
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const { props } = usePage<{ errors?: { go_live?: string }; browser_publish_url?: string | null }>()
  const goLiveError = props.errors?.go_live ?? null

  useEffect(() => {
    const url = props.browser_publish_url
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer,width=800,height=600")
    }
  }, [props.browser_publish_url])

  // Prevent page scroll — livestream view is fixed to viewport, no body scroll
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

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
        setObsError("OBS is asking for a password. In OBS go to Tools â†’ WebSocket Server Settings and uncheck \"Enable Authentication\", then try again. No password needed.")
      } else {
        setObsError(msg || "Could not connect to OBS. Is OBS open? In OBS: Tools â†’ WebSocket Server Settings â†’ enable the server and uncheck \"Enable Authentication\".")
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

  const canGoLiveWithOBS = !!(livestream.youtubeGoLiveEnabled && livestream.viewLink && livestream.streamKeyDisplay)
  // Go Live: only set database status to "live" (stream appears on Unity Live page)
  const handleGoLiveClick = () => {
    setIsUpdatingStatus(true)
    router.post(`/livestreams/${livestream.id}/set-live`, {}, {
      preserveScroll: true,
      onFinish: () => setIsUpdatingStatus(false),
    })
  }
  // OBS Live: open modal (stream options, help, stream key, browser/OBS choices)
  const handleOBSLiveClick = () => setGoLiveOpen(true)

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

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/livestreams/join/${livestream.roomName}` : ""
  const unityLiveUrl = livestream.unityLiveUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/unity-live/${livestream.roomName}` : "")

  const toggleVisibility = (publicVal: boolean) => {
    setIsUpdatingVisibility(true)
    router.patch(
      `/livestreams/${livestream.id}/visibility`,
      { is_public: publicVal },
      { preserveScroll: true, onFinish: () => setIsUpdatingVisibility(false) }
    )
  }

  const meetingInfoContent = (
    <div className="w-full min-w-0 space-y-4">
      {/* Public / Private — only when live so the choice is clear for viewers */}
      <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" />
            Visibility
          </div>
          <Switch
            checked={livestream.isPublic ?? true}
            onCheckedChange={toggleVisibility}
            disabled={isUpdatingVisibility}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {livestream.isPublic
            ? "Public — listed on Unity Live when live."
            : "Private — only people with the viewer link can watch."}
        </p>
      </div>
      {/* Viewer link (Unity Live big screen) — when live */}
      {livestream.status === "live" && unityLiveUrl && (
        <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            {livestream.isPublic ? "Watch on Unity Live" : "Viewer link (private)"}
          </div>
          <p className="text-xs text-muted-foreground">
            {livestream.isPublic
              ? "Stream appears on the Unity Live page. Share this link for the big-screen view."
              : "Share this link so viewers can watch. Not listed on Unity Live."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 gap-2"
            onClick={() => copyToClipboard(unityLiveUrl, "unity")}
          >
            {copied === "unity" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            Copy viewer link
          </Button>
        </div>
      )}
      <div className="w-full min-w-0 rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Key className="h-3.5 w-3.5 text-primary" />
          Meeting ID
        </div>
        <Input value={livestream.roomName} readOnly className="font-mono text-sm h-9 w-full bg-background/80" />
        <Button variant="outline" size="sm" className="w-full h-9 gap-2" onClick={() => copyToClipboard(livestream.roomName, "room")}>
          {copied === "room" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          Copy
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Key className="h-3.5 w-3.5 text-primary" />
          Passcode
        </div>
        <Input value={livestream.roomPassword} readOnly className="font-mono text-sm h-9 w-full bg-background/80" />
        <Button variant="outline" size="sm" className="w-full h-9 gap-2" onClick={() => copyToClipboard(livestream.roomPassword, "password")}>
          {copied === "password" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          Copy
        </Button>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="w-full h-10 gap-2 rounded-lg font-medium shadow-sm border border-border bg-primary/5 hover:bg-primary/10 text-foreground"
        onClick={() => copyToClipboard(joinUrl, "invite")}
      >
        {copied === "invite" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        Copy invite link
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <Head title={livestream.title || "Meeting"} />
      {/* Full-bleed on mobile; no scroll — fixed height to fit viewport below header */}
      <div className="w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2 overflow-hidden md:w-full md:max-w-none md:left-auto md:translate-x-0 md:overflow-visible">
        <div className="flex h-[calc(100dvh-4rem)] sm:h-[calc(100vh-4rem)] flex-col w-full min-w-0 overflow-hidden">
          {/* Top bar: title left; actions + meeting new tab icon right */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-4">
              <Link href="/livestreams" className="shrink-0 text-muted-foreground hover:text-foreground p-1.5 -m-1.5 rounded touch-manipulation" aria-label="Back">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-lg">{livestream.title || "Meeting"}</h1>
              <span className="shrink-0">{getStatusBadge()}</span>
            </div>
            {/* Right: actions (mobile compact, desktop with labels) + meeting new tab icon */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              {/* Mobile: Info + Go Live + More */}
              <div className="flex items-center gap-0.5 md:hidden">
                <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 touch-manipulation" aria-label="Meeting info">
                      <Info className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[90vw] max-w-sm overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Info className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <SheetTitle className="text-lg">Meeting info</SheetTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">Share these details to invite others</p>
                        </div>
                      </div>
                    </SheetHeader>
                    <div className="mt-5">{meetingInfoContent}</div>
                  </SheetContent>
                </Sheet>
                {livestream.status !== "live" && (
                  <>
                    <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 rounded-md bg-red-600 hover:bg-red-700 touch-manipulation"
                    onClick={handleGoLiveClick}
                    disabled={isUpdatingStatus}
                    aria-label="Go Live"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                    {canGoLiveWithOBS && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 rounded-md border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10 touch-manipulation text-xs font-medium"
                        onClick={handleOBSLiveClick}
                        disabled={isGoingLiveOBS}
                        aria-label="Start with OBS to YouTube"
                      >
                        {isGoingLiveOBS ? "…" : "OBS Live"}
                      </Button>
                    )}
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 touch-manipulation" aria-label="More actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" className="w-48">
                    {livestream.status !== "live" && (
                      <>
                        <DropdownMenuItem onClick={handleGoLiveClick} disabled={isUpdatingStatus}>
                          <Play className="h-4 w-4 mr-2" />
                          Go Live
                        </DropdownMenuItem>
                        {canGoLiveWithOBS && (
                          <DropdownMenuItem onClick={handleOBSLiveClick} disabled={isGoingLiveOBS}>
                            <Radio className="h-4 w-4 mr-2" />
                            {isGoingLiveOBS ? "Starting…" : "OBS Live"}
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setGoLiveOpen(true)}>
                      Stream options
                    </DropdownMenuItem>
                    {livestream.status === "live" && (
                      <DropdownMenuItem variant="destructive" onClick={handleEndStream} disabled={isUpdatingStatus}>
                        <Square className="h-4 w-4 mr-2" />
                        End stream
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => window.open(iframeTab === "director" ? livestream.directorUrl : (livestream.hostPushUrl ?? livestream.directorUrl), "_blank")}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Open meeting in new tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Desktop: Go Live + OBS Live (when ready) + Stream options + End stream (when live) in header */}
              <div className="hidden md:flex items-center gap-1.5">
                {livestream.status !== "live" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 h-8 px-3"
                      onClick={handleGoLiveClick}
                      disabled={isUpdatingStatus}
                    >
                      <Play className="h-4 w-4 mr-1.5" />
                      Go Live
                    </Button>
                    {canGoLiveWithOBS && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                        onClick={handleOBSLiveClick}
                        disabled={isGoingLiveOBS}
                      >
                        <Radio className="h-4 w-4 mr-1.5" />
                        {isGoingLiveOBS ? "Starting…" : "OBS Live"}
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => setGoLiveOpen(true)}>
                  Stream options
                </Button>
                {livestream.status === "live" && (
                  <Button variant="destructive" size="sm" className="h-8 px-3" onClick={handleEndStream} disabled={isUpdatingStatus}>
                    <Square className="h-4 w-4 mr-1.5" />
                    End stream
                  </Button>
                )}
              </div>
              {/* Meeting new tab icon — opens current iframe tab (Director or Host) in new tab */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                onClick={() => window.open(iframeTab === "director" ? livestream.directorUrl : (livestream.hostPushUrl ?? livestream.directorUrl), "_blank")}
                aria-label="Open meeting in new tab"
                title="Open meeting in new tab"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

        {/* Main: left sidebar (desktop only) + meeting area — min-h-0 prevents flex overflow */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Meeting Info — desktop only */}
          <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col border-r border-border bg-linear-to-b from-muted/30 to-muted/10 p-0">
            <Card className="rounded-none border-0 border-b border-border shadow-none bg-transparent p-0">
              <CardHeader className="p-0 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Info className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Meeting info</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Share these details to invite others</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-3">
                {meetingInfoContent}
              </CardContent>
            </Card>
          </aside>

          {/* Center: meeting area — on mobile full width; min-h-0 so iframe doesn't cause scroll */}
          <div className="flex flex-1 flex-col min-w-0 min-h-0 w-0 overflow-hidden">
            {/* Director tab = Director URL; Host tab = Push URL (host joins and pushes stream) */}
            <div className="flex shrink-0 border-b border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setIframeTab("director")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${iframeTab === "director" ? "border-b-2 border-primary text-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                Director
              </button>
              <button
                type="button"
                onClick={() => setIframeTab("host")}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${iframeTab === "host" ? "border-b-2 border-primary text-primary bg-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                Host
              </button>
            </div>
            {/* Both iframes stay mounted so switching tabs does not reload. Director = director URL; Host = push URL. */}
            <div className="flex-1 min-h-0 min-w-0 bg-black relative overflow-hidden">
              {livestream.directorUrl ? (
                <iframe
                  key="director"
                  src={livestream.directorUrl}
                  title="Director"
                  className={`absolute inset-0 w-full h-full ${iframeTab !== "director" ? "invisible pointer-events-none -z-10" : "z-0"}`}
                  allow="camera; microphone; fullscreen; display-capture *; autoplay; clipboard-write"
                />
              ) : null}
              {(livestream.hostPushUrl ?? livestream.directorUrl) ? (
                <iframe
                  key="host"
                  src={livestream.hostPushUrl ?? livestream.directorUrl}
                  title="Host"
                  className={`absolute inset-0 w-full h-full ${iframeTab !== "host" ? "invisible pointer-events-none -z-10" : "z-0"}`}
                  allow="camera; microphone; fullscreen; display-capture https://vdo.ninja https://www.vdo.ninja; autoplay; clipboard-write"
                />
              ) : null}
              {!livestream.directorUrl && !livestream.hostPushUrl ? (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm sm:text-base">Loading meeting…</div>
              ) : null}
              {livestream.status === "live" && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-semibold animate-pulse">
                  ● LIVE
                </div>
              )}
              {/* Mobile: floating "Open in new tab" for full-screen meeting */}
              <div className="absolute bottom-2 left-2 md:hidden">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full bg-background/90 shadow-md touch-manipulation"
                  onClick={() => window.open(iframeTab === "director" ? livestream.directorUrl : (livestream.hostPushUrl ?? livestream.directorUrl), "_blank")}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Full screen</span>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Go Live modal (Pane 4) */}
      <Dialog open={goLiveOpen} onOpenChange={setGoLiveOpen}>
          <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Go Live</DialogTitle>
            </DialogHeader>
            <Tabs value={goLiveTab} onValueChange={setGoLiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                <TabsTrigger value="streaming" className="text-xs sm:text-sm">Streaming</TabsTrigger>
                <TabsTrigger value="platforms" className="text-xs sm:text-sm">Platforms</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
                <TabsTrigger value="help" className="text-xs sm:text-sm">Help</TabsTrigger>
              </TabsList>
              <TabsContent value="streaming" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">Start stream</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" disabled={!livestream.youtubeGoLiveEnabled}>
                    <Youtube className="h-6 w-6 text-red-600" />
                    <span>YouTube</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" disabled><span className="text-muted-foreground">Facebook</span></Button>
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" disabled><span className="text-muted-foreground">Custom RTMP</span></Button>
                </div>
                {(goLiveError || obsError) && (
                  <Alert variant="destructive"><AlertDescription>{goLiveError || obsError}</AlertDescription></Alert>
                )}
                {livestream.youtubeGoLiveEnabled && livestream.viewLink && livestream.streamKeyDisplay && (
                  <div className="space-y-2">
                    <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleGoLiveWithOBS} disabled={isGoingLiveOBS}>
                      {isGoingLiveOBS ? "Startingâ€¦" : "Go Live with OBS (auto)"}
                    </Button>
                    {mediamtxEnabled && (
                      <Button variant="outline" className="w-full" onClick={handleGoLiveBrowser} disabled={isGoingLiveBrowser}>
                        {isGoingLiveBrowser ? "Openingâ€¦" : "Go Live from browser (no OBS)"}
                      </Button>
                    )}
                    <Button variant="outline" className="w-full" onClick={handleYoutubeGoLive} disabled={isGoingLive}>
                      {isGoingLive ? "Please waitâ€¦" : "Go Live (manual OBS)"}
                    </Button>
                  </div>
                )}
                {livestream.status === "live" && (
                  <Button variant="destructive" className="w-full" onClick={handleEndStream} disabled={isUpdatingStatus}>
                    <Square className="h-4 w-4 mr-2" /> End stream
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="platforms" className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Choose where to stream. Add a stream key in Settings to enable YouTube.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" disabled={!livestream.youtubeGoLiveEnabled}>
                    <Youtube className="h-6 w-6 text-red-600" /> YouTube
                  </Button>
                  <Button variant="outline" className="h-auto py-4" disabled>Facebook</Button>
                  <Button variant="outline" className="h-auto py-4" disabled>Custom RTMP</Button>
                </div>
              </TabsContent>
              <TabsContent value="settings" className="mt-4 space-y-4">
                <CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4" /> YouTube Stream Key</CardTitle>
                <p className="text-sm text-muted-foreground">Add or update your stream key for OBS â†’ YouTube.</p>
                <form onSubmit={updateStreamKey} className="space-y-3">
                  <Input
                    type="password"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    placeholder="Paste your YouTube stream key"
                    className="font-mono text-sm"
                  />
                  <Button type="submit" disabled={isUpdatingStreamKey || !streamKey}>
                    {isUpdatingStreamKey ? "Updatingâ€¦" : livestream.hasStreamKey ? "Update Stream Key" : "Add Stream Key"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="help" className="mt-4 space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  How to go live with OBS
                </div>
                <p className="text-sm text-muted-foreground">
                  One-time setup in OBS, then use the Go Live button to start streaming.
                </p>

                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Settings className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">1. One-time OBS setup</h4>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        <li>In OBS: <strong className="text-foreground">Tools</strong> → <strong className="text-foreground">WebSocket Server Settings</strong></li>
                        <li>Enable the server and set port to <strong className="text-foreground">4455</strong></li>
                        <li>Uncheck <strong className="text-foreground">Enable Authentication</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Radio className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">2. Go live</h4>
                      <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        <li>Open OBS and add your sources (camera, screen, etc.)</li>
                        <li>Add your YouTube stream key in the <strong className="text-foreground">Settings</strong> tab if you haven’t already</li>
                        <li>Click the red <strong className="text-foreground">Go Live</strong> button on this page — we’ll connect OBS and start the stream</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground border-t border-border pt-3">
                  Need a stream key? Get it from YouTube Studio → Create → Go live → Stream key. Paste it in the Settings tab.
                </p>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

