"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Head, router } from "@inertiajs/react"
import { PhoneOff, Mic, Volume2 } from "lucide-react"
import VdoMeetingIframe from "@/components/meeting/VdoMeetingIframe"
import { Button } from "@/components/ui/button"
import { cancelUnityCall, endUnityCall, acceptUnityCall } from "@/lib/unityCall"
import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { useEcho } from "@laravel/echo-react"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

type Props = {
  call: UnityCallPayload
  caller: { id: number; name: string; avatar?: string | null }
  participants: UnityCallParticipantRow[]
  isCaller: boolean
  participantStatus: string | null
  vdoUrl: string
  endCallUrl: string
  cancelCallUrl: string
  acceptCallUrl: string
  chatUrl: string
  authUserId: number
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

export default function UnityCallShow({
  call: initialCall,
  caller,
  participants: initialParticipants,
  isCaller,
  participantStatus,
  vdoUrl,
  chatUrl,
  authUserId,
}: Props) {
  const [call, setCall] = useState(initialCall)
  const [participants, setParticipants] = useState(initialParticipants)
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)

  const showVdo =
    call.status === "accepted" ||
    (isCaller && call.status === "ringing") ||
    (!isCaller && participantStatus === "accepted")

  const title = useMemo(() => {
    if (call.chatRoomName) {
      return call.chatRoomName
    }
    return caller.name
  }, [call.chatRoomName, caller.name])

  const statusLabel = useMemo(() => {
    if (call.status === "ended" || call.status === "cancelled" || call.status === "declined" || call.status === "missed") {
      return "Call ended"
    }
    if (call.status === "accepted") {
      return "Connected"
    }
    if (isCaller) {
      const accepted = participants.filter((p) => p.role === "callee" && p.status === "accepted").length
      const ringing = participants.filter((p) => p.role === "callee" && p.status === "ringing").length
      if (accepted > 0) {
        return `${accepted} joined${ringing > 0 ? ` · ${ringing} ringing` : ""}`
      }
      return "Calling…"
    }
    return "Connecting…"
  }, [call.status, isCaller, participants])

  const onStatus = useCallback((payload: UnityCallStatusEvent) => {
    setCall(payload.call)
    setParticipants(payload.participants)

    if (["ended", "cancelled", "declined", "missed"].includes(payload.reason)) {
      router.visit(chatUrl)
    }
  }, [chatUrl])

  useEcho<UnityCallStatusEvent>(
    `user.${authUserId}`,
    ".call.status",
    onStatus,
    [authUserId, onStatus],
    "private",
  )

  useEffect(() => {
    if (isCaller || participantStatus !== "ringing" || call.status !== "ringing") {
      return
    }

    void acceptUnityCall(call.id)
  }, [isCaller, participantStatus, call.id, call.status])

  useEffect(() => {
    if (call.status !== "accepted" || !call.answeredAt) {
      return
    }
    const started = new Date(call.answeredAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [call.status, call.answeredAt])

  const handleEnd = async () => {
    setEnding(true)
    if (call.status === "ringing" && isCaller) {
      await cancelUnityCall(call.id)
    } else {
      await endUnityCall(call.id)
    }
    setEnding(false)
    router.visit(chatUrl)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-purple-950 via-background to-blue-950 text-foreground">
      <Head title="Audio call" />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
        <div className="text-center">
          <p className="text-sm font-medium text-purple-300">Audio call</p>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{statusLabel}</p>
          {call.status === "accepted" ? (
            <p className="mt-3 font-mono text-lg tabular-nums text-foreground">{formatElapsed(elapsed)}</p>
          ) : null}
        </div>

        <div className="mt-8 space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</p>
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.userId} className="flex items-center justify-between text-sm">
                <span>
                  {p.name}
                  {p.userId === authUserId && p.role === "caller" ? " (you)" : ""}
                </span>
                <span className="capitalize text-muted-foreground">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>

        {showVdo ? (
          <div className="relative mt-6 h-0 w-0 overflow-hidden opacity-0" aria-hidden>
            <VdoMeetingIframe src={vdoUrl} title="Audio call" audioOnly active={showVdo} showLogoOverlay={false} />
          </div>
        ) : null}

        <div className="mt-auto flex flex-col items-center gap-4 pb-8 pt-10">
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Mic className="h-6 w-6" />
              <span className="text-xs">Mic in call</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Volume2 className="h-6 w-6" />
              <span className="text-xs">Speaker</span>
            </div>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="h-14 w-14 rounded-full p-0"
            disabled={ending}
            aria-label="End call"
            onClick={() => void handleEnd()}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {call.status === "ringing" && isCaller ? "Cancel call" : "End call"}
          </span>
        </div>
      </div>
    </div>
  )
}
