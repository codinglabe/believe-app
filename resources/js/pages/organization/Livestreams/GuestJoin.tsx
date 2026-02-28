"use client"

import { useState } from "react"
import { Head } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  AlertCircle,
} from "lucide-react"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  participantUrl: string
  status: "draft" | "scheduled" | "meeting_live" | "live" | "ended" | "cancelled"
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestream: Livestream
  organization: Organization
}

export default function GuestJoin({ livestream, organization }: Props) {
  const [displayName, setDisplayName] = useState("")
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [consentChecked, setConsentChecked] = useState(false)

  const canJoin = ["draft", "scheduled", "meeting_live", "live"].includes(livestream.status)

  const displayLabel = (displayName || "Guest").trim()
  const initial = displayLabel.charAt(0).toUpperCase() || "G"

  const handleJoin = () => {
    if (!canJoin) return
    const name = displayName.trim() || "Guest"
    const url = new URL(livestream.participantUrl)
    // Full participant interface for everyone. If no consent: add suffix so host can exclude from recording (VDO.Ninja has no "don't record me" flag).
    const label = consentChecked ? name : `${name} (not recorded)`
    url.searchParams.set("label", label)
    if (!cameraOn) url.searchParams.set("novideo", "1")
    if (!micOn) url.searchParams.set("nomicrophone", "1")
    window.open(url.toString(), "_blank")
  }

  return (
    <FrontendLayout>
      <Head title={`Join: ${livestream.title || "Meeting"}`} />
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-[420px]">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground mb-1">
                {organization.name} is inviting you to a meeting
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground break-words">
                {livestream.title || "Meeting"}
              </h1>
            </div>

            {!canJoin && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This meeting is not currently available to join.
                </AlertDescription>
              </Alert>
            )}

            {canJoin && (
              <>
                {/* YOU'LL JOIN AS card */}
                <div className="rounded-2xl bg-card shadow-xl border border-border overflow-hidden">
                  <div className="px-6 pt-6 pb-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                      You&apos;ll join as
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                        {initial}
                      </div>
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="flex-1 h-12 text-base bg-muted/50 border-border"
                      />
                    </div>
                  </div>

                  {/* Camera & mic toggles */}
                  <div className="px-6 py-4 border-t border-border flex items-center justify-center gap-6">
                    <button
                      type="button"
                      onClick={() => setCameraOn((v) => !v)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] transition-colors ${
                        cameraOn
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      }`}
                      aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
                    >
                      {cameraOn ? (
                        <Video className="h-6 w-6" />
                      ) : (
                        <VideoOff className="h-6 w-6" />
                      )}
                      <span className="text-xs font-medium">{cameraOn ? "Camera on" : "Camera off"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMicOn((v) => !v)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] transition-colors ${
                        micOn
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      }`}
                      aria-label={micOn ? "Turn off microphone" : "Turn on microphone"}
                    >
                      {micOn ? (
                        <Mic className="h-6 w-6" />
                      ) : (
                        <MicOff className="h-6 w-6" />
                      )}
                      <span className="text-xs font-medium">{micOn ? "Mic on" : "Mic off"}</span>
                    </button>
                  </div>

                  {/* Join button */}
                  <div className="p-6 pt-4">
                    <Button
                      className="w-full h-12 text-base font-medium rounded-xl"
                      onClick={handleJoin}
                    >
                      Join now
                    </Button>
                    {!consentChecked && (
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        You will join with full video and audio. Your name will show &quot;(not recorded)&quot; so the host will not include you in the recording.
                      </p>
                    )}
                    <p className="text-center text-xs text-muted-foreground mt-4">
                      You can turn your camera and microphone on or off after joining.
                    </p>
                  </div>
                </div>

                {/* Recording & Consent Disclosure */}
                <div className="mt-6 rounded-2xl bg-card shadow-xl border border-border overflow-hidden px-6 py-5">
                  <h2 className="text-sm font-semibold text-foreground mb-2">
                    Recording &amp; Consent Disclosure
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    This meeting may be recorded, stored, and/or streamed live for organizational, training, archival, or public broadcast purposes. By joining or remaining in this meeting, you provide your consent to be recorded and/or streamed.
                  </p>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={consentChecked}
                      onCheckedChange={(checked) => setConsentChecked(checked === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-sm text-foreground/90 group-hover:text-foreground">
                      I consent to being recorded and/or streamed live.
                    </span>
                  </label>
                </div>
              </>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              Believe In Unity
            </p>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
