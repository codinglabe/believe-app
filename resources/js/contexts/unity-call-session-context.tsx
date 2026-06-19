"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { router } from "@inertiajs/react"
import { echo } from "@laravel/echo-react"
import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { useUnityCallWebRTC } from "@/hooks/useUnityCallWebRTC"
import { UnityCallFloatingBar } from "@/components/call/UnityCallFloatingBar"
import { UnityCallRemoteAudio } from "@/components/call/UnityCallRemoteAudio"
import { computeUnityCallMediaState } from "@/lib/unityCallMediaState"
import { useUnityCallBackgroundKeepAlive } from "@/hooks/useUnityCallBackgroundKeepAlive"
import { useUnityCallAutoMinimize } from "@/hooks/useUnityCallAutoMinimize"
import { useUnityCallSessionRestore } from "@/hooks/useUnityCallSessionRestore"
import {
  clearUnityCallLiveOnPage,
  clearUnityCallSessionActive,
  clearUnityCallBackgroundState,
  isLeavingUnityCall,
  isOnUnityCallShowPage,
  isUnityCallEndedLocally,
  markLeavingUnityCall,
  markUnityCallBackgrounded,
  markUnityCallLiveOnPage,
  markUnityCallSessionActive,
  navigateAfterUnityCall,
  returnToUnityCall,
  setUnityCallProviderLiveCallId,
  terminateUnityCall,
} from "@/lib/unityCall"
import {
  dispatchUnityCallStatus,
  dispatchUnityCallTerminated,
  isUnityCallTerminated,
  subscribeUnityCallStatus,
  subscribeUnityCallTerminated,
} from "@/lib/unityCallEvents"
import { mergeCallParticipants, participantsSnapshotEqual } from "@/lib/unityCallParticipants"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

export type UnityCallSessionSnapshot = {
  call: UnityCallPayload
  caller: { id: number; name: string; avatar?: string | null }
  participants: UnityCallParticipantRow[]
  isCaller: boolean
  isGroupCall: boolean
  participantStatus?: string | null
  iceServers: RTCIceServer[]
  authUserId: number
}

type UnityCallSessionContextValue = {
  session: UnityCallSessionSnapshot | null
  registerSession: (snapshot: UnityCallSessionSnapshot) => void
  updateSession: (patch: Partial<UnityCallSessionSnapshot>) => void
  clearSession: (options?: { stopMedia?: boolean }) => void
  minimizeToChat: () => void
  endActiveCall: () => Promise<void>
  speakerOn: boolean
  setSpeakerOn: (value: boolean) => void
  localStream: MediaStream | null
  remoteStreams: { peerId: string; stream: MediaStream }[]
  mediaConnected: boolean
  isAudioEnabled: boolean
  permissionStatus: string
  connectionStatus: string
  toggleMute: () => void
  retryPermission: () => void
  stopMedia: () => void
}

const UnityCallSessionContext = createContext<UnityCallSessionContextValue | null>(null)

function normalizePath(url: string): string {
  return url.split("?")[0]?.split("#")[0] ?? "/"
}

function readAppPath(): string {
  if (typeof window === "undefined") {
    return "/"
  }
  return normalizePath(`${window.location.pathname}${window.location.search}`)
}

/** Works outside Inertia `<App>` — provider mounts beside App in app.tsx. */
function useLiveAppPath(): string {
  const [path, setPath] = useState(readAppPath)

  useEffect(() => {
    const refresh = () => setPath(readAppPath())
    refresh()
    return router.on("success", refresh)
  }, [])

  return path
}

