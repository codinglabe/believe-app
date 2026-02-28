"use client"

import { useState, useMemo } from "react"
import { Head } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Video, VideoOff, Mic, MicOff } from "lucide-react"

interface Livestream {
  id: number
  title: string | null
  roomName: string
  participantUrl: string
  status: string
  hasPasscode: boolean
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestream: Livestream
  organization: Organization
}

export default function GuestJoinByToken({ livestream, organization }: Props) {
  const [displayName, setDisplayName] = useState("")
  const [joined, setJoined] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [consentChecked, setConsentChecked] = useState(false)

  const iframeUrl = useMemo(() => {
    const url = new URL(livestream.participantUrl)
    const name = (displayName || "Guest").trim()
    // Full participant interface for everyone. If no consent: add suffix so host can exclude from recording.
    const label = consentChecked ? name : `${name} (not recorded)`
    url.searchParams.set("label", label)
    if (!cameraOn) url.searchParams.set("novideo", "1")
    if (!micOn) url.searchParams.set("nomicrophone", "1")
    return url.toString()
  }, [livestream.participantUrl, displayName, cameraOn, micOn, consentChecked])

  const displayLabel = (displayName || "Guest").trim()
  const initial = displayLabel.charAt(0).toUpperCase() || "G"

  return (
    <FrontendLayout>
      <Head title={`Join: ${livestream.title || "Meeting"}`} />
      <div className="min-h-screen flex flex-col bg-[#f0f4f8] dark:bg-neutral-950">
        {!joined ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-[420px]">
              {/* Meeting title block — like Meet/Zoom */}
              <div className="text-center mb-8">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  {organization.name} is inviting you to a meeting
                </p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 dark:text-white break-words">
                  {livestream.title || "Meeting"}
                </h1>
              </div>

              {/* Join card */}
              <div className="rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200/80 dark:border-white/10 overflow-hidden">
                {/* Preview: "You'll join as" */}
                <div className="px-6 pt-6 pb-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
                    You’ll join as
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-xl font-semibold text-neutral-600 dark:text-neutral-300">
                      {initial}
                    </div>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1 h-12 text-base bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-white/10"
                    />
                  </div>
                </div>

                {/* Camera & mic toggles — like Meet */}
                <div className="px-6 py-4 border-t border-neutral-100 dark:border-white/10 flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => setCameraOn((v) => !v)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[72px] transition-colors ${
                      cameraOn
                        ? "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30"
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
                        ? "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30"
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

                {/* Join button — uses project primary */}
                <div className="p-6 pt-4">
                  <Button
                    className="w-full h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                    onClick={() => setJoined(true)}
                  >
                    Join now
                  </Button>
                  {consentChecked ? (
                    <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                      You can turn your camera and microphone on or off after joining.
                    </p>
                  ) : (
                    <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 mt-4">
                      You will join with full video and audio. Your name will show &quot;(not recorded)&quot; so the host will not include you in the recording.
                    </p>
                  )}
                </div>
              </div>

              {/* Recording & Consent Disclosure */}
              <div className="mt-6 rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200/80 dark:border-white/10 overflow-hidden px-6 py-5">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Recording &amp; Consent Disclosure
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
                  This meeting may be recorded, stored, and/or streamed live for organizational, training, archival, or public broadcast purposes. By joining or remaining in this meeting, you provide your consent to be recorded and/or streamed.
                </p>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <Checkbox
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(checked === true)}
                    className="mt-0.5 shrink-0 rounded border-neutral-300 dark:border-neutral-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">
                    I consent to being recorded and/or streamed live.
                  </span>
                </label>
              </div>

              <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
                Believe In Unity
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700 text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  {initial}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-neutral-900 dark:text-white truncate block">
                    {livestream.title || "Meeting"}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate block">
                    {organization.name}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {displayLabel}
              </span>
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
        )}
      </div>
    </FrontendLayout>
  )
}
