"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Head } from "@inertiajs/react"
import toast from "react-hot-toast"
import { UnityCallScreen } from "@/components/call/UnityCallScreen"
import {
  acceptUnityCall,
  isLeavingUnityCall,
  isUnityCallEndedLocally,
  clearUnityCallLiveOnPage,
  clearUnityCallSessionActive,
  navigateAfterUnityCall,
  notifyCalleeIncomingDelivered,
  terminateUnityCall,
  unityCallChatChannelName,
  unityCallChatUrl,
} from "@/lib/unityCall"
import { applyRemoteAudioOutput } from "@/lib/callAudioOutput"
import { useUnityCallSession } from "@/contexts/unity-call-session-context"
import { computeUnityCallMediaState } from "@/lib/unityCallMediaState"
import { mergeCallParticipants } from "@/lib/unityCallParticipants"
import { dispatchUnityCallTerminated, isUnityCallTerminated, subscribeUnityCallStatus } from "@/lib/unityCallEvents"
import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { useEcho } from "@laravel/echo-react"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { useUnityCallRingTimeout } from "@/hooks/useUnityCallRingTimeout"
import { useStableCallback } from "@/hooks/useStableCallback"
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
  const onStatusStable = useStableCallback(onStatus)

  useEcho<UnityCallStatusEvent>(
    channelName,
    ".call.status",
    onStatusStable,
    [channelName, visibility],
    visibility,
  )
  return null
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
  const [connectedAt, setConnectedAt] = useState<number | null>(null)

  const {
    session: liveSession,
    registerSession,
    updateSession,
    clearSession,
    minimizeToChat,
    speakerOn,
    setSpeakerOn,
    localStream,
    remoteStreams,
    mediaConnected,
    isAudioEnabled,
    permissionStatus,
    connectionStatus,
    toggleMute,
    retryPermission,
  } = useUnityCallSession()

  useEffect(() => {
    registerSession({
      call,
      caller,
      participants,
      isCaller,
      isGroupCall,
      participantStatus,
      iceServers,
      authUserId,
    })
  }, [authUserId, call.id, caller, iceServers, isCaller, isGroupCall, registerSession])

  useEffect(() => {
    updateSession({ call, participants, participantStatus })
  }, [call, participants, participantStatus, updateSession])

  useEffect(() => {
    if (!liveSession || liveSession.call.id !== call.id) {
      return
    }

    const sessionAccepted = liveSession.participants.some(
      (participant) => participant.role === "callee" && participant.status === "accepted",
    )
    const localAccepted = participants.some(
      (participant) => participant.role === "callee" && participant.status === "accepted",
    )

    if (liveSession.call.status !== call.status || (sessionAccepted && !localAccepted)) {
      setCall((current) => ({ ...current, ...liveSession.call }))
      setParticipants(liveSession.participants)
    }
  }, [call.id, call.status, liveSession, participants])

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

  const { acceptedCallees, callLive, callConnected } = useMemo(
    () => computeUnityCallMediaState(call, participants, authUserId, isCaller, participantStatus),
    [call, participants, authUserId, isCaller, participantStatus],
  )

  const ringingCallees = useMemo(
    () => participants.filter((p) => p.role === "callee" && p.status === "ringing"),
    [participants],
  )

  const calleeIncomingVisible = useMemo(
    () =>
      ringingCallees.some((participant) => participant.incomingDelivered === true),
    [ringingCallees],
  )

  useEffect(() => {
    if (isCaller || selfStatus !== "ringing") {
      return
    }
    if (call.status !== "ringing" && call.status !== "accepted") {
      return
    }
    notifyCalleeIncomingDelivered(call.id)
  }, [call.id, call.status, isCaller, selfStatus])

  const leftParticipants = useMemo(
    () =>
      participants.filter((p) =>
        ["left", "declined", "missed"].includes(p.status),
      ),
    [participants],
  )

  const otherParty = useMemo(
    () => participants.find((p) => p.userId !== authUserId) ?? null,
    [participants, authUserId],
  )

  const callTimerAnchor = useMemo(() => {
    if (call.answeredAt) {
      return new Date(call.answeredAt).getTime()
    }
    if (connectedAt) {
      return connectedAt
    }
    return null
  }, [call.answeredAt, connectedAt])

  useEffect(() => {
    if (mediaConnected && connectedAt === null) {
      setConnectedAt(Date.now())
    }
    if (!mediaConnected && !callLive) {
      setConnectedAt(null)
    }
  }, [mediaConnected, connectedAt, callLive])

  const isTerminalCallStatus = useMemo(
    () => ["ended", "cancelled", "declined", "missed"].includes(call.status),
    [call.status],
  )

  const callEndedLocally = isUnityCallEndedLocally(call.id)

  useEffect(() => {
    if (!callEndedLocally && !isTerminalCallStatus) {
      return
    }

    clearSession()
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/unity-call/")) {
      window.location.replace(unityCallChatUrl(call.chatRoomId))
    }
  }, [call.chatRoomId, callEndedLocally, clearSession, isTerminalCallStatus])

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !isUnityCallEndedLocally(call.id)) {
        return
      }

      clearSession()
      window.location.replace(unityCallChatUrl(call.chatRoomId))
    }

    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [call.chatRoomId, call.id, clearSession])

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
      clearSession()
      navigateAfterUnityCall(call.id, call.chatRoomId, {
        onFinish: () => {
          exitNavigationStarted.current = false
          setEnding(false)
        },
      })
    },
    [call.chatRoomId, call.id, clearSession],
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
    if (callTimerAnchor !== null) {
      return formatElapsed(elapsed)
    }
    if (isCaller) {
      if (acceptedCallees.length > 0) {
        const ringing = ringingCallees.length
        return ringing > 0 ? `${acceptedCallees.length} joined · ${ringing} ringing` : `${acceptedCallees.length} joined`
      }
      if (ringingCallees.length > 0 || call.status === "ringing") {
        return calleeIncomingVisible ? "Ringing" : "Calling…"
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
    callTimerAnchor,
    isCaller,
    acceptedCallees.length,
    ringingCallees.length,
    calleeIncomingVisible,
    call.status,
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
    if (isCaller && calleeIncomingVisible) {
      return "Ringing on their device"
    }
    if (isCaller && call.status === "ringing") {
      return "Calling…"
    }
    if (callConnected) {
      return connectionStatus
    }
    return "Setting up call…"
  }, [ending, isTerminalCallStatus, callConnected, mediaConnected, isAudioEnabled, speakerOn, isCaller, call.status, connectionStatus, permissionStatus, acceptedCallees.length, calleeIncomingVisible])

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

      setCall((current) => ({ ...current, ...payload.call }))
      setParticipants((previous) => mergeCallParticipants(previous, payload.participants))

      if (payload.reason === "accepted") {
        unlockRemotePlayback()
        if (payload.call.answeredAt) {
          setCall((current) => ({ ...current, answeredAt: payload.call.answeredAt }))
        }
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

  const onStatus = useStableCallback(handleCallTerminated)

  useEcho<UnityCallStatusEvent>(`user.${authUserId}`, ".call.status", onStatus, [authUserId], "private")

  useEffect(() => {
    return subscribeUnityCallStatus((payload) => {
      if (payload.call.id !== call.id) {
        return
      }
      handleCallTerminated(payload)
    })
  }, [call.id, handleCallTerminated])

  useEcho<UnityCallStatusEvent>(
    `unity-call.${call.id}`,
    ".call.session.status",
    onStatus,
    [call.id],
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
    if (ending || isLeavingUnityCall(call.id) || isTerminalCallStatus) {
      clearUnityCallSessionActive(call.id)
      clearUnityCallLiveOnPage(call.id)
    }
  }, [call.id, ending, isTerminalCallStatus])

  useEffect(() => {
    if (callTimerAnchor === null) {
      return
    }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - callTimerAnchor) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [callTimerAnchor])

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

  const callPhase = useMemo(() => {
    if (ending || isTerminalCallStatus) {
      return "ended" as const
    }
    if (callConnected && mediaConnected) {
      return "connected" as const
    }
    if (
      acceptedCallees.length > 0 ||
      call.status === "accepted" ||
      selfStatus === "accepted"
    ) {
      return "connecting" as const
    }
    if (call.status === "ringing") {
      return "ringing" as const
    }
    return "connecting" as const
  }, [
    acceptedCallees.length,
    call.status,
    callConnected,
    ending,
    isTerminalCallStatus,
    mediaConnected,
    selfStatus,
  ])

  return (
    <>
      <Head title="Audio call" />

      {chatChannelName ? (
        <UnityCallChatStatusEcho
          channelName={chatChannelName}
          visibility={chatChannelVisibility}
          onStatus={handleCallTerminated}
        />
      ) : null}

      <UnityCallScreen
        displayName={displayName}
        displayAvatar={displayAvatar}
        statusHint={statusHint}
        statusLabel={statusLabel}
        callPhase={callPhase}
        pulseAvatar={!ending && !isTerminalCallStatus && (!callLive || !mediaConnected)}
        isGroupCall={isGroupCall}
        groupCallerLine={groupCallerLine}
        isCaller={isCaller}
        callStatus={call.status}
        showMinimize={Boolean(callLive && callConnected && !ending)}
        onMinimize={() => minimizeToChat()}
        showMediaControls={showMediaControls}
        isAudioEnabled={isAudioEnabled}
        speakerOn={speakerOn}
        onToggleMute={() => {
          toggleMute()
          unlockRemotePlayback()
        }}
        onToggleSpeaker={() => {
          setSpeakerOn((current) => !current)
          unlockRemotePlayback()
        }}
        showRingingCalleeControls={showRingingCalleeControls}
        showRejoinControls={showRejoinControls}
        isRejoinCallee={isRejoinCallee}
        ringMode={ringMode}
        ending={ending}
        accepting={accepting}
        onAccept={() => void handleAccept()}
        onEnd={() => void handleEnd()}
        permissionDenied={callConnected && !mediaConnected && permissionStatus === "denied"}
        onRetryPermission={() => retryPermission()}
        showConnectingSpinner={
          callConnected && !mediaConnected && permissionStatus !== "denied" && remoteStreams.length === 0
        }
        connectionStatus={connectionStatus}
        acceptedCallees={acceptedCallees}
        leftParticipants={leftParticipants}
        showCallerParticipantLists={isCaller && (call.status === "ringing" || call.status === "accepted")}
        otherParty={otherParty}
        mediaConnected={mediaConnected}
      />
    </>
  )
}
