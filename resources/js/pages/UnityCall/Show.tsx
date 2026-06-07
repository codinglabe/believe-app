"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Head } from "@inertiajs/react"
import { Loader2, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { PhoneCallAvatar } from "@/components/call/PhoneCallAvatar"
import {
  cancelUnityCall,
  declineUnityCall,
  endUnityCall,
  acceptUnityCall,
  isLeavingUnityCall,
  navigateAfterUnityCall,
} from "@/lib/unityCall"
import { applyRemoteAudioOutput, attachWebAudioFallback, supportsAudioOutputSelection } from "@/lib/callAudioOutput"
import { dispatchUnityCallTerminated } from "@/lib/unityCallEvents"
import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { useEcho } from "@laravel/echo-react"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { useUnityCallWebRTC } from "@/hooks/useUnityCallWebRTC"

type Props = {
  call: UnityCallPayload
  caller: { id: number; name: string; avatar?: string | null }
  participants: UnityCallParticipantRow[]
  isCaller: boolean
  isGroupCall: boolean
  participantStatus: string | null
  iceServers: RTCIceServer[]
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

function RemoteAudio({ stream, speakerOn }: { stream: MediaStream; speakerOn: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const canSelectOutput = supportsAudioOutputSelection()

  useEffect(() => {
    if (!canSelectOutput) {
      if (speakerOn) {
        return attachWebAudioFallback(stream)
      }
      const audio = ref.current
      if (!audio) {
        return
      }
      audio.srcObject = stream
      void audio.play().catch(() => {})
      return () => {
        audio.srcObject = null
      }
    }

    const audio = ref.current
    if (!audio) {
      return
    }
    audio.srcObject = stream
    void applyRemoteAudioOutput(audio, speakerOn)
    return () => {
      audio.srcObject = null
    }
  }, [stream, speakerOn, canSelectOutput])

  return <audio ref={ref} autoPlay playsInline={!speakerOn || !canSelectOutput} className="hidden" />
}

export default function UnityCallShow({
  call: initialCall,
  caller,
  participants: initialParticipants,
  isCaller,
  isGroupCall,
  participantStatus,
  iceServers,
  authUserId,
}: Props) {
  const [call, setCall] = useState(initialCall)
  const [participants, setParticipants] = useState(initialParticipants)
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)

  const ringMode = useMemo(() => {
    if (typeof window === "undefined") {
      return false
    }
    return new URLSearchParams(window.location.search).get("ring") === "1"
  }, [])

  const selfStatus = useMemo(
    () => participants.find((p) => p.userId === authUserId)?.status ?? participantStatus,
    [participants, authUserId, participantStatus],
  )

  const callConnected = call.status === "accepted" && (isCaller || selfStatus === "accepted")
  const mediaActive = callConnected

  const {
    remoteStreams,
    mediaConnected,
    isAudioEnabled,
    permissionStatus,
    connectionStatus,
    stopMedia,
    toggleMute,
    retryPermission,
  } = useUnityCallWebRTC({
    callId: call.id,
    userId: authUserId,
    isCaller,
    participants,
    mediaActive,
    iceServers,
  })

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
    if (callConnected && mediaConnected) {
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
    return connectionStatus === "idle" ? "Connecting…" : connectionStatus
  }, [call.status, isCaller, participants, callConnected, mediaConnected, elapsed, connectionStatus])

  const statusHint = useMemo(() => {
    if (permissionStatus === "denied") {
      return "Allow microphone in browser settings"
    }
    if (permissionStatus === "unsupported") {
      return "Microphone not available"
    }
    if (callConnected && mediaConnected) {
      return speakerOn ? (isAudioEnabled ? "Speaker on" : "Speaker on · mic muted") : "Earpiece"
    }
    if (isCaller && call.status === "ringing") {
      return "Waiting for answer…"
    }
    if (callConnected) {
      return connectionStatus
    }
    return "Setting up call…"
  }, [callConnected, mediaConnected, isAudioEnabled, speakerOn, isCaller, call.status, connectionStatus, permissionStatus])

  const onStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      setCall(payload.call)
      setParticipants(payload.participants)

      if (payload.reason === "participant_left") {
        const self = payload.participants.find((p) => p.userId === authUserId)
        if (self?.status === "left") {
          stopMedia()
          navigateAfterUnityCall(payload.call.id, payload.call.chatRoomId ?? call.chatRoomId)
        }
        return
      }

      if (["ended", "cancelled", "declined", "missed"].includes(payload.reason)) {
        stopMedia()
        if (!isLeavingUnityCall(payload.call.id)) {
          navigateAfterUnityCall(payload.call.id, payload.call.chatRoomId ?? call.chatRoomId)
        }
      }
    },
    [authUserId, call.chatRoomId, stopMedia],
  )

  useEcho<UnityCallStatusEvent>(`user.${authUserId}`, ".call.status", onStatus, [authUserId, onStatus], "private")

  useEffect(() => {
    if (!callConnected || !call.answeredAt) {
      return
    }
    const started = new Date(call.answeredAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [callConnected, call.answeredAt])

  const handleAccept = async () => {
    if (accepting || isCaller || selfStatus !== "ringing") {
      return
    }

    if (call.status !== "ringing" && call.status !== "accepted") {
      return
    }

    setAccepting(true)
    const { ok, data } = await acceptUnityCall(call.id)
    setAccepting(false)

    if (ok && data) {
      setCall({ ...data.call, joinUrl: data.join_url })
      setParticipants(data.participants)
    } else if (ok) {
      setCall((current) => ({ ...current, status: "accepted" }))
      setParticipants((current) =>
        current.map((p) => (p.userId === authUserId ? { ...p, status: "accepted" } : p)),
      )
    }
  }

  const handleEnd = async () => {
    if (ending || isLeavingUnityCall(call.id)) {
      return
    }

    setEnding(true)
    stopMedia()

    let ok = false
    if (call.status === "ringing") {
      if (isCaller) {
        ok = await cancelUnityCall(call.id)
      } else {
        ok = await declineUnityCall(call.id)
      }
    } else {
      ok = await endUnityCall(call.id)
    }

    if (!ok) {
      setEnding(false)
      toast.error("Could not end the call. Please try again.")
      return
    }

    if (call.status === "ringing") {
      if (isCaller) {
        dispatchUnityCallTerminated({
          reason: "cancelled",
          call: { ...call, status: "cancelled" },
          caller,
          participants,
        })
      } else {
        dispatchUnityCallTerminated({
          reason: "declined",
          call: { ...call, status: "declined" },
          caller,
          participants,
        })
      }
    } else if (!isGroupCall || isCaller) {
      dispatchUnityCallTerminated({
        reason: "ended",
        call: { ...call, status: "ended" },
        caller,
        participants,
      })
    }

    navigateAfterUnityCall(call.id, call.chatRoomId)
    setEnding(false)
  }

  const isRingingCallee =
    !isCaller &&
    selfStatus === "ringing" &&
    (call.status === "ringing" || call.status === "accepted")
  const showRingingCalleeControls = isRingingCallee && !ringMode

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-purple-950 via-[#120818] to-blue-950 text-white">
      <Head title="Audio call" />

      {remoteStreams.map(({ peerId, stream }) => (
        <RemoteAudio key={peerId} stream={stream} speakerOn={speakerOn} />
      ))}

      <div className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
          <PhoneCallAvatar
            name={displayName}
            avatar={displayAvatar}
            subtitle={statusHint}
            pulse={!callConnected || !mediaConnected}
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

          {callConnected && !mediaConnected && permissionStatus === "denied" ? (
            <div className="mt-6 w-full max-w-sm rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-center">
              <p className="text-sm text-amber-100">Microphone access is required for this call.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 border-white/20 text-white hover:bg-white/10"
                onClick={() => retryPermission()}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {callConnected && !mediaConnected && permissionStatus !== "denied" ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              {connectionStatus}
            </div>
          ) : null}
        </div>

        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 pb-8 pt-6 safe-area-inset-bottom">
          {callConnected && mediaConnected ? (
            <div className="flex items-center gap-8">
              <button
                type="button"
                className="flex flex-col items-center gap-2 text-white/70"
                onClick={() => toggleMute()}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  {!isAudioEnabled ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </span>
                <span className="text-xs">{!isAudioEnabled ? "Unmute" : "Mute"}</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-2 text-white/70"
                aria-label={speakerOn ? "Switch to earpiece" : "Switch to speaker"}
                onClick={() => setSpeakerOn((current) => !current)}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    speakerOn ? "bg-purple-500/30 ring-1 ring-purple-400/50" : "bg-white/10"
                  }`}
                >
                  {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </span>
                <span className="text-xs">{speakerOn ? "Speaker" : "Earpiece"}</span>
              </button>
            </div>
          ) : null}

          {showRingingCalleeControls ? (
            <div className="flex items-center justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="h-16 w-16 rounded-full p-0 shadow-lg"
                  disabled={ending || accepting}
                  aria-label="Decline call"
                  onClick={() => void handleEnd()}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <span className="text-xs text-white/60">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 p-0 shadow-lg hover:from-purple-700 hover:to-blue-700"
                  disabled={ending || accepting}
                  aria-label="Accept call"
                  onClick={() => void handleAccept()}
                >
                  {accepting ? <Loader2 className="h-7 w-7 animate-spin" /> : <Phone className="h-7 w-7" />}
                </Button>
                <span className="text-xs text-white/60">Accept</span>
              </div>
            </div>
          ) : !isRingingCallee || ringMode ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="h-16 w-16 rounded-full p-0 shadow-lg"
                disabled={ending || accepting}
                aria-label="End call"
                onClick={() => void handleEnd()}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <span className="text-sm text-white/60">
                {call.status === "ringing"
                  ? isCaller
                    ? "Cancel call"
                    : "Decline"
                  : isGroupCall && !isCaller
                    ? "Leave call"
                    : "End call"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
