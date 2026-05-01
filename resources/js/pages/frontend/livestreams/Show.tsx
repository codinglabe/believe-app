"use client"

import { useState, useEffect } from "react"
import { Head, router } from "@inertiajs/react"
import { startOBSStream, stopOBSStream } from "@/lib/obsLivestream"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import {
  Copy,
  ExternalLink,
  Play,
  Square,
  Key,
  Info,
  CheckCircle2,
  ArrowLeft,
  MoreVertical,
  Maximize2,
  Radio,
  Youtube,
  HelpCircle,
  Settings,
  Download,
  HardDrive,
  Cloud,
} from "lucide-react"
import { Link } from "@inertiajs/react"

const DEFAULT_OBS_WS = "ws://127.0.0.1:4455"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  directorUrl: string
  participantUrl: string
  hostPushUrl: string
  watchUrl: string | null
  unityLiveUrl?: string
  liveViewerUrl?: string
  joinUrl?: string
  status: "draft" | "scheduled" | "meeting_live" | "live" | "ended" | "cancelled"
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  isPublic?: boolean
  canStartMeeting?: boolean
  canGoLive?: boolean
  latestInviteUrl?: string | null
  dropboxRecordingAvailable?: boolean
  directorUrlDropbox?: string | null
  hostPushUrlDropbox?: string | null
  hasStreamKey?: boolean
  youtubeGoLiveEnabled?: boolean
  viewLink?: string | null
  streamKeyDisplay?: string | null
  rtmpUrl?: string | null
}

interface Props {
  livestream: Livestream
}

