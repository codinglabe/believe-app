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
import type { UnityCallParticipantRow, UnityCallPayload } from "@/hooks/useUnityCallNotifications"
import { useUnityCallWebRTC } from "@/hooks/useUnityCallWebRTC"
import { UnityCallFloatingBar } from "@/components/call/UnityCallFloatingBar"
import { UnityCallRemoteAudio } from "@/components/call/UnityCallRemoteAudio"
import { computeUnityCallMediaState } from "@/lib/unityCallMediaState"
import { useUnityCallBackgroundKeepAlive } from "@/hooks/useUnityCallBackgroundKeepAlive"
import {
  clearUnityCallLiveOnPage,
  clearUnityCallSessionActive,
  getActiveUnityCallIdFromPage,
  markLeavingUnityCall,
  markUnityCallLiveOnPage,
  markUnityCallSessionActive,
  navigateAfterUnityCall,
  returnToUnityCall,
  terminateUnityCall,
  unityCallShowPath,
} from "@/lib/unityCall"
import {
  dispatchUnityCallTerminated,
  isUnityCallTerminated,
  subscribeUnityCallTerminated,
} from "@/lib/unityCallEvents"

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
  const stopMediaRef = useRef<() => void>(() => {})
  const appPath = useLiveAppPath()
  const onCallPage = useMemo(() => {
    return session ? appPath === unityCallShowPath(session.call.id) : false
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

  const webrtc = useUnityCallWebRTC({
    callId: session?.call.id ?? 0,
    userId: session?.authUserId ?? 0,
    isCaller: session?.isCaller ?? false,
    isGroupCall: session?.isGroupCall ?? false,
    callerId: session?.caller.id ?? 0,
    callStatus: mediaState?.callLive ? "accepted" : session?.call.status ?? "ended",
    participants: session?.participants ?? [],
    mediaActive: Boolean(session && mediaState?.mediaActive),
    iceServers: session?.iceServers ?? [],
    keepAlive: true,
  })

  stopMediaRef.current = webrtc.stopMedia

  const registerSession = useCallback((snapshot: UnityCallSessionSnapshot) => {
    setSession((previous) => {
      if (previous && previous.call.id !== snapshot.call.id) {
        stopMediaRef.current()
      }
      return previous?.call.id === snapshot.call.id ? { ...previous, ...snapshot } : snapshot
    })
  }, [])

  const updateSession = useCallback((patch: Partial<UnityCallSessionSnapshot>) => {
    setSession((previous) => (previous ? { ...previous, ...patch } : previous))
  }, [])

  const clearSession = useCallback((options?: { stopMedia?: boolean }) => {
    if (options?.stopMedia !== false) {
      stopMediaRef.current()
    }
    setSession(null)
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

  useEffect(() => {
    if (!session || !mediaState?.callLive || !mediaState.callConnected) {
      return
    }

    markUnityCallSessionActive(session.call.id)
    markUnityCallLiveOnPage(session.call.id)
  }, [mediaState?.callConnected, mediaState?.callLive, session])

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

  const showFloatingBar =
    Boolean(session && mediaState?.callLive && mediaState.callConnected) &&
    !onCallPage &&
    getActiveUnityCallIdFromPage() !== session?.call.id

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
    session && mediaState?.callLive && mediaState.callConnected && webrtc.mediaConnected,
  )

  useUnityCallBackgroundKeepAlive({
    enabled: keepBackgroundAudioAlive,
    title: callBackgroundTitle,
    subtitle: "Believe In Unity · Voice call",
    onHangUp: () => {
      void endActiveCall()
    },
  })

  const showRemoteAudio =
    keepBackgroundAudioAlive && mergedRemoteStream.getAudioTracks().length > 0

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
      {showRemoteAudio ? <UnityCallRemoteAudio stream={mergedRemoteStream} speakerOn={speakerOn} /> : null}
      {children}
      {showFloatingBar && session ? (
        <UnityCallFloatingBar
          session={session}
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
