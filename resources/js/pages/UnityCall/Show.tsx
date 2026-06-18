"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Head } from "@inertiajs/react"
import { Loader2, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { PhoneCallAvatar } from "@/components/call/PhoneCallAvatar"
import {
  acceptUnityCall,
  isLeavingUnityCall,
  markUnityCallLiveOnPage,
  markUnityCallSessionActive,
  clearUnityCallLiveOnPage,
  clearUnityCallSessionActive,
  navigateAfterUnityCall,
  terminateUnityCall,
  unityCallChatChannelName,
} from "@/lib/unityCall"
import { applyRemoteAudioOutput } from "@/lib/callAudioOutput"
import { dispatchUnityCallTerminated, isUnityCallTerminated } from "@/lib/unityCallEvents"
import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { useEcho } from "@laravel/echo-react"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { useUnityCallWebRTC } from "@/hooks/useUnityCallWebRTC"
import { useUnityCallRingTimeout } from "@/hooks/useUnityCallRingTimeout"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"

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

function UnityCallChatStatusEcho({
  channelName,
  visibility,
  onStatus,
}: {
  channelName: string
  visibility: "public" | "private"
  onStatus: (payload: UnityCallStatusEvent) => void
}) {
  useEcho<UnityCallStatusEvent>(
    channelName,
    ".call.status",
    onStatus,
    [channelName, onStatus],
    visibility,
  )
  return null
}

function RemoteAudio({ stream, speakerOn }: { stream: MediaStream; speakerOn: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = ref.current
    if (!audio) {
      return
    }

    audio.srcObject = stream
    audio.autoplay = true
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    audio.muted = false

    const ensurePlayback = () => {
      void applyRemoteAudioOutput(audio, speakerOn)
    }

    ensurePlayback()
    audio.addEventListener("loadedmetadata", ensurePlayback)
    audio.addEventListener("canplay", ensurePlayback)

    const onTrackChange = () => ensurePlayback()
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true
      track.addEventListener("unmute", onTrackChange)
      track.addEventListener("mute", onTrackChange)
      track.addEventListener("ended", onTrackChange)
    })
    stream.addEventListener("addtrack", onTrackChange)
    stream.addEventListener("removetrack", onTrackChange)

    const retryTimers = [300, 1000, 2500].map((delay) => window.setTimeout(ensurePlayback, delay))

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer))
      audio.removeEventListener("loadedmetadata", ensurePlayback)
      audio.removeEventListener("canplay", ensurePlayback)
      stream.getAudioTracks().forEach((track) => {
        track.removeEventListener("unmute", onTrackChange)
        track.removeEventListener("mute", onTrackChange)
        track.removeEventListener("ended", onTrackChange)
      })
      stream.removeEventListener("addtrack", onTrackChange)
      stream.removeEventListener("removetrack", onTrackChange)
      audio.srcObject = null
    }
  }, [stream, speakerOn])

  return (
    <audio
      ref={ref}
      data-unity-call-remote="1"
      autoPlay
      playsInline
      className="hidden"
    />
  )
}