export default function SupporterShowLivestream({ livestream }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const [isStartingMeeting, setIsStartingMeeting] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"meeting-info" | "invite-link">("meeting-info")
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const [goLiveTab, setGoLiveTab] = useState("streaming")
  const [streamKey, setStreamKey] = useState("")
  const [isUpdatingStreamKey, setIsUpdatingStreamKey] = useState(false)
  const [isGoingLiveOBS, setIsGoingLiveOBS] = useState(false)
  const [obsError, setObsError] = useState<string | null>(null)
  const [obsUrl, setObsUrl] = useState(DEFAULT_OBS_WS)
  const [obsPassword, setObsPassword] = useState("")
  const [recordingDestination, setRecordingDestination] = useState<"local" | "dropbox">(
    () => (livestream.dropboxRecordingAvailable ? "dropbox" : "local")
  )

  const effectiveHostUrl =
    recordingDestination === "dropbox" && livestream.hostPushUrlDropbox
      ? livestream.hostPushUrlDropbox
      : (livestream.hostPushUrl || livestream.directorUrl)

  const canGoLiveWithOBS = !!(livestream.youtubeGoLiveEnabled && livestream.viewLink && livestream.streamKeyDisplay)

  const joinUrl = livestream.latestInviteUrl ?? livestream.joinUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/livestreams/join/${livestream.roomName}` : "")
  const unityLiveUrl = livestream.unityLiveUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/unity-live/${livestream.roomName}` : "")
  const liveViewerUrl = livestream.liveViewerUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/live/${livestream.roomName}` : "")

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

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30" },
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" },
      meeting_live: { label: "Meeting Live", className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" },
      live: { label: "Stream Live", className: "bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40 animate-pulse" },
      ended: { label: "Ended", className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30" },
      cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30" },
    }
    const config = statusConfig[livestream.status] || statusConfig.draft
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>
  }

  const handleStartMeeting = () => {
    setIsStartingMeeting(true)
    router.post(`/livestreams/supporter/${livestream.id}/start-meeting`, {}, {
      preserveScroll: true,
      onFinish: () => setIsStartingMeeting(false),
    })
  }

  const handleGoLiveClick = () => {
    setIsUpdatingStatus(true)
    router.post(`/livestreams/supporter/${livestream.id}/set-live`, {}, {
      preserveScroll: true,
      onFinish: () => setIsUpdatingStatus(false),
    })
  }

  const handleOBSLiveClick = () => setGoLiveOpen(true)

  const handleGoLiveWithOBS = async () => {
    if (!livestream.viewLink || !livestream.streamKeyDisplay) {
      setObsError("Missing stream key or view link. Add your YouTube stream key in the Settings tab.")
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
      router.post(`/livestreams/supporter/${livestream.id}/go-live-obs-auto`, {}, { preserveScroll: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg && typeof msg === "string" && (msg.includes("authentication") || msg.includes("missing"))) {
        setObsError('OBS is asking for a password. In OBS go to Tools → WebSocket Server Settings and uncheck "Enable Authentication", then try again.')
      } else {
        setObsError(msg || "Could not connect to OBS. Is OBS open? In OBS: Tools → WebSocket Server Settings → enable the server and uncheck \"Enable Authentication\".")
      }
    } finally {
      setIsGoingLiveOBS(false)
    }
  }

  const updateStreamKey = (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingStreamKey(true)
    router.patch(
      `/livestreams/supporter/${livestream.id}/stream-key`,
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

  const handleEndStream = () => {
    setIsUpdatingStatus(true)
    stopOBSStream(true).catch(() => {})
    router.post(`/livestreams/supporter/${livestream.id}/end-stream`, {}, {
      preserveScroll: true,
      onFinish: () => setIsUpdatingStatus(false),
    })
  }

  const toggleVisibility = (publicVal: boolean) => {
    setIsUpdatingVisibility(true)
    router.patch(
      `/livestreams/supporter/${livestream.id}/visibility`,
      { is_public: publicVal },
      { preserveScroll: true, onFinish: () => setIsUpdatingVisibility(false) }
    )
  }

  const meetingInfoContent = (
    <div className="w-full min-w-0 space-y-4">
      {/* Recording saved to: Local / Dropbox — always show so user can see options and connect Dropbox */}
      <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Download className="h-3.5 w-3.5 text-primary" />
          Recording saved to
        </div>
        <p className="text-xs text-muted-foreground">
          Choose where recordings are stored when you start recording in the meeting.
        </p>
        <div className="flex gap-2">
          <Button
            variant={recordingDestination === "local" ? "default" : "outline"}
            size="sm"
            className="flex-1 h-9 gap-1.5 text-xs"
            onClick={() => setRecordingDestination("local")}
          >
            <HardDrive className="h-3.5 w-3.5" />
            Local
          </Button>
          <Button
            variant={recordingDestination === "dropbox" ? "default" : "outline"}
            size="sm"
            className="flex-1 h-9 gap-1.5 text-xs"
            onClick={() => livestream.dropboxRecordingAvailable && setRecordingDestination("dropbox")}
            disabled={!livestream.dropboxRecordingAvailable}
            title={!livestream.dropboxRecordingAvailable ? "Connect Dropbox to save recordings to the cloud" : undefined}
          >
            <Cloud className="h-3.5 w-3.5" />
            Dropbox
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {recordingDestination === "local"
            ? "Recording will download to this device when you stop."
            : livestream.dropboxRecordingAvailable
              ? "Recording will save to your Dropbox folder automatically."
              : "Connect Dropbox in settings to save recordings to the cloud."}
        </p>
        {!livestream.dropboxRecordingAvailable && (
          <Link
            href="/livestreams/supporter/recordings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Cloud className="h-3.5 w-3.5" />
            Connect Dropbox
          </Link>
        )}
      </div>
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
      {livestream.status === "live" && liveViewerUrl && (
        <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            {livestream.isPublic ? "Watch link (with volume)" : "Viewer link (private)"}
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link so viewers can watch with mute and volume controls.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 gap-2"
            onClick={() => copyToClipboard(liveViewerUrl, "unity")}
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
    </div>
  )

  const inviteLinkContent = (
    <div className="w-full min-w-0 space-y-4">
      <p className="text-xs text-muted-foreground">
        Share a secure link for guests. They’ll join at <span className="font-mono text-foreground">/livestreams/join/…</span> with no need to enter the meeting ID or passcode.
      </p>
      {joinUrl ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Invite link</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={joinUrl}
              className="font-mono text-xs h-9 bg-muted/50"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(joinUrl).then(() => setCopied("invite"))
                setTimeout(() => setCopied(null), 3000)
              }}
              aria-label="Copy invite link"
            >
              {copied === "invite" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <UnityMeetLayout
      breadcrumbs={[
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Unity Meet Communications', href: '/livestreams/supporter' },
        { title: livestream.title || 'Meeting', href: `/livestreams/supporter/${livestream.id}` },
      ]}
    >
      <PageHead title={livestream.title || "Meeting"} description="Host your meeting with VDO.Ninja" />
      <Head title={livestream.title || "Meeting"} />
      <div className="w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2 overflow-hidden md:w-full md:max-w-none md:left-auto md:translate-x-0 md:overflow-visible">
        <div className="flex h-[calc(100dvh-4rem)] sm:h-[calc(100vh-4rem)] flex-col w-full min-w-0 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-4">
              <Link href="/livestreams/supporter" className="shrink-0 text-muted-foreground hover:text-foreground p-1.5 -m-1.5 rounded touch-manipulation" aria-label="Back">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <h1 className="truncate text-sm font-semibold text-foreground sm:text-lg">{livestream.title || "Meeting"}</h1>
              <span className="shrink-0">{getStatusBadge()}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-0.5 md:hidden">
                <Sheet open={infoOpen} onOpenChange={setInfoOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 touch-manipulation" aria-label="Meeting info">
                      <Info className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[90vw] max-w-sm overflow-y-auto">
                    <SheetHeader className="pb-4 border-b border-border">
                      <SheetTitle className="text-lg">Meeting</SheetTitle>
                    </SheetHeader>
                    <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as "meeting-info" | "invite-link")} className="w-full mt-4">
                      <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="meeting-info" className="text-xs gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          Meeting info
                        </TabsTrigger>
                        <TabsTrigger value="invite-link" className="text-xs gap-1.5">
                          <Copy className="h-3.5 w-3.5 shrink-0" />
                          Invite link
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="meeting-info" className="mt-4">
                        {meetingInfoContent}
                      </TabsContent>
                      <TabsContent value="invite-link" className="mt-4">
                        {inviteLinkContent}
                      </TabsContent>
                    </Tabs>
                  </SheetContent>
                </Sheet>
                {livestream.canStartMeeting && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-md touch-manipulation text-xs font-medium"
                    onClick={handleStartMeeting}
                    disabled={isStartingMeeting}
                  >
                    {isStartingMeeting ? "…" : "Start Meeting"}
                  </Button>
                )}
                {livestream.canGoLive && livestream.status !== "live" && (
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
                <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-md md:hidden" onClick={() => setGoLiveOpen(true)}>
                  Stream options
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 touch-manipulation" aria-label="More actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="bottom" className="w-48">
                    {livestream.canGoLive && livestream.status !== "live" && (
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
                    <DropdownMenuItem onClick={() => window.open(effectiveHostUrl, "_blank")}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Open meeting in new tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {livestream.canStartMeeting && (
                  <Button variant="outline" size="sm" className="h-8 px-3" onClick={handleStartMeeting} disabled={isStartingMeeting}>
                    {isStartingMeeting ? "…" : "Start Meeting"}
                  </Button>
                )}
                {livestream.canGoLive && livestream.status !== "live" && (
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
                        {isGoingLiveOBS ? "…" : "OBS Live"}
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                onClick={() => window.open(effectiveHostUrl, "_blank")}
                aria-label="Open meeting in new tab"
                title="Open meeting in new tab"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col border-r border-border bg-linear-to-b from-muted/30 to-muted/10 p-0">
              <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as "meeting-info" | "invite-link")} className="w-full flex flex-col min-h-0">
                <Card className="rounded-none border-0 border-b border-border shadow-none bg-transparent p-0">
                  <CardHeader className="p-0 py-3 px-3">
                    <TabsList className="grid w-full grid-cols-2 h-9">
                      <TabsTrigger value="meeting-info" className="text-xs gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        Meeting info
                      </TabsTrigger>
                      <TabsTrigger value="invite-link" className="text-xs gap-1.5">
                        <Copy className="h-3.5 w-3.5 shrink-0" />
                        Invite link
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent className="p-0 pb-3 px-3 overflow-y-auto">
                    <TabsContent value="meeting-info" className="mt-3 mb-0">
                      {meetingInfoContent}
                    </TabsContent>
                    <TabsContent value="invite-link" className="mt-3 mb-0">
                      {inviteLinkContent}
                    </TabsContent>
                  </CardContent>
                </Card>
              </Tabs>
            </aside>

            <div className="flex flex-1 flex-col min-w-0 min-h-0 w-0 overflow-hidden">
              <div className="flex-1 min-h-0 min-w-0 bg-black relative overflow-hidden">
                {effectiveHostUrl ? (
                  <iframe
                    key={recordingDestination}
                    src={effectiveHostUrl}
                    title="Host"
                    className="absolute inset-0 w-full h-full z-0"
                    allow="camera; microphone; fullscreen; display-capture https://vdo.ninja https://www.vdo.ninja; autoplay; clipboard-write"
                  />
                ) : null}
                {!effectiveHostUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm sm:text-base">Loading meeting…</div>
                ) : null}
                {livestream.status === "live" && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-semibold animate-pulse">
                    ● LIVE
                  </div>
                )}
                <div className="absolute bottom-2 left-2 md:hidden">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full bg-background/90 shadow-md touch-manipulation"
                    onClick={() => window.open(effectiveHostUrl, "_blank")}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Full screen</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={goLiveOpen} onOpenChange={setGoLiveOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Go Live</DialogTitle>
          </DialogHeader>
          <Tabs value={goLiveTab} onValueChange={setGoLiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger value="streaming" className="text-xs sm:text-sm">Streaming</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="help" className="text-xs sm:text-sm">Help</TabsTrigger>
            </TabsList>
            <TabsContent value="streaming" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">Stream to YouTube using OBS. Add your stream key in Settings first.</p>
              {(obsError) && (
                <Alert variant="destructive"><AlertDescription>{obsError}</AlertDescription></Alert>
              )}
              {livestream.youtubeGoLiveEnabled && livestream.viewLink && livestream.streamKeyDisplay && (
                <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleGoLiveWithOBS} disabled={isGoingLiveOBS}>
                  {isGoingLiveOBS ? "Starting…" : "Go Live with OBS (auto)"}
                </Button>
              )}
              {!livestream.youtubeGoLiveEnabled && (
                <p className="text-sm text-muted-foreground">Add your YouTube stream key in the Settings tab to enable OBS Live.</p>
              )}
              {livestream.status === "live" && (
                <Button variant="destructive" className="w-full" onClick={handleEndStream} disabled={isUpdatingStatus}>
                  <Square className="h-4 w-4 mr-2" /> End stream
                </Button>
              )}
            </TabsContent>
            <TabsContent value="settings" className="mt-4 space-y-4">
              <CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4" /> YouTube Stream Key</CardTitle>
              <p className="text-sm text-muted-foreground">Paste your stream key from YouTube Studio (Create → Go live → Stream key).</p>
              <form onSubmit={updateStreamKey} className="space-y-3">
                <Input
                  type="password"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  placeholder="Paste your YouTube stream key"
                  className="font-mono text-sm"
                />
                <Button type="submit" disabled={isUpdatingStreamKey || !streamKey}>
                  {isUpdatingStreamKey ? "Saving…" : livestream.hasStreamKey ? "Update Stream Key" : "Add Stream Key"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="help" className="mt-4 space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <HelpCircle className="h-5 w-5 text-primary" />
                How to go live with OBS
              </div>
              <p className="text-sm text-muted-foreground">
                One-time setup in OBS, then use the Go Live button to start streaming to YouTube.
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
                    <Youtube className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">2. Get your YouTube stream key</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>Go to YouTube Studio → Create → Go live</li>
                      <li>Copy your stream key and paste it in the <strong className="text-foreground">Settings</strong> tab above</li>
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
                    <h4 className="text-sm font-semibold text-foreground">3. Go live</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>Open OBS and add your sources if needed</li>
                      <li>Click the red <strong className="text-foreground">Go Live with OBS (auto)</strong> button — we’ll connect OBS and start the stream to YouTube</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </UnityMeetLayout>
  )
}