export function UnityCallSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UnityCallSessionSnapshot | null>(null)
  const [speakerOn, setSpeakerOn] = useState(true)
  const [mediaEngaged, setMediaEngaged] = useState(false)
  const stopMediaRef = useRef<() => void>(() => {})
  const endActiveCallRef = useRef<() => Promise<void>>(async () => {})
  const appPath = useLiveAppPath()
  const onCallPage = useMemo(() => {
    return session ? isOnUnityCallShowPage(session.call.id) : false
  }, [appPath, session])

  const mediaState = useMemo(() => {
    if (!session) {
      return null
    }
    return computeUnityCallMediaState(
      session.call,
      session.participants,
      session.authUserId,
      session.isCaller,
      session.participantStatus,
    )
  }, [session])

  const mediaActiveForWebRtc = Boolean(session && (mediaState?.mediaActive || mediaEngaged))

  const applyUnityCallStatus = useCallback((payload: UnityCallStatusEvent) => {
    setSession((previous) => {
      if (!previous || payload.call.id !== previous.call.id) {
        return previous
      }

      return {
        ...previous,
        call: { ...previous.call, ...payload.call },
        participants: mergeCallParticipants(previous.participants, payload.participants),
      }
    })
  }, [])

  const handleSessionStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (payload.reason === "incoming") {
        return
      }

      applyUnityCallStatus(payload)
    },
    [applyUnityCallStatus],
  )

  const webrtc = useUnityCallWebRTC({
    callId: session?.call.id ?? 0,
    userId: session?.authUserId ?? 0,
    isCaller: session?.isCaller ?? false,
    isGroupCall: session?.isGroupCall ?? false,
    callerId: session?.caller.id ?? 0,
    callStatus: mediaState?.callLive ? "accepted" : session?.call.status ?? "ended",
    participants: session?.participants ?? [],
    mediaActive: mediaActiveForWebRtc,
    iceServers: session?.iceServers ?? [],
    keepAlive: true,
    onSessionStatus: handleSessionStatus,
  })

  stopMediaRef.current = webrtc.stopMedia
  const resyncCallRef = useRef(webrtc.resyncCall)
  resyncCallRef.current = webrtc.resyncCall

  useEffect(() => {
    if (webrtc.mediaConnected || webrtc.localStream) {
      setMediaEngaged(true)
    }
  }, [webrtc.localStream, webrtc.mediaConnected])

  useEffect(() => {
    if (!session) {
      setMediaEngaged(false)
    }
  }, [session?.call.id])

  useEffect(() => {
    if (session) {
      return
    }

    setUnityCallProviderLiveCallId(null)

    if (typeof sessionStorage === "undefined") {
      return
    }

    try {
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index)
        if (!key?.startsWith("unity_call_live_")) {
          continue
        }

        const callId = Number(key.replace("unity_call_live_", ""))
        if (!Number.isFinite(callId) || callId <= 0) {
          continue
        }

        if (isUnityCallEndedLocally(callId) || isLeavingUnityCall(callId)) {
          clearUnityCallBackgroundState(callId)
        }
      }
    } catch {
      // ignore
    }
  }, [session])

  useEffect(() => {
    if (session && mediaState?.canBackgroundCall) {
      setUnityCallProviderLiveCallId(session.call.id)
      return
    }

    if (!session) {
      setUnityCallProviderLiveCallId(null)
    }
  }, [mediaState?.canBackgroundCall, session])

  const registerSession = useCallback((snapshot: UnityCallSessionSnapshot) => {
    setSession((previous) => {
      if (previous && previous.call.id !== snapshot.call.id) {
        stopMediaRef.current()
      }
      if (previous?.call.id === snapshot.call.id) {
        return {
          ...previous,
          ...snapshot,
          call: { ...previous.call, ...snapshot.call },
          participants: mergeCallParticipants(previous.participants, snapshot.participants),
        }
      }
      return snapshot
    })
  }, [])

  const updateSession = useCallback((patch: Partial<UnityCallSessionSnapshot>) => {
    setSession((previous) => {
      if (!previous) {
        return previous
      }

      const nextCall = patch.call ? { ...previous.call, ...patch.call } : previous.call
      const nextParticipants = patch.participants
        ? mergeCallParticipants(previous.participants, patch.participants)
        : previous.participants
      const nextParticipantStatus =
        patch.participantStatus !== undefined ? patch.participantStatus : previous.participantStatus

      const callUnchanged =
        !patch.call ||
        (nextCall.status === previous.call.status &&
          nextCall.answeredAt === previous.call.answeredAt &&
          nextCall.ringExpiresAt === previous.call.ringExpiresAt &&
          nextCall.endedAt === previous.call.endedAt)
      const participantsUnchanged =
        !patch.participants || participantsSnapshotEqual(nextParticipants, previous.participants)
      const participantStatusUnchanged = patch.participantStatus === undefined

      if (callUnchanged && participantsUnchanged && participantStatusUnchanged) {
        return previous
      }

      return {
        ...previous,
        ...patch,
        call: nextCall,
        participants: nextParticipants,
        participantStatus: nextParticipantStatus,
      }
    })
  }, [])

  const clearSession = useCallback((options?: { stopMedia?: boolean }) => {
    if (options?.stopMedia !== false) {
      stopMediaRef.current()
    }
    setSession((previous) => {
      if (previous) {
        clearUnityCallBackgroundState(previous.call.id)
      }
      return null
    })
  }, [])

  const minimizeToChat = useCallback(() => {
    if (!session?.call.chatRoomId) {
      return
    }
    router.visit(`${route("chat.index")}?room=${session.call.chatRoomId}`, {
      preserveScroll: true,
    })
  }, [session?.call.chatRoomId])

  const endActiveCall = useCallback(async () => {
    if (!session) {
      return
    }

    const { call, caller, participants, isCaller, authUserId } = session
    const selfStatus =
      participants.find((participant) => participant.userId === authUserId)?.status ?? session.participantStatus ?? null
    const wasRinging = call.status === "ringing"
    const finalStatus =
      isCaller && wasRinging ? "cancelled" : !isCaller && wasRinging ? "declined" : "ended"

    dispatchUnityCallTerminated({
      reason: wasRinging ? "cancelled" : "ended",
      call: { ...call, status: finalStatus },
      caller,
      participants,
    })

    markLeavingUnityCall(call.id)
    clearSession()

    await terminateUnityCall({
      callId: call.id,
      isCaller,
      callStatus: call.status,
      selfStatus,
    })

    navigateAfterUnityCall(call.id, call.chatRoomId)
  }, [clearSession, session])

  endActiveCallRef.current = endActiveCall

  useEffect(() => {
    if (!session) {
      return
    }

    const callId = session.call.id
    const authUserId = session.authUserId
    const isCaller = session.isCaller

    return subscribeUnityCallStatus((payload) => {
      if (payload.call.id !== callId) {
        return
      }

      if (payload.reason === "incoming") {
        return
      }

      setSession((previous) => {
        if (!previous || previous.call.id !== callId) {
          return previous
        }

        const nextCall = { ...previous.call, ...payload.call }
        const nextParticipants = mergeCallParticipants(previous.participants, payload.participants)
        if (
          nextCall.status === previous.call.status &&
          nextCall.answeredAt === previous.call.answeredAt &&
          participantsSnapshotEqual(nextParticipants, previous.participants)
        ) {
          return previous
        }

        return {
          ...previous,
          call: nextCall,
          participants: nextParticipants,
        }
      })

      if (payload.reason === "accepted" || payload.reason === "participant_left") {
        resyncCallRef.current()
      }

      if (payload.reason === "participant_left" || payload.reason === "participant_declined") {
        const self = payload.participants.find((participant) => participant.userId === authUserId)
        if (self?.status === "left" || self?.status === "declined") {
          void endActiveCallRef.current()
        }
        return
      }

      if (payload.reason === "participant_missed") {
        const self = payload.participants.find((participant) => participant.userId === authUserId)
        if (!isCaller && self?.status === "missed") {
          void endActiveCallRef.current()
        }
        return
      }

      if (isUnityCallTerminated(payload) && !isLeavingUnityCall(payload.call.id)) {
        dispatchUnityCallTerminated(payload)
      }
    })
  }, [session?.call.id, session?.authUserId, session?.isCaller])

  useEffect(() => {
    if (!session || onCallPage) {
      return
    }

    if (mediaState?.canBackgroundCall) {
      markUnityCallBackgrounded(session.call.id)
    }

    refreshEchoAuthHeaders()
    webrtc.resyncCall()
  }, [appPath, onCallPage, session, mediaState?.canBackgroundCall, webrtc.resyncCall])

  useUnityCallAutoMinimize({
    session,
    canBackgroundCall: Boolean(mediaState?.canBackgroundCall),
    onBackgrounded: webrtc.resyncCall,
  })

  useUnityCallSessionRestore({
    session,
    registerSession,
  })

  useEffect(() => {
    if (!session || !mediaState?.callLive || !mediaState.callConnected) {
      return
    }

    markUnityCallSessionActive(session.call.id)
    markUnityCallLiveOnPage(session.call.id)
  }, [mediaState?.callConnected, mediaState?.callLive, session])

  useEffect(() => {
    const activeCallId = session?.call.id
    const authUserId = session?.authUserId
    const chatRoomId = session?.call.chatRoomId

    if (!activeCallId || !authUserId) {
      return
    }

    refreshEchoAuthHeaders()

    const onRealtimeStatus = (payload: UnityCallStatusEvent) => {
      if (payload.call.id !== activeCallId || payload.reason === "incoming") {
        return
      }

      applyUnityCallStatus(payload)
      dispatchUnityCallStatus(payload)

      if (payload.reason === "accepted" || payload.reason === "participant_left") {
        resyncCallRef.current()
      }
    }

    const instance = echo()
    const userChannel = instance.private(`user.${authUserId}`)
    const callChannel = instance.private(`unity-call.${activeCallId}`)

    userChannel.listen(".call.status", onRealtimeStatus)
    callChannel.listen(".call.session.status", onRealtimeStatus)

    const roomChannel =
      chatRoomId && !session?.isGroupCall ? instance.private(`direct-chat.${chatRoomId}`) : null
    roomChannel?.listen(".call.status", onRealtimeStatus)

    return () => {
      userChannel.stopListening(".call.status")
      callChannel.stopListening(".call.session.status")
      roomChannel?.stopListening(".call.status")
    }
  }, [applyUnityCallStatus, session?.authUserId, session?.call.chatRoomId, session?.call.id, session?.isGroupCall])

  useEffect(() => {
    if (!session) {
      return
    }

    return subscribeUnityCallTerminated((payload) => {
      if (payload.call.id !== session.call.id || !isUnityCallTerminated(payload)) {
        return
      }

      clearUnityCallSessionActive(session.call.id)
      clearUnityCallLiveOnPage(session.call.id)
      clearSession()
    })
  }, [clearSession, session])

  const showFloatingBar = Boolean(session && mediaState?.canBackgroundCall && !onCallPage)

  const mergedRemoteStream = useMemo(() => {
    const merged = new MediaStream()
    webrtc.remoteStreams.forEach(({ stream }) => {
      stream.getAudioTracks().forEach((track) => {
        if (!merged.getTracks().some((item) => item.id === track.id)) {
          merged.addTrack(track)
        }
      })
    })
    return merged
  }, [webrtc.remoteStreams])

  const callBackgroundTitle = useMemo(() => {
    if (!session) {
      return "Voice call"
    }
    if (session.isGroupCall) {
      return session.call.chatRoomName?.trim() || "Group call"
    }
    if (session.isCaller) {
      const callee = session.participants.find((participant) => participant.role === "callee")
      return callee?.name ?? session.caller.name
    }
    return session.caller.name
  }, [session])

  const keepBackgroundAudioAlive = Boolean(
    session &&
      !onCallPage &&
      mediaState?.callLive &&
      mediaState.callConnected &&
      (webrtc.mediaConnected || mediaEngaged || mergedRemoteStream.getAudioTracks().length > 0),
  )

  useUnityCallBackgroundKeepAlive({
    enabled: keepBackgroundAudioAlive,
    title: callBackgroundTitle,
    subtitle: "Believe In Unity · Voice call",
    localStream: webrtc.localStream,
    remoteStream: mergedRemoteStream,
    speakerOn,
    preferWebAudioRemote: true,
    onHangUp: () => {
      void endActiveCall()
    },
    onResume: webrtc.resyncCall,
  })

  const showRemoteAudio =
    onCallPage &&
    Boolean(session && mediaState?.callLive && mediaState.callConnected) &&
    (mergedRemoteStream.getAudioTracks().length > 0 || webrtc.mediaConnected || mediaEngaged)

  const value = useMemo<UnityCallSessionContextValue>(
    () => ({
      session,
      registerSession,
      updateSession,
      clearSession,
      minimizeToChat,
      endActiveCall,
      speakerOn,
      setSpeakerOn,
      localStream: webrtc.localStream,
      remoteStreams: webrtc.remoteStreams,
      mediaConnected: webrtc.mediaConnected,
      isAudioEnabled: webrtc.isAudioEnabled,
      permissionStatus: webrtc.permissionStatus,
      connectionStatus: webrtc.connectionStatus,
      toggleMute: webrtc.toggleMute,
      retryPermission: webrtc.retryPermission,
      stopMedia: webrtc.stopMedia,
    }),
    [
      session,
      registerSession,
      updateSession,
      clearSession,
      minimizeToChat,
      endActiveCall,
      speakerOn,
      webrtc.localStream,
      webrtc.remoteStreams,
      webrtc.mediaConnected,
      webrtc.isAudioEnabled,
      webrtc.permissionStatus,
      webrtc.connectionStatus,
      webrtc.toggleMute,
      webrtc.retryPermission,
      webrtc.stopMedia,
    ],
  )

  return (
    <UnityCallSessionContext.Provider value={value}>
      {showRemoteAudio
        ? webrtc.remoteStreams.map(({ peerId, stream }) => (
            <UnityCallRemoteAudio key={peerId} stream={stream} speakerOn={speakerOn} />
          ))
        : null}
      {children}
      {showFloatingBar && session ? (
        <UnityCallFloatingBar
          session={session}
          callConnected={Boolean(mediaState?.callConnected)}
          mediaConnected={webrtc.mediaConnected}
          isAudioEnabled={webrtc.isAudioEnabled}
          speakerOn={speakerOn}
          onToggleMute={webrtc.toggleMute}
          onToggleSpeaker={() => setSpeakerOn((current) => !current)}
          onReturn={() => returnToUnityCall(session.call.id)}
          onEnd={() => void endActiveCall()}
        />
      ) : null}
    </UnityCallSessionContext.Provider>
  )
}

export function useUnityCallSession(): UnityCallSessionContextValue {
  const context = useContext(UnityCallSessionContext)
  if (!context) {
    throw new Error("useUnityCallSession must be used within UnityCallSessionProvider")
  }
  return context
}

export function useUnityCallSessionOptional(): UnityCallSessionContextValue | null {
  return useContext(UnityCallSessionContext)
}
