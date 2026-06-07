"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Head, router } from "@inertiajs/react"
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react"
import VdoMeetingIframe from "@/components/meeting/VdoMeetingIframe"
import { Button } from "@/components/ui/button"
import { PhoneCallAvatar } from "@/components/call/PhoneCallAvatar"
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
  const [muted, setMuted] = useState(false)
  const acceptAttempted = useRef(false)

  const selfStatus = useMemo(
    () => participants.find((p) => p.userId === authUserId)?.status ?? participantStatus,
    [participants, authUserId, participantStatus],
  )

  const isConnected = call.status === "accepted" && (isCaller || selfStatus === "accepted")

  const showVdo =
    call.status === "accepted" ||
    (isCaller && call.status === "ringing") ||
    (!isCaller && selfStatus === "accepted")

  const displayName = useMemo(() => {
    if (isCaller) {
      if (call.chatRoomName) {
        return call.chatRoomName
      }
      const callee = participants.find((p) => p.role === "callee")
      return callee?.name ?? caller.name
    }
    return caller.name
  }, [isCaller, call.chatRoomName, participants, caller.name])

  const displayAvatar = useMemo(() => {
    if (isCaller) {
      const callee = participants.find((p) => p.role === "callee")
      return callee?.avatar ?? caller.avatar
    }
    return caller.avatar
  }, [isCaller, participants, caller.avatar])

  const statusLabel = useMemo(() => {
    if (call.status === "ended" || call.status === "cancelled" || call.status === "declined" || call.status === "missed") {
      return "Call ended"
    }
    if (isConnected) {
      return formatElapsed(elapsed)
    }
    if (isCaller) {
      const accepted = participants.filter((p) => p.role === "callee" && p.status === "accepted").length
      const ringing = participants.filter((p) => p.role === "callee" && p.status === "ringing").length
      if (accepted > 0) {
        return `${accepted} joined${ringing > 0 ? ` · ${ringing} ringing` : ""}`
      }
      return "Calling…"
    }
    if (selfStatus === "accepted" && call.status !== "accepted") {
      return "Connecting…"
    }
    return "Connecting…"
  }, [call.status, isCaller, participants, isConnected, elapsed, selfStatus])

  const statusHint = useMemo(() => {
    if (isConnected) {
      return muted ? "Microphone muted" : "Audio call"
    }
    if (isCaller && call.status === "ringing") {
      return "Waiting for answer…"
    }
    if (!isCaller && showVdo) {
      return "Allow microphone to join"
    }
    return "Setting up call…"
  }, [isConnected, isCaller, call.status, showVdo, muted])

  const onStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      setCall(payload.call)
      setParticipants(payload.participants)

      if (["ended", "cancelled", "declined", "missed"].includes(payload.reason)) {
        router.visit(chatUrl)
      }
    },
    [chatUrl],
  )

  useEcho<UnityCallStatusEvent>(`user.${authUserId}`, ".call.status", onStatus, [authUserId, onStatus], "private")

  useEffect(() => {
    if (acceptAttempted.current || isCaller || selfStatus !== "ringing" || call.status !== "ringing") {
      return
    }

    acceptAttempted.current = true
    void acceptUnityCall(call.id).then(({ ok, data }) => {
      if (ok && data) {
        setCall({ ...data.call, joinUrl: data.join_url })
        setParticipants(data.participants)
      }
    })
  }, [isCaller, selfStatus, call.id, call.status])

  useEffect(() => {
    if (!isConnected || !call.answeredAt) {
      return
    }
    const started = new Date(call.answeredAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [isConnected, call.answeredAt])

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
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-purple-950 via-[#120818] to-blue-950 text-white">
      <Head title="Audio call" />

      <div className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
          <PhoneCallAvatar
            name={displayName}
            avatar={displayAvatar}
            subtitle={statusHint}
            pulse={!isConnected}
          />

          <p className="mt-8 font-mono text-3xl tabular-nums tracking-wide">{statusLabel}</p>

          {isCaller && call.status === "ringing" ? (
            <div className="mt-6 w-full max-w-sm space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Ringing</p>
              <ul className="space-y-2">
                {participants
                  .filter((p) => p.role === "callee")
                  .map((p) => (
                    <li key={p.userId} className="flex items-center justify-between text-sm">
                      <span>{p.name}</span>
                      <span className="capitalize text-white/60">{p.status}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {showVdo ? (
            <div className="relative mt-6 h-36 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <VdoMeetingIframe
                src={vdoUrl}
                title="Audio call"
                audioOnly
                active={showVdo}
                showLogoOverlay={false}
                className="absolute inset-0 z-[1] h-full w-full border-0 bg-black"
              />
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 pb-8 pt-6 safe-area-inset-bottom">
          {isConnected ? (
            <div className="flex items-center gap-8">
              <button
                type="button"
                className="flex flex-col items-center gap-2 text-white/70"
                onClick={() => setMuted((value) => !value)}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </span>
                <span className="text-xs">{muted ? "Unmute" : "Mute"}</span>
              </button>
              <div className="flex flex-col items-center gap-2 text-white/70">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <Volume2 className="h-5 w-5" />
                </span>
                <span className="text-xs">Speaker</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-16 w-16 rounded-full p-0 shadow-lg"
              disabled={ending}
              aria-label="End call"
              onClick={() => void handleEnd()}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            <span className="text-sm text-white/60">
              {call.status === "ringing" && isCaller ? "Cancel call" : "End call"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
