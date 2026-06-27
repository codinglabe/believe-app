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
  unityCallChatUrl,
} from "@/lib/unityCall"
import { applyRemoteAudioOutput } from "@/lib/callAudioOutput"
import { resumeUnityCallRemotePlayback } from "@/lib/unityCallWebRTC"
import { useUnityCallSession } from "@/contexts/unity-call-session-context"
import { computeUnityCallMediaState, normalizeCallParticipants } from "@/lib/unityCallMediaState"
import { mergeCallParticipants } from "@/lib/unityCallParticipants"
import { dispatchUnityCallTerminated, dispatchUnityCallStatus, isUnityCallTerminated, peekUnityCallStatus, replayUnityCallStatus, subscribeUnityCallStatus } from "@/lib/unityCallEvents"
import type { UnityCallParticipantRow, UnityCallPayload, UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { refreshUnityCallStatusFromServer } from "@/lib/unityCall"
import { useUnityCallElapsed } from "@/hooks/useUnityCallElapsed"
import { useUnityCallRingTimeout } from "@/hooks/useUnityCallRingTimeout"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"
import { syncUnityCallServerClock } from "@/lib/unityCallTimer"

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
  const [ending, setEnding] = useState(false)
  const [accepting, setAccepting] = useState(false)

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

  const ringMode = useMemo(() => {
    if (typeof window === "undefined") {
      return false
    }
    return new URLSearchParams(window.location.search).get("ring") === "1"
  }, [])

  const activeCall = useMemo(() => {
    if (liveSession?.call.id !== call.id) {
      return call
    }

    return {
      ...call,
      ...liveSession.call,
      answeredAt: liveSession.call.answeredAt ?? call.answeredAt,
      ringExpiresAt: liveSession.call.ringExpiresAt ?? call.ringExpiresAt,
      endedAt: liveSession.call.endedAt ?? call.endedAt,
    }
  }, [call, liveSession])

  const activeParticipants = useMemo(() => {
    const merged =
      liveSession?.call.id !== call.id
        ? participants
        : mergeCallParticipants(participants, liveSession.participants)
    return normalizeCallParticipants(activeCall, merged)
  }, [activeCall, call.id, liveSession, participants])

  const selfStatus = useMemo(
    () => activeParticipants.find((p) => p.userId === authUserId)?.status ?? participantStatus,
    [activeParticipants, authUserId, participantStatus],
  )

  const { acceptedCallees, callLive, callConnected } = useMemo(
    () => computeUnityCallMediaState(activeCall, activeParticipants, authUserId, isCaller, selfStatus),
    [activeCall, activeParticipants, authUserId, isCaller, selfStatus],
  )

  const ringingCallees = useMemo(
    () => activeParticipants.filter((p) => p.role === "callee" && p.status === "ringing"),
    [activeParticipants],
  )

  const calleeIncomingVisible = useMemo(
    () =>
      ringingCallees.some((participant) => participant.incomingDelivered === true),
    [ringingCallees],
  )

  const { formatted: elapsedLabel, isRunning: callTimerRunning } = useUnityCallElapsed({
    callId: activeCall.id,
    answeredAt: activeCall.answeredAt,
    callStatus: activeCall.status,
  })

  const sessionRegisteredRef = useRef<number | null>(null)
  const calleeWasRingingRef = useRef(false)
  const callerServerSyncRef = useRef<number | null>(null)

  const isPendingIncomingCallee =
    !isCaller && selfStatus === "ringing" && activeCall.status === "ringing"

  useEffect(() => {
    if (isPendingIncomingCallee) {
      calleeWasRingingRef.current = true
      return
    }

    const calleeJustAccepted =
      !isCaller && calleeWasRingingRef.current && selfStatus === "accepted"
    if (calleeJustAccepted) {
      calleeWasRingingRef.current = false
    }

    const needsFullRegister =
      sessionRegisteredRef.current !== call.id ||
      calleeJustAccepted ||
      (isCaller &&
        liveSession?.call.id === call.id &&
        liveSession.call.status === "accepted" &&
        call.status === "ringing")

    if (!needsFullRegister) {
      return
    }

    sessionRegisteredRef.current = call.id
    registerSession({
      call: activeCall,
      caller,
      participants: activeParticipants,
      isCaller,
      isGroupCall,
      participantStatus: selfStatus,
      iceServers,
      authUserId,
    })
  }, [
    activeCall,
    activeParticipants,
    authUserId,
    call.id,
    caller,
    iceServers,
    isCaller,
    isGroupCall,
    isPendingIncomingCallee,
    liveSession?.call.id,
    liveSession?.call.status,
    registerSession,
    selfStatus,
  ])

  useEffect(() => {
    if (!liveSession || liveSession.call.id !== call.id) {
      return
    }

    const mergedParticipants = mergeCallParticipants(participants, liveSession.participants)
    const mergedCall = {
      ...call,
      ...liveSession.call,
      answeredAt: liveSession.call.answeredAt ?? call.answeredAt,
      ringExpiresAt: liveSession.call.ringExpiresAt ?? call.ringExpiresAt,
      endedAt: liveSession.call.endedAt ?? call.endedAt,
    }
    const participantsChanged = mergedParticipants.some((row) => {
      const localRow = participants.find((participant) => participant.userId === row.userId)
      return !localRow || localRow.status !== row.status || localRow.incomingDelivered !== row.incomingDelivered
    })

    if (
      mergedCall.status !== call.status ||
      mergedCall.answeredAt !== call.answeredAt ||
      participantsChanged
    ) {
      setCall(mergedCall)
      setParticipants(mergedParticipants)
    }
  }, [call, liveSession, participants])

  useEffect(() => {
    refreshEchoAuthHeaders()
  }, [])

  useEffect(() => {
    if (isCaller || selfStatus !== "ringing") {
      return
    }
    if (call.status !== "ringing" && call.status !== "accepted") {
      return
    }
    notifyCalleeIncomingDelivered(call.id, authUserId, caller.id)
  }, [authUserId, call.id, call.status, caller.id, isCaller, selfStatus])

  const leftParticipants = useMemo(
    () =>
      activeParticipants.filter((p) =>
        ["left", "declined", "missed"].includes(p.status),
      ),
    [activeParticipants],
  )

  const otherParty = useMemo(
    () => activeParticipants.find((p) => p.userId !== authUserId) ?? null,
    [activeParticipants, authUserId],
  )

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
      return activeCall.chatRoomName?.trim() || "Group call"
    }
    if (isCaller) {
      const callee = activeParticipants.find((p) => p.role === "callee")
      return callee?.name ?? caller.name
    }
    return caller.name
  }, [isGroupCall, isCaller, activeCall.chatRoomName, activeParticipants, caller.name])

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
      const callee = activeParticipants.find((p) => p.role === "callee")
      return callee?.avatar ?? caller.avatar
    }
    return caller.avatar
  }, [isGroupCall, isCaller, activeParticipants, caller.avatar])

  const isRingingCallee =
    !isCaller &&
    selfStatus === "ringing" &&
    (activeCall.status === "ringing" || activeCall.status === "accepted")

  const statusLabel = useMemo(() => {
    if (ending || isTerminalCallStatus) {
      return "Call ended"
    }
    if (isRingingCallee) {
      return "Incoming call"
    }
    if (callTimerRunning) {
      return elapsedLabel
    }
    if (isCaller) {
      const calleeJoined = acceptedCallees.length > 0 || activeCall.status === "accepted"
      if (calleeJoined) {
        return "Connecting…"
      }
      if (ringingCallees.length > 0 || activeCall.status === "ringing") {
        return calleeIncomingVisible ? "Ringing" : "Calling…"
      }
      return "Calling…"
    }
    if (callConnected) {
      return "Connecting…"
    }
    return "Connecting…"
  }, [
    ending,
    isTerminalCallStatus,
    isRingingCallee,
    callTimerRunning,
    elapsedLabel,
    isCaller,
    acceptedCallees.length,
    ringingCallees.length,
    calleeIncomingVisible,
    activeCall.status,
    callConnected,
  ])

  const statusHint = useMemo(() => {
    if (ending || isTerminalCallStatus) {
      return "Returning to chat…"
    }
    if (isRingingCallee) {
      return `${caller.name} is calling you`
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
    if (isCaller && (acceptedCallees.length > 0 || activeCall.status === "accepted")) {
      return mediaConnected ? "Connected" : `${Math.max(acceptedCallees.length, 1)} in call · ${connectionStatus}`
    }
    if (isCaller && calleeIncomingVisible) {
      return "Ringing on their device"
    }
    if (isCaller && activeCall.status === "ringing") {
      return "Calling…"
    }
    if (callConnected) {
      return connectionStatus
    }
    return "Setting up call…"
  }, [
    ending,
    isTerminalCallStatus,
    isRingingCallee,
    caller.name,
    callConnected,
    mediaConnected,
    isAudioEnabled,
    speakerOn,
    isCaller,
    activeCall.status,
    connectionStatus,
    permissionStatus,
    acceptedCallees.length,
    calleeIncomingVisible,
  ])

  const showMediaControls =
    !isRingingCallee &&
    Boolean(localStream) &&
    permissionStatus === "granted" &&
    !["ended", "cancelled", "declined", "missed"].includes(activeCall.status) &&
    (isCaller ? acceptedCallees.length > 0 || activeCall.status === "accepted" : callConnected)

  const unlockRemotePlayback = useCallback(() => {
    resumeUnityCallRemotePlayback()
    document.querySelectorAll('audio[data-unity-call-remote="1"]').forEach((node) => {
      const audio = node as HTMLAudioElement
      void applyRemoteAudioOutput(audio, speakerOn).finally(() => {
        void audio.play().catch(() => {})
      })
    })
  }, [speakerOn])

  useEffect(() => {
    if (!mediaConnected) {
      return
    }
    unlockRemotePlayback()
  }, [mediaConnected, remoteStreams, unlockRemotePlayback])

  const handleCallTerminated = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (payload.call.id !== call.id) {
        return
      }

      if (payload.serverNow) {
        syncUnityCallServerClock(payload.serverNow)
      }

      setCall((current) => ({
        ...current,
        ...payload.call,
        answeredAt: payload.call.answeredAt ?? current.answeredAt,
        ringExpiresAt: payload.call.ringExpiresAt ?? current.ringExpiresAt,
        endedAt: payload.call.endedAt ?? current.endedAt,
      }))
      setParticipants((previous) => mergeCallParticipants(previous, payload.participants))

      if (payload.reason === "accepted") {
        registerSession({
          call: payload.call,
          caller: payload.caller,
          participants: payload.participants,
          isCaller,
          isGroupCall,
          participantStatus:
            payload.participants.find((participant) => participant.userId === authUserId)?.status ??
            participantStatus,
          iceServers,
          authUserId,
        })
        updateSession({
          call: payload.call,
          participants: payload.participants,
        })
        dispatchUnityCallStatus(payload)
        unlockRemotePlayback()
        return
      }

      if (payload.reason === "callee_ringing") {
        dispatchUnityCallStatus(payload)
        return
      }

      if (payload.reason === "ringing") {
        dispatchUnityCallStatus(payload)
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
    [authUserId, call.id, exitCallScreen, iceServers, isCaller, isGroupCall, participantStatus, registerSession, unlockRemotePlayback, updateSession],
  )

  useEffect(() => {
    refreshEchoAuthHeaders()
    replayUnityCallStatus(call.id, handleCallTerminated)

    const cached = peekUnityCallStatus(call.id)
    if (cached?.reason === "accepted") {
      handleCallTerminated(cached)
      return
    }

    if (!isCaller || call.status !== "ringing" || callerServerSyncRef.current === call.id) {
      return
    }

    callerServerSyncRef.current = call.id
    void refreshUnityCallStatusFromServer(call.id).then((payload) => {
      if (payload) {
        handleCallTerminated(payload)
      }
    })
  }, [call.id, call.status, handleCallTerminated, isCaller])

  useEffect(() => {
    return subscribeUnityCallStatus((payload) => {
      if (payload.call.id !== call.id) {
        return
      }
      handleCallTerminated(payload)
    })
  }, [call.id, handleCallTerminated])

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
      syncUnityCallServerClock(data.serverNow)
      const nextCall = { ...data.call, joinUrl: data.join_url }
      const nextParticipants = data.participants
      setCall(nextCall)
      setParticipants(nextParticipants)
      registerSession({
        call: nextCall,
        caller: data.caller,
        participants: nextParticipants,
        isCaller: false,
        isGroupCall,
        participantStatus: "accepted",
        iceServers,
        authUserId,
      })
      dispatchUnityCallStatus({
        reason: "accepted",
        serverNow: data.serverNow,
        call: nextCall,
        caller: data.caller,
        participants: nextParticipants,
      })
      unlockRemotePlayback()
    } else if (ok) {
      const nextCall = { ...call, status: "accepted" as const }
      const nextParticipants = participants.map((p) =>
        p.userId === authUserId ? { ...p, status: "accepted" } : p,
      )
      setCall(nextCall)
      setParticipants(nextParticipants)
      registerSession({
        call: nextCall,
        caller,
        participants: nextParticipants,
        isCaller: false,
        isGroupCall,
        participantStatus: "accepted",
        iceServers,
        authUserId,
      })
      dispatchUnityCallStatus({
        reason: "accepted",
        call: nextCall,
        caller,
        participants: nextParticipants,
      })
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

  const showRingingCalleeControls = isRingingCallee
  const showRejoinControls = isRejoinCallee || canAnswerLate

  const callPhase = useMemo(() => {
    if (ending || isTerminalCallStatus) {
      return "ended" as const
    }
    if (isRingingCallee) {
      return "ringing" as const
    }
    if (callConnected && mediaConnected) {
      return "connected" as const
    }
    if (acceptedCallees.length > 0 || activeCall.status === "accepted") {
      return "connecting" as const
    }
    if (activeCall.status === "ringing") {
      return "ringing" as const
    }
    return "connecting" as const
  }, [
    acceptedCallees.length,
    activeCall.status,
    callConnected,
    ending,
    isRingingCallee,
    isTerminalCallStatus,
    mediaConnected,
    selfStatus,
  ])

  return (
    <>
      <Head title="Audio call" />

      <UnityCallScreen
        displayName={displayName}
        displayAvatar={displayAvatar}
        statusHint={statusHint}
        statusLabel={statusLabel}
        callPhase={callPhase}
        pulseAvatar={!ending && !isTerminalCallStatus && (!callLive || !mediaConnected) && !isRingingCallee}
        isGroupCall={isGroupCall}
        groupCallerLine={groupCallerLine}
        isCaller={isCaller}
        callStatus={activeCall.status}
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
        isRingingCallee={isRingingCallee}
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
          !isRingingCallee &&
          callConnected &&
          !mediaConnected &&
          permissionStatus !== "denied" &&
          remoteStreams.length === 0
        }
        connectionStatus={connectionStatus}
        acceptedCallees={acceptedCallees}
        leftParticipants={leftParticipants}
        showCallerParticipantLists={isCaller && isGroupCall && (activeCall.status === "ringing" || activeCall.status === "accepted")}
        otherParty={otherParty}
        mediaConnected={mediaConnected}
      />
    </>
  )
}
