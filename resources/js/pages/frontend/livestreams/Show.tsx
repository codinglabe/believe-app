"use client"

import { useState, useEffect, useMemo } from "react"
import { Head, router, usePage } from "@inertiajs/react"
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
import VdoMeetingIframe from "@/components/meeting/VdoMeetingIframe"
import GoLiveConfirmDialog from "@/components/livestreams/GoLiveConfirmDialog"
import { PageHead } from "@/components/frontend/PageHead"
import {
  Copy,
  ExternalLink,
  Play,
  Square,
  Key,
  Info,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  MoreVertical,
  Maximize2,
  Radio,
  Youtube,
  HelpCircle,
  Download,
  HardDrive,
  Cloud,
} from "lucide-react"
import { Link } from "@inertiajs/react"
import { applyVdoGroupRoomPresentation } from "@/lib/vdoMeeting"
import {
  isStreamRelayInProgress,
  resolveStreamingDisplayStatus,
  streamingDisplayBadgeClass,
} from "@/lib/streamingDisplayStatus"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  requiresPasscode?: boolean
  directorUrl: string
  participantUrl: string
  hostPushUrl: string
  scenePushUrl?: string | null
  /** Participant-canvas mixer page URL — hidden iframe when canvasMode is on so
   * all participants reach YouTube, not just the host. */
  canvasUrl?: string | null
  /** When true, the meeting runs in multi-participant canvas mode. */
  canvasMode?: boolean
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
  /** When false, queueing a cloud stream is blocked server-side (e.g. already live or cancelled). */
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
  youtubeConnected?: boolean
  youtubeChannelUrl?: string | null
  streamingQueueStatus?: StreamingQueueStatus | null
  youtubeBroadcastId?: string | null
}

interface StreamingQueueStatus {
  status?: string | null
  livestreamStatus?: string
  streamStopRequested?: boolean
  updatedAt?: string | null
  failureReason?: string | null
}

interface RecordingConsentDecline {
  id: number
  guestLabel: string | null
  createdAt: string | null
}

interface Props {
  livestream: Livestream
  recordingConsentDeclines: RecordingConsentDecline[]
}

function formatDeclineTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