function mergeCallParticipants(
  previous: UnityCallParticipantRow[],
  incoming: UnityCallParticipantRow[],
): UnityCallParticipantRow[] {
  const map = new Map(previous.map((row) => [row.userId, row]))
  for (const row of incoming) {
    map.set(row.userId, { ...(map.get(row.userId) ?? row), ...row })
  }
  return Array.from(map.values())
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

  useEffect(() => {
    refreshEchoAuthHeaders()
  }, [])

  const selfStatus = useMemo(
    () => participants.find((p) => p.userId === authUserId)?.status ?? participantStatus,
    [participants, authUserId, participantStatus],
  )

  const acceptedCallees = useMemo(
    () => participants.filter((p) => p.role === "callee" && p.status === "accepted"),
    [participants],
  )

  const ringingCallees = useMemo(
    () => participants.filter((p) => p.role === "callee" && p.status === "ringing"),
    [participants],
  )

  const callLive = call.status === "accepted" || acceptedCallees.length > 0
  const callConnected = callLive && (isCaller || selfStatus === "accepted")
  const mediaActive = isCaller
    ? call.status === "ringing" || call.status === "accepted"
    : callConnected

  const {
    localStream,
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
    isGroupCall,
    callerId: caller.id,
    callStatus: callLive ? "accepted" : call.status,
    participants,
    mediaActive,
    iceServers,
  })

  const isTerminalCallStatus = useMemo(
    () => ["ended", "cancelled", "declined", "missed"].includes(call.status),
    [call.status],
  )

  const exitNavigationStarted = useRef(false)

  const exitCallScreen = useCallback(
    (nextStatus?: string) => {
      if (exitNavigationStarted.current) {
        return
      }
      exitNavigationStarted.current = true

      setEnding(true)
      if (nextStatus) {
        setCall((current) => ({ ...current, status: nextStatus }))
      }
      stopMedia()
      navigateAfterUnityCall(call.id, call.chatRoomId, {
        onFinish: () => {
          exitNavigationStarted.current = false
          setEnding(false)
        },
      })
    },
    [call.chatRoomId, call.id, stopMedia],
  )

  const displayName = useMemo(() => {
    if (isGroupCall) {
      return call.chatRoomName?.trim() || "Group call"
    }
    if (isCaller) {
      const callee = participants.find((p) => p.role === "callee")
      return callee?.name ?? caller.name
    }
    return caller.name
  }, [isGroupCall, isCaller, call.chatRoomName, participants, caller.name])

  const groupCallerLine = useMemo(() => {
    if (!isGroupCall) {
      return null
    }
    if (isCaller) {
      return "You started this call"
    }
    if (callLive) {
      return `Started by ${caller.name}`
    }
    return `${caller.name} is calling`
  }, [isGroupCall, isCaller, caller.name, callLive])

  const displayAvatar = useMemo(() => {
    if (isGroupCall) {
      return caller.avatar
    }
    if (isCaller) {
      const callee = participants.find((p) => p.role === "callee")
      return callee?.avatar ?? caller.avatar
    }
    return caller.avatar
  }, [isGroupCall, isCaller, participants, caller.avatar])

  const statusLabel = useMemo(() => {
    if (ending || isTerminalCallStatus) {
      return "Call ended"
    }
    if (callLive && call.answeredAt) {
      return formatElapsed(elapsed)
    }
    if (isCaller) {
      if (acceptedCallees.length > 0) {
        const ringing = ringingCallees.length
        return ringing > 0 ? `${acceptedCallees.length} joined · ${ringing} ringing` : `${acceptedCallees.length} joined`
      }
      return "Calling…"
    }
    if (callConnected && mediaConnected) {
      return formatElapsed(elapsed)
    }
    if (connectionStatus === "idle") {
      return "Connecting…"
    }
    return connectionStatus
  }, [
    ending,
    isTerminalCallStatus,
    call.answeredAt,
    isCaller,
    acceptedCallees.length,
    ringingCallees.length,
    callLive,
    callConnected,
    mediaConnected,
    elapsed,
    connectionStatus,
  ])

  const statusHint = useMemo(() => {
    if (ending || isTerminalCallStatus) {
      return "Returning to chat…"
    }
    if (permissionStatus === "denied") {
      return "Allow microphone in browser settings"
    }
    if (permissionStatus === "unsupported") {
      return "Microphone not available"
    }
    if (callConnected && mediaConnected) {
      return speakerOn ? (isAudioEnabled ? "Speaker on" : "Speaker on · mic muted") : "Earpiece"
    }
    if (isCaller && acceptedCallees.length > 0) {
      return mediaConnected ? "Connected" : `${acceptedCallees.length} in call · ${connectionStatus}`
    }
    if (isCaller && call.status === "ringing") {
      return "Waiting for answer…"
    }
    if (callConnected) {
      return connectionStatus
    }
    return "Setting up call…"
  }, [ending, isTerminalCallStatus, callConnected, mediaConnected, isAudioEnabled, speakerOn, isCaller, call.status, connectionStatus, permissionStatus, acceptedCallees.length])

  const showMediaControls =
    Boolean(localStream) &&
    permissionStatus === "granted" &&
    !["ended", "cancelled", "declined", "missed"].includes(call.status)

  const unlockRemotePlayback = useCallback(() => {
    document.querySelectorAll('audio[data-unity-call-remote="1"]').forEach((node) => {
      void (node as HTMLAudioElement).play().catch(() => {})
    })
  }, [])

  useEffect(() => {
    if (remoteStreams.length === 0) {
      return
    }
    unlockRemotePlayback()
  }, [remoteStreams, unlockRemotePlayback])

  const handleCallTerminated = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (payload.call.id !== call.id) {
        return
      }

      setCall(payload.call)
      setParticipants((previous) => mergeCallParticipants(previous, payload.participants))

      if (payload.reason === "accepted") {
        unlockRemotePlayback()
        return
      }

      if (payload.reason === "participant_left" || payload.reason === "participant_declined") {
        const self = payload.participants.find((p) => p.userId === authUserId)
        if (self?.status === "left" || self?.status === "declined") {
          exitCallScreen(payload.call.status)
        }
        return
      }

      if (payload.reason === "participant_missed") {
        const self = payload.participants.find((p) => p.userId === authUserId)
        if (!isCaller && self?.status === "missed") {
          exitCallScreen("missed")
        }
        return
      }

      if (isUnityCallTerminated(payload)) {
        dispatchUnityCallTerminated(payload)
        if (!isLeavingUnityCall(payload.call.id)) {
          exitCallScreen(payload.call.status)
        }
      }
    },
    [authUserId, call.id, exitCallScreen, isCaller, unlockRemotePlayback],
  )

  const onStatus = handleCallTerminated

  useEcho<UnityCallStatusEvent>(`user.${authUserId}`, ".call.status", onStatus, [authUserId, onStatus], "private")

  useEcho<UnityCallStatusEvent>(
    `unity-call.${call.id}`,
    ".call.session.status",
    handleCallTerminated,
    [call.id, handleCallTerminated],
    "private",
  )

  const chatChannelName = useMemo(() => {
    if (!call.chatRoomId) {
      return null
    }
    return unityCallChatChannelName(call.chatRoomId, isGroupCall, call.chatRoomType ?? null)
  }, [call.chatRoomId, call.chatRoomType, isGroupCall])

  const chatChannelVisibility = chatChannelName?.startsWith("public-chat.") ? "public" : "private"

  useUnityCallRingTimeout({
    callId: call.id,
    callStatus: call.status,
    ringExpiresAt: call.ringExpiresAt,
    enabled: !isCaller && selfStatus === "ringing" && call.status === "ringing" && !ending,
    onExpired: () => exitCallScreen("missed"),
  })

  useEffect(() => {
    if (ending || isLeavingUnityCall(call.id) || !isTerminalCallStatus) {
      return
    }

    exitCallScreen(call.status)
  }, [call.status, call.id, ending, exitCallScreen, isTerminalCallStatus])

  useEffect(() => {
    if (ending || isLeavingUnityCall(call.id) || isTerminalCallStatus) {
      clearUnityCallSessionActive(call.id)
      clearUnityCallLiveOnPage(call.id)
      return
    }

    markUnityCallSessionActive(call.id)

    if (!callLive || !callConnected) {
      clearUnityCallLiveOnPage(call.id)
      return
    }

    markUnityCallLiveOnPage(call.id)
    return () => {
      clearUnityCallLiveOnPage(call.id)
    }
  }, [call.id, callConnected, callLive, ending, isTerminalCallStatus])

  useEffect(() => {
    return () => {
      if (!isLeavingUnityCall(call.id)) {
        clearUnityCallSessionActive(call.id)
      }
    }
  }, [call.id])

  useEffect(() => {
    if (!callLive || !call.answeredAt) {
      return
    }
    const started = new Date(call.answeredAt).getTime()
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [callLive, call.answeredAt])

  const isRejoinCallee =
    !isCaller &&
    call.status === "accepted" &&
    (selfStatus === "declined" || selfStatus === "left" || selfStatus === "missed")

  const canAnswerLate =
    !isCaller && call.status === "ringing" && selfStatus === "missed"

  const handleAccept = async () => {
    if (accepting || isCaller) {
      return
    }

    const canJoin = selfStatus === "ringing" || isRejoinCallee || canAnswerLate
    if (!canJoin) {
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
      unlockRemotePlayback()
    } else if (ok) {
      setCall((current) => ({ ...current, status: "accepted" }))
      setParticipants((current) =>
        current.map((p) => (p.userId === authUserId ? { ...p, status: "accepted" } : p)),
      )
      unlockRemotePlayback()
    }
  }

  const handleEnd = () => {
    if (ending || isLeavingUnityCall(call.id)) {
      return
    }

    const wasRinging = call.status === "ringing"
    const finalStatus =
      isCaller && wasRinging ? "cancelled" : !isCaller && wasRinging ? "declined" : "ended"

    if (isCaller && wasRinging) {
      dispatchUnityCallTerminated({
        reason: "cancelled",
        call: { ...call, status: "cancelled" },
        caller,
        participants,
      })
    } else if (!isCaller && wasRinging) {
      dispatchUnityCallTerminated({
        reason: "declined",
        call: { ...call, status: "declined" },
        caller,
        participants,
      })
    } else {
      dispatchUnityCallTerminated({
        reason: wasRinging ? "cancelled" : "ended",
        call: { ...call, status: finalStatus },
        caller,
        participants,
      })
    }

    exitCallScreen(finalStatus)

    void terminateUnityCall({
      callId: call.id,
      isCaller,
      callStatus: call.status,
      selfStatus,
    }).then(({ ok, message }) => {
      if (!ok) {
        toast.error(message?.trim() || "Could not end the call.")
      }
    })
  }

  const isRingingCallee =
    !isCaller &&
    selfStatus === "ringing" &&
    (call.status === "ringing" || call.status === "accepted")
  const showRingingCalleeControls = isRingingCallee && !ringMode
  const showRejoinControls = isRejoinCallee || canAnswerLate

  const mergedRemoteStream = useMemo(() => {
    const merged = new MediaStream()
    remoteStreams.forEach(({ stream }) => {
      stream.getAudioTracks().forEach((track) => {
        if (!merged.getTracks().some((item) => item.id === track.id)) {
          merged.addTrack(track)
        }
      })
    })
    return merged
  }, [remoteStreams])

  return (
    <div className="fixed inset-0 z-[9998] flex min-h-[100dvh] flex-col bg-gradient-to-b from-purple-950 via-[#120818] to-blue-950 text-white">
      <Head title="Audio call" />

      {chatChannelName ? (
        <UnityCallChatStatusEcho
          channelName={chatChannelName}
          visibility={chatChannelVisibility}
          onStatus={handleCallTerminated}
        />
      ) : null}

      {mergedRemoteStream.getAudioTracks().length > 0 ? (
        <RemoteAudio key="merged-remote" stream={mergedRemoteStream} speakerOn={speakerOn} />
      ) : null}

      <div className="flex flex-1 flex-col px-4 py-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center">
          <PhoneCallAvatar
            name={displayName}
            avatar={displayAvatar}
            subtitle={isGroupCall ? (groupCallerLine ?? undefined) : statusHint}
            pulse={!ending && !isTerminalCallStatus && (!callLive || !mediaConnected)}
          />
          {isGroupCall ? <p className="mt-2 text-center text-sm text-white/60">{statusHint}</p> : null}

          <p className="mt-2 text-center text-xs font-medium uppercase tracking-wider text-purple-300/70">
            Voice call · no video
          </p>

          <p className="mt-8 font-mono text-3xl tabular-nums tracking-wide">{statusLabel}</p>

          {isCaller && (call.status === "ringing" || call.status === "accepted") ? (
            <div className="mt-6 w-full max-w-sm space-y-3">
              {acceptedCallees.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/80">Joined</p>
                  <ul className="space-y-2">
                    {acceptedCallees.map((p) => (
                      <li key={p.userId} className="flex items-center justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="text-emerald-300/90">In call</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ringingCallees.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Ringing</p>
                  <ul className="space-y-2">
                    {ringingCallees.map((p) => (
                      <li key={p.userId} className="flex items-center justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="capitalize text-white/60">{p.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
          {showMediaControls ? (
            <div className="flex items-center gap-8">
              <button
                type="button"
                className="flex flex-col items-center gap-2 text-white/70"
                onClick={() => {
                  toggleMute()
                  unlockRemotePlayback()
                }}
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
                onClick={() => {
                  setSpeakerOn((current) => !current)
                  unlockRemotePlayback()
                }}
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
          ) : showRejoinControls ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 p-0 shadow-lg hover:from-purple-700 hover:to-blue-700"
                disabled={ending || accepting}
                aria-label="Rejoin call"
                onClick={() => void handleAccept()}
              >
                {accepting ? <Loader2 className="h-7 w-7 animate-spin" /> : <Phone className="h-7 w-7" />}
              </Button>
              <span className="text-xs text-white/60">{isRejoinCallee ? "Rejoin call" : "Accept"}</span>
            </div>
          ) : !isRingingCallee || ringMode ? (
            ending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-white/80" />
                <span className="text-sm text-white/60">Returning to chat…</span>
              </div>
            ) : (
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
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
