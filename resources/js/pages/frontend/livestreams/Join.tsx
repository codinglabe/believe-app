"use client"

import { useState, useMemo } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import {
  Video,
  LogIn,
  ArrowLeft,
  AlertCircle,
  KeyRound,
  Hash,
  VideoOff,
  Mic,
  MicOff,
  ChevronDown,
} from "lucide-react"
import { Link } from "@inertiajs/react"

const BRAND = {
  from: "#9333ea",
  to: "#2563eb",
  fromMuted: "rgba(147,51,234,0.15)",
  toMuted: "rgba(37,99,235,0.1)",
}

interface Livestream {
  id: number
  title: string | null
  roomName: string
  participantUrl: string
  status: string
}

interface Organization {
  id: number
  name: string
}

interface Props {
  errors?: Record<string, string[]>
  oldMeetingId?: string
  /** True after server found the meeting and a passcode is required (or after wrong passcode). */
  requiresPasscodeStep?: boolean
  pendingMeetingTitle?: string | null
  livestream?: Livestream
  organization?: Organization
}

export default function SupporterMeetJoin({
  errors: propsErrors,
  oldMeetingId,
  requiresPasscodeStep: requiresPasscodeStepProp,
  pendingMeetingTitle,
  livestream,
  organization,
}: Props) {
  const pageProps = usePage().props as Props
  const errors = propsErrors ?? pageProps.errors
  const requiresPasscodeStep =
    requiresPasscodeStepProp ?? pageProps.requiresPasscodeStep ?? false
  const [meetingId, setMeetingId] = useState(oldMeetingId ?? "")
  const [passcode, setPasscode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showPasscodeStep =
    requiresPasscodeStep || (!!errors?.passcode?.[0] && !!(oldMeetingId ?? "").trim())

  // Step 2: after ID+passcode validated — enter name and join in-page
  const [displayName, setDisplayName] = useState("")
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [joined, setJoined] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    router.post("/livestreams/supporter/join", {
      meeting_id: meetingId.trim(),
      passcode,
    }, {
      preserveScroll: true,
      onFinish: () => setIsSubmitting(false),
    })
  }

  const meetingIdError = errors?.meeting_id?.[0] ?? null
  const passcodeError = errors?.passcode?.[0] ?? null

  const canJoin = livestream && ["draft", "meeting_live", "live"].includes(livestream.status)

  const iframeUrl = useMemo(() => {
    if (!livestream?.participantUrl || !joined) return null
    const url = new URL(livestream.participantUrl)
    const name = (displayName || "Guest").trim()
    if (name) url.searchParams.set("label", name)
    if (cameraOn) {
      url.searchParams.set("videodevice", "1")
      url.searchParams.delete("novideo")
    } else {
      url.searchParams.set("novideo", "1")
      url.searchParams.delete("videodevice")
      url.searchParams.delete("vd")
    }
    if (micOn) {
      url.searchParams.set("audiodevice", "1")
      url.searchParams.delete("nomicrophone")
    } else {
      url.searchParams.set("nomicrophone", "1")
      url.searchParams.delete("audiodevice")
      url.searchParams.delete("ad")
    }
    return url.toString()
  }, [livestream?.participantUrl, joined, displayName, cameraOn, micOn])

  // Step 2b: In-meeting view — iframe on same page
  if (livestream && joined && iframeUrl) {
    const displayLabel = (displayName || "Guest").trim()
    const initial = displayLabel.charAt(0).toUpperCase() || "G"

    return (
      <UnityMeetLayout>
        <Head title={`In meeting: ${livestream.title || "Meeting"}`} />
        <div className="flex flex-col min-h-screen bg-background">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/livestreams/supporter"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Unity Meet
              </Link>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {initial}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
                  {livestream.title || "Meeting"}
                </span>
                <span className="text-xs text-muted-foreground truncate block">
                  {organization?.name ?? "Meeting"}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">{displayLabel}</span>
          </div>
          <div className="flex-1 min-h-0 relative bg-black">
            <iframe
              src={iframeUrl}
              title="Meeting"
              allow="camera;microphone;display-capture;fullscreen;autoplay"
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </div>
      </UnityMeetLayout>
    )
  }

  // Livestream found but not joinable (ended, etc.)
  if (livestream && !canJoin) {
    return (
      <UnityMeetLayout>
        <Head title={`Join: ${livestream.title || "Meeting"}`} />
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This meeting is not currently available to join.
            </AlertDescription>
          </Alert>
          <Link href="/livestreams/supporter/join" className="mt-6">
            <Button variant="outline">Enter different meeting</Button>
          </Link>
          <Link href="/livestreams/supporter" className="mt-3 text-sm text-muted-foreground hover:text-foreground">
            Back to Unity Meet
          </Link>
        </div>
      </UnityMeetLayout>
    )
  }

  // Step 2a: Livestream validated — enter name and join (same page)
  if (livestream && canJoin) {
    return (
      <UnityMeetLayout>
        <PageHead title="Join meeting" description={livestream.title || "Enter your name to join"} />
        <Head title={`Join: ${livestream.title || "Meeting"}`} />
        <div className="min-h-screen bg-background">
          <div
            className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
            style={{
              background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.25) 30%, rgba(37,99,235,0.2) 70%, ${BRAND.toMuted} 100%)`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.15),transparent)]" />
            <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
              <Link
                href="/livestreams/supporter"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Unity Meet
              </Link>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                >
                  <Video className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {livestream.title || "Join meeting"}
                  </h1>
                  <p className="text-sm text-muted-foreground">{organization?.name}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto px-4 py-10 md:px-6">
            <Card className="border-border bg-card shadow-lg">
              <CardHeader>
                <CardTitle>Enter your name</CardTitle>
                <CardDescription>
                  Your name will be shown to others in the meeting. The meeting will start on this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Your name</Label>
                  <Input
                    id="display-name"
                    type="text"
                    placeholder="e.g. John"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-muted/50 border-border"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-center gap-6 py-2">
                  <button
                    type="button"
                    onClick={() => setCameraOn((v) => !v)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] transition-colors ${
                      cameraOn
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    aria-label={cameraOn ? "Camera on" : "Camera off"}
                  >
                    {cameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                    <span className="text-xs font-medium">{cameraOn ? "Camera on" : "Off"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMicOn((v) => !v)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] transition-colors ${
                      micOn
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    aria-label={micOn ? "Microphone on" : "Microphone off"}
                  >
                    {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                    <span className="text-xs font-medium">{micOn ? "Mic on" : "Off"}</span>
                  </button>
                </div>
                <Button
                  type="button"
                  className="w-full h-11 text-white"
                  style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
                  onClick={() => setJoined(true)}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Join now
                  <ChevronDown className="ml-2 h-4 w-4 -rotate-90" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </UnityMeetLayout>
    )
  }

  // Step 1: Meeting ID + Passcode form
  return (
    <UnityMeetLayout>
      <PageHead
        title="Join a meeting"
        description="Enter the meeting ID first; enter a passcode only when your host secured the meeting."
      />
      <Head title="Join a meeting" />
      <div className="min-h-screen bg-background">
        <div
          className="relative overflow-hidden border-b border-purple-200 dark:border-purple-500/20"
          style={{
            background: `linear-gradient(135deg, ${BRAND.fromMuted} 0%, rgba(147,51,234,0.25) 30%, rgba(37,99,235,0.2) 70%, ${BRAND.toMuted} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.15),transparent)]" />
          <div className="relative w-full px-4 py-8 md:px-6 lg:px-8">
            <Link
              href="/livestreams/supporter"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Unity Meet
            </Link>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})` }}
              >
                <Video className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Join a meeting
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter the meeting ID from your host — passcode only if the meeting is locked
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mx-auto px-4 py-10 md:px-6">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                {showPasscodeStep ? "Enter passcode" : "Meeting ID"}
              </CardTitle>
              <CardDescription>
                {showPasscodeStep
                  ? "This meeting is protected. Enter the passcode from your host."
                  : "Enter the meeting ID from your host. You’ll only be asked for a passcode if the host enabled one."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {meetingIdError && !showPasscodeStep && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{meetingIdError}</AlertDescription>
                  </Alert>
                )}
                {passcodeError && showPasscodeStep && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passcodeError}</AlertDescription>
                  </Alert>
                )}
                {!showPasscodeStep ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="meeting-id">
                        <Hash className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                        Meeting ID
                      </Label>
                      <Input
                        id="meeting-id"
                        type="text"
                        placeholder="e.g. uni-john-smith-50"
                        value={meetingId}
                        onChange={(e) => setMeetingId(e.target.value)}
                        className="bg-muted/50 border-border font-mono"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 text-white"
                      disabled={!meetingId.trim() || isSubmitting}
                      style={{
                        background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                      }}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Checking…" : "Continue"}
                    </Button>
                  </>
                ) : (
                  <>
                    {(pendingMeetingTitle ?? "").trim().length > 0 && (
                      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                        <span className="text-muted-foreground">Meeting: </span>
                        {pendingMeetingTitle}
                      </p>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="meeting-id-readonly">
                        <Hash className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                        Meeting ID
                      </Label>
                      <Input
                        id="meeting-id-readonly"
                        type="text"
                        readOnly
                        value={meetingId}
                        className="bg-muted/50 border-border font-mono text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passcode">
                        <KeyRound className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                        Passcode
                      </Label>
                      <Input
                        id="passcode"
                        type="password"
                        placeholder="Enter passcode"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="bg-muted/50 border-border"
                        autoComplete="off"
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 text-white"
                      disabled={!meetingId.trim() || !passcode.trim() || isSubmitting}
                      style={{
                        background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.to})`,
                      }}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Joining…" : "Join meeting"}
                    </Button>
                    <div className="text-center">
                      <Link
                        href="/livestreams/supporter/join"
                        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                      >
                        Use a different meeting ID
                      </Link>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </UnityMeetLayout>
  )
}