export default function SupporterShowLivestream({ livestream, recordingConsentDeclines }: Props) {
  const { props: inertiaProps } = usePage<{ errors?: Record<string, string | string[]> }>()
  const prepareYoutubeError = inertiaProps.errors?.youtube
  const prepareYoutubeErrorText = Array.isArray(prepareYoutubeError)
    ? prepareYoutubeError[0]
    : prepareYoutubeError

  const queueStreamError = inertiaProps.errors?.go_live
  const queueStreamErrorText = Array.isArray(queueStreamError) ? queueStreamError[0] : queueStreamError

  const [copied, setCopied] = useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isGoLivePending, setIsGoLivePending] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  const [isEndingStreamPending, setIsEndingStreamPending] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"meeting-info" | "invite-link">("meeting-info")
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const [goLivePrecheckOpen, setGoLivePrecheckOpen] = useState(false)
  const [goLiveConfirmOpen, setGoLiveConfirmOpen] = useState(false)
  const [isPrepareYoutubeLive, setIsPrepareYoutubeLive] = useState(false)
  const [goLiveTab, setGoLiveTab] = useState("streaming")
  const [streamKey, setStreamKey] = useState("")
  const [isUpdatingStreamKey, setIsUpdatingStreamKey] = useState(false)
  const [recordingDestination, setRecordingDestination] = useState<"local" | "dropbox">(
    () => (livestream.dropboxRecordingAvailable ? "dropbox" : "local")
  )

  const effectiveHostUrl =
    recordingDestination === "dropbox" && livestream.hostPushUrlDropbox
      ? livestream.hostPushUrlDropbox
      : (livestream.hostPushUrl || livestream.directorUrl)

  /** Host push URLs: ensure Meet-style labels + single-row grid (matches participant embeds). */
  const vdoHostIframeSrc = useMemo(() => {
    const raw = effectiveHostUrl
    if (!raw?.includes("vdo.ninja")) return raw
    try {
      const u = new URL(raw)
      if (u.searchParams.has("push") && u.searchParams.has("room")) {
        applyVdoGroupRoomPresentation(u)
      }
      return u.toString()
    } catch {
      return raw
    }
  }, [effectiveHostUrl])

  const joinUrl = livestream.latestInviteUrl ?? livestream.joinUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/livestreams/join/${livestream.roomName}` : "")
  const unityLiveUrl = livestream.unityLiveUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/unity-live/${livestream.roomName}` : "")
  const liveViewerUrl = livestream.liveViewerUrl ?? (typeof window !== "undefined" ? `${window.location.origin}/live/${livestream.roomName}` : "")

  const streamRelayInProgress = useMemo(
    () =>
      isStreamRelayInProgress({
        jobStatus: livestream.streamingQueueStatus?.status,
        livestreamStatus: livestream.streamingQueueStatus?.livestreamStatus ?? livestream.status,
        streamStopRequested: livestream.streamingQueueStatus?.streamStopRequested,
      }),
    [livestream.streamingQueueStatus, livestream.status],
  )

  const isGoLiveBusy = isGoLivePending || streamRelayInProgress

  const pollMs =
    (isEndingStreamPending && livestream.status === "live") || streamRelayInProgress ? 4000 : 12000

  useEffect(() => {
    const id = window.setInterval(() => {
      router.reload({
        only: ["recordingConsentDeclines", "livestream"],
        preserveScroll: true,
        preserveState: true,
      })
    }, pollMs)
    return () => window.clearInterval(id)
  }, [pollMs])

  useEffect(() => {
    if (isEndingStreamPending && livestream.status !== "live") {
      setIsEndingStreamPending(false)
    }
  }, [livestream.status, isEndingStreamPending])

  const endStreamError = inertiaProps.errors?.error
  const endStreamErrorText = Array.isArray(endStreamError) ? endStreamError[0] : endStreamError

  useEffect(() => {
    if (endStreamErrorText && isEndingStreamPending) {
      setIsEndingStreamPending(false)
    }
  }, [endStreamErrorText, isEndingStreamPending])

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

  const queueCloudStream = () => {
    if (isGoLiveBusy) {
      return
    }
    if (!livestream.hasStreamKey) {
      setGoLivePrecheckOpen(true)
      return
    }
    setIsGoLivePending(true)
    router.post(`/livestreams/supporter/${livestream.id}/queue-stream-relay`, {}, {
      preserveScroll: true,
      onFinish: () => {
        setIsGoLivePending(false)
        setGoLiveConfirmOpen(false)
      },
    })
  }

  const handleGoLiveClick = () => {
    if (isGoLiveBusy) {
      return
    }
    if (!livestream.hasStreamKey) {
      setGoLivePrecheckOpen(true)
      return
    }
    setGoLiveConfirmOpen(true)
  }

  const confirmGoLive = () => {
    queueCloudStream()
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
    setIsEndingStreamPending(true)
    router.post(`/livestreams/supporter/${livestream.id}/end-stream`, {}, {
      preserveScroll: true,
      onFinish: () => setIsUpdatingStatus(false),
    })
  }

  const goLiveAttentionClass =
    livestream.canGoLive && livestream.status !== "live" && !isGoLiveBusy
      ? "motion-safe:animate-pulse shadow-md shadow-red-500/30"
      : ""

  const goLiveDisabled = isGoLiveBusy || isUpdatingStatus || isEndingStreamPending

  const streamDisplayStatus = useMemo(
    () =>
      resolveStreamingDisplayStatus({
        jobStatus: livestream.streamingQueueStatus?.status,
        livestreamStatus: livestream.streamingQueueStatus?.livestreamStatus ?? livestream.status,
        isEndingStreamPending,
        streamStopRequested: livestream.streamingQueueStatus?.streamStopRequested,
        failureReason: livestream.streamingQueueStatus?.failureReason,
        jobUpdatedAt: livestream.streamingQueueStatus?.updatedAt ?? null,
      }),
    [
      livestream.streamingQueueStatus,
      livestream.status,
      isEndingStreamPending,
    ],
  )

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
      <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Youtube className="h-3.5 w-3.5 text-primary" />
          YouTube readiness
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Channel connected</span>
            <span className={livestream.youtubeConnected ? "text-green-600 dark:text-green-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
              {livestream.youtubeConnected ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">YouTube live prepared</span>
            <span className={livestream.hasStreamKey ? "text-green-600 dark:text-green-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
              {livestream.hasStreamKey ? "Yes" : "No"}
            </span>
          </div>
          {streamDisplayStatus ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Stream status</span>
                <Badge
                  variant="outline"
                  className={`h-6 max-w-[58%] truncate px-2 text-[10px] font-semibold ${streamingDisplayBadgeClass(streamDisplayStatus.tone)}`}
                  title={streamDisplayStatus.description}
                >
                  {streamDisplayStatus.label}
                </Badge>
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground">{streamDisplayStatus.description}</p>
            </div>
          ) : null}
        </div>
        {(livestream.youtubeChannelUrl ?? "").trim().length > 0 && (
          <p className="text-[11px] text-muted-foreground truncate">
            Channel: {livestream.youtubeChannelUrl}
          </p>
        )}
      </div>
      {recordingConsentDeclines.length > 0 && (
        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            Recording consent declined
          </p>
          <p className="text-[11px] text-muted-foreground">
            These people chose not to join while recording is on. They were not admitted to the room.
          </p>
          <ul className="text-xs space-y-1.5 text-foreground max-h-40 overflow-y-auto">
            {recordingConsentDeclines.map((row) => (
              <li key={row.id} className="flex justify-between gap-2 border-b border-amber-500/15 pb-1.5 last:border-0">
                <span className="font-medium truncate">{(row.guestLabel ?? "").trim() || "Guest"}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{formatDeclineTime(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      {livestream.requiresPasscode ? (
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
      ) : null}
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
      <div className="flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden">
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
                {livestream.canGoLive && livestream.status !== "live" && (
                  <>
                    <Button
                      variant="default"
                      size="icon"
                      className={`h-8 w-8 rounded-md bg-red-600 hover:bg-red-700 touch-manipulation ${goLiveAttentionClass}`}
                      onClick={handleGoLiveClick}
                      disabled={goLiveDisabled}
                      aria-label={isGoLiveBusy ? "Going live" : "Queue cloud stream to YouTube"}
                    >
                      {isGoLiveBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
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
                        <DropdownMenuItem onClick={handleGoLiveClick} disabled={goLiveDisabled}>
                          {isGoLiveBusy ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          {isGoLiveBusy ? "Going live…" : "Go Live (cloud relay)"}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setGoLiveOpen(true)}>
                      Stream options
                    </DropdownMenuItem>
                    {livestream.status === "live" && (
                      <DropdownMenuItem variant="destructive" onClick={handleEndStream} disabled={isUpdatingStatus || isEndingStreamPending}>
                        <Square className="h-4 w-4 mr-2" />
                        {isEndingStreamPending ? "Stopping…" : "End stream"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => window.open(vdoHostIframeSrc, "_blank")}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Open meeting in new tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="hidden md:flex items-center gap-1.5">
                {livestream.canGoLive && livestream.status !== "live" && (
                  <>
                    <Button
                      size="sm"
                      className={`bg-red-600 hover:bg-red-700 h-8 px-3 min-w-[7.5rem] ${goLiveAttentionClass}`}
                      onClick={handleGoLiveClick}
                      disabled={goLiveDisabled}
                    >
                      {isGoLiveBusy ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                      ) : (
                        <Play className="h-4 w-4 mr-1.5" />
                      )}
                      {isGoLiveBusy ? "Going live…" : "Go Live"}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => setGoLiveOpen(true)}>
                  Stream options
                </Button>
                {livestream.status === "live" && (
                  <Button variant="destructive" size="sm" className="h-8 px-3" onClick={handleEndStream} disabled={isUpdatingStatus || isEndingStreamPending}>
                    <Square className="h-4 w-4 mr-1.5" />
                    {isEndingStreamPending ? "Stopping…" : "End stream"}
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 touch-manipulation"
                onClick={() => window.open(vdoHostIframeSrc, "_blank")}
                aria-label="Open meeting in new tab"
                title="Open meeting in new tab"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {isEndingStreamPending && livestream.status === "live" && (
            <div className="shrink-0 border-b border-blue-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-3 py-2 sm:px-4">
              <p className="text-xs font-medium text-foreground">Ending YouTube live</p>
              <p className="text-[11px] text-muted-foreground">
                YouTube was told to stop. This page refreshes until the AWS worker callback reports the relay
                finished, then you can go live again.
              </p>
            </div>
          )}

          {recordingConsentDeclines.length > 0 && (
            <div className="shrink-0 border-b border-amber-500/35 bg-amber-500/10 px-3 py-2 sm:px-4">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Someone declined recording consent</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {recordingConsentDeclines
                  .slice(0, 4)
                  .map((r) => (r.guestLabel ?? "").trim() || "Guest")
                  .join(" · ")}
                {recordingConsentDeclines.length > 4 ? ` · +${recordingConsentDeclines.length - 4} more` : ""}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Full list refreshes periodically under Meeting info.</p>
            </div>
          )}

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <aside className="hidden md:flex w-64 lg:w-72 shrink-0 min-h-0 flex-col overflow-hidden border-r border-border bg-linear-to-b from-muted/30 to-muted/10 p-0">
              <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as "meeting-info" | "invite-link")} className="w-full flex flex-col min-h-0">
                <Card className="flex min-h-0 flex-1 flex-col rounded-none border-0 border-b border-border bg-transparent p-0 shadow-none">
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
                  <CardContent className="min-h-0 flex-1 overflow-y-auto p-0 px-3 pb-3 [scrollbar-width:thin] [scrollbar-color:rgb(147_51_234_/_0.45)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-400/70 [&::-webkit-scrollbar-thumb]:to-blue-500/70 dark:[&::-webkit-scrollbar-thumb]:from-purple-500/70 dark:[&::-webkit-scrollbar-thumb]:to-blue-600/70 [&::-webkit-scrollbar-thumb:hover]:from-purple-500/90 [&::-webkit-scrollbar-thumb:hover]:to-blue-600/90">
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

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative isolate flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black">
                {vdoHostIframeSrc ? (
                  <VdoMeetingIframe
                    key={recordingDestination}
                    src={vdoHostIframeSrc}
                    title="Host"
                  />
                ) : (
                  <div className="absolute inset-0 z-[1] flex items-center justify-center text-muted-foreground text-sm sm:text-base">
                    Loading meeting…
                  </div>
                )}
                {livestream.status === "live" && (
                  <div className="pointer-events-none absolute top-2 right-2 z-[2] sm:top-3 sm:right-3 rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white animate-pulse sm:px-3 sm:py-1 sm:text-sm">
                    ● LIVE
                  </div>
                )}
                {/* Hidden participant-canvas mixer iframe. Auto-runs when canvas
                    mode is on and the meeting is active — composites the 3x2 grid,
                    mixes audio, WHIP-publishes the combined stream to the worker's
                    pull path. Pre-warms on scheduled/starting so the composite is
                    live before the worker fires. No manual tab needed. */}
                {livestream.canvasMode && livestream.canvasUrl && ["scheduled", "starting", "meeting_live", "live"].includes(livestream.status) && (
                  <iframe
                    src={livestream.canvasUrl}
                    title="canvas-mixer"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="pointer-events-none absolute h-px w-px overflow-hidden border-0 opacity-0"
                    style={{ left: "-9999px", top: "-9999px" }}
                    allow="autoplay; clipboard-write"
                  />
                )}
                <div className="pointer-events-none absolute bottom-2 left-2 z-[2] md:hidden">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="pointer-events-auto h-8 gap-1.5 rounded-full bg-background/90 shadow-md touch-manipulation"
                    onClick={() => window.open(vdoHostIframeSrc, "_blank")}
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
              <p className="text-sm text-muted-foreground">
                Go Live queues our cloud relay (AWS): video from your VDO meeting is sent to your YouTube stream key. Stay in this host view so the relay has video to grab.
              </p>
              {queueStreamErrorText && (
                <Alert variant="destructive"><AlertDescription>{queueStreamErrorText}</AlertDescription></Alert>
              )}
              {livestream.hasStreamKey && livestream.canGoLive && livestream.status !== "live" && (
                <Button
                  className={`w-full bg-red-600 hover:bg-red-700 ${goLiveAttentionClass}`}
                  onClick={handleGoLiveClick}
                  disabled={goLiveDisabled}
                >
                  {isGoLiveBusy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                      Going live…
                    </>
                  ) : (
                    "Start cloud stream to YouTube"
                  )}
                </Button>
              )}
              {livestream.hasStreamKey && (!livestream.canGoLive || livestream.status === "live") && (
                <p className="text-sm text-muted-foreground">
                  {livestream.status === "live"
                    ? "You are already live. Use End stream to stop, then you can queue again."
                    : "This meeting can’t start a new cloud relay in its current state. Refresh the page or end/reset the meeting and try again."}
                </p>
              )}
              {!livestream.hasStreamKey && (
                <p className="text-sm text-muted-foreground">Use Create live on YouTube or paste a stream key in Settings first.</p>
              )}
              {livestream.status === "live" && (
                <Button variant="destructive" className="w-full" onClick={handleEndStream} disabled={isUpdatingStatus || isEndingStreamPending}>
                  <Square className="h-4 w-4 mr-2" /> {isEndingStreamPending ? "Stopping…" : "End stream"}
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
                How cloud streaming works
              </div>
              <p className="text-sm text-muted-foreground">
                Unity Meet relays your meeting picture to YouTube through our AWS worker queue.
              </p>
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Youtube className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">1. YouTube stream key</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>Connect your channel in Integrations, then use <strong className="text-foreground">Create live on YouTube</strong> on this page, or paste a key in <strong className="text-foreground">Settings</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Cloud className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">2. Host here, then Go Live</h4>
                    <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      <li>Open this meeting as host (iframe above).</li>
                      <li>Click <strong className="text-foreground">Go Live</strong> — that queues an AWS relay to YouTube.</li>
                      <li>Watch <strong className="text-foreground">Stream status</strong> in Meeting info; it moves through Pending → Live when the worker attaches.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <GoLiveConfirmDialog
        open={goLiveConfirmOpen}
        onOpenChange={setGoLiveConfirmOpen}
        onConfirm={confirmGoLive}
        isConfirming={isGoLivePending}
      />

      <Dialog open={goLivePrecheckOpen} onOpenChange={setGoLivePrecheckOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {livestream.youtubeConnected ? "Prepare YouTube Live" : "Add a stream key"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {prepareYoutubeErrorText && (
              <p className="text-sm text-destructive">{prepareYoutubeErrorText}</p>
            )}
            {livestream.youtubeConnected ? (
              <>
                <p className="text-muted-foreground">
                  Your YouTube channel is connected to Believe. Create the live broadcast on that channel — we&apos;ll save the stream key automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    disabled={isPrepareYoutubeLive}
                    onClick={() => {
                      setGoLivePrecheckOpen(false)
                      setGoLiveTab("settings")
                      setGoLiveOpen(true)
                    }}
                  >
                    Paste key manually
                  </Button>
                  <Button
                    disabled={isPrepareYoutubeLive}
                    onClick={() => {
                      setIsPrepareYoutubeLive(true)
                      router.post(
                        `/livestreams/supporter/${livestream.id}/prepare-youtube-live`,
                        {},
                        {
                          preserveScroll: true,
                          onSuccess: () => setGoLivePrecheckOpen(false),
                          onFinish: () => setIsPrepareYoutubeLive(false),
                        }
                      )
                    }}
                  >
                    {isPrepareYoutubeLive ? "Creating…" : "Create live on YouTube"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Connect YouTube under Integrations, or create a stream in Studio and paste the stream key below.
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>(Optional) Open YouTube Studio and create a live stream.</li>
                  <li>Copy the stream key.</li>
                  <li>Paste it in Settings on this page, then try Go Live again.</li>
                </ol>
                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => window.open("https://studio.youtube.com", "_blank", "noopener,noreferrer")}
                  >
                    Open YouTube Studio
                  </Button>
                  <Button
                    onClick={() => {
                      setGoLivePrecheckOpen(false)
                      setGoLiveTab("settings")
                      setGoLiveOpen(true)
                    }}
                  >
                    Add Stream Key
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </UnityMeetLayout>
  )
}
