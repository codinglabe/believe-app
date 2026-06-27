"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { router } from "@inertiajs/react"
import { echo } from "@laravel/echo-react"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"
import type { UnityCallParticipantRow, UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { subscribeUnityCallTerminated } from "@/lib/unityCallEvents"
import { mergeCallParticipants } from "@/lib/unityCallParticipants"
import { invalidateAudioOutputCache } from "@/lib/callAudioOutput"
import { normalizeSessionDescription, normalizeWebRtcSignal, webRtcSignalKey, buildUnityCallRtcConfiguration, ensurePeerAudioTransceiver, isPeerConnectionUsable, isPeerNegotiationSettled, peerHasCompletedNegotiation, resumeUnityCallRemotePlayback } from "@/lib/unityCallWebRTC"

export type UnityCallRemoteStream = {
  peerId: string
  stream: MediaStream
}

export type UnityCallMediaPermission = "idle" | "prompt" | "granted" | "denied" | "unsupported"

type WebRTCSignal = {
  type: "offer" | "answer" | "ice-candidate" | "offer-request"
  from: string
  to: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

type ChannelWithListen = {
  listen: (event: string, callback: (payload: WebRTCSignal | UnityCallStatusPayload) => void) => ChannelWithListen
  subscribed: (callback: () => void) => ChannelWithListen
  error: (callback: (error: unknown) => void) => ChannelWithListen
  stopListening?: (event: string) => void
}

type UnityCallStatusPayload = UnityCallStatusEvent

const MAX_GROUP_HOST_PEERS = 32

type UseUnityCallWebRTCOptions = {
  callId: number
  userId: number
  isCaller: boolean
  isGroupCall: boolean
  callerId: number
  callStatus: string
  participants: UnityCallParticipantRow[]
  mediaActive: boolean
  iceServers: RTCIceServer[]
  /** Keep WebRTC alive when the call UI unmounts (background / minimized call). */
  keepAlive?: boolean
  /** Real-time participant updates from the call session channel. */
  onSessionStatus?: (payload: UnityCallStatusEvent) => void
}

function buildRtcConfiguration(iceServers: RTCIceServer[]): RTCConfiguration {
  return buildUnityCallRtcConfiguration(iceServers)
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

function isPeerConnected(pc: RTCPeerConnection): boolean {
  const ice = pc.iceConnectionState
  const conn = pc.connectionState
  return (
    ice === "connected" ||
    ice === "completed" ||
    conn === "connected"
  )
}

function isPeerNegotiating(pc: RTCPeerConnection): boolean {
  const ice = pc.iceConnectionState
  return ice === "checking" || ice === "new"
}

function hasLiveAudioTrack(stream: MediaStream | undefined): boolean {
  return stream?.getAudioTracks().some((track) => track.readyState === "live") ?? false
}

function hasReceivingAudio(pc: RTCPeerConnection): boolean {
  return pc.getReceivers().some((receiver) => receiver.track?.kind === "audio" && receiver.track.readyState === "live")
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const finish = () => {
      pc.removeEventListener("icegatheringstatechange", onChange)
      clearTimeout(timer)
      resolve()
    }
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        finish()
      }
    }
    pc.addEventListener("icegatheringstatechange", onChange)
    const timer = window.setTimeout(finish, timeoutMs)
  })
}

function hasAudioSender(pc: RTCPeerConnection): boolean {
  return pc.getSenders().some((sender) => sender.track?.kind === "audio")
}

function localMicNeedsRevive(track: MediaStreamTrack | undefined): boolean {
  if (!track) {
    return true
  }

  return track.readyState === "ended"
}

export function useUnityCallWebRTC({
  callId,
  userId,
  isCaller,
  isGroupCall,
  callerId,
  callStatus,
  participants,
  mediaActive,
  iceServers,
  keepAlive = false,
  onSessionStatus,
}: UseUnityCallWebRTCOptions) {
  const userIdStr = String(userId)
  const participantsRef = useRef(participants)
  const onSessionStatusRef = useRef(onSessionStatus)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<UnityCallRemoteStream[]>([])
  const [mediaConnected, setMediaConnected] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<UnityCallMediaPermission>("idle")
  const [connectionStatus, setConnectionStatus] = useState("idle")

  useEffect(() => {
    isAudioEnabledRef.current = isAudioEnabled
  }, [isAudioEnabled])

  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamsRef = useRef<UnityCallRemoteStream[]>([])
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const channelReady = useRef(false)
  const callEnded = useRef(false)
  const mediaStarted = useRef(false)
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const pendingSignals = useRef<WebRTCSignal[]>([])
  const makingOffer = useRef<Map<string, boolean>>(new Map())
  const ignoreOffer = useRef<Map<string, boolean>>(new Map())
  const rtcConfiguration = useRef(buildRtcConfiguration(iceServers))
  const outboundTracksRef = useRef<Map<string, MediaStreamTrack>>(new Map())
  const processedSignals = useRef<Set<string>>(new Set())
  const offerRequestSentFor = useRef<Set<string>>(new Set())
  const handleSignalChain = useRef<Promise<void>>(Promise.resolve())
  const handleSignalRef = useRef<(signal: WebRTCSignal) => Promise<void>>(async () => {})
  const micMonitorCleanupRef = useRef<(() => void) | null>(null)
  const reviveMicInFlightRef = useRef(false)
  const isAudioEnabledRef = useRef(true)
  const reviveLocalMicrophoneRef = useRef<() => Promise<void>>(async () => {})
  const signalSendChain = useRef<Promise<void>>(Promise.resolve())
  const iceCandidateQueues = useRef<Map<string, WebRTCSignal[]>>(new Map())
  const iceFlushTimers = useRef<Map<string, number>>(new Map())
  const signalBackoffUntil = useRef(0)
  const lastOfferRequestAt = useRef<Map<string, number>>(new Map())
  const mediaConnectedRef = useRef(false)
  const attachAudioChain = useRef<Map<string, Promise<boolean>>>(new Map())
  const hostOfferChain = useRef<Map<string, Promise<void>>>(new Map())

  const ICE_FLUSH_MS = 250
  const MAX_ICE_PER_FLUSH = 3
  const SIGNAL_MIN_GAP_MS = 60
  const OFFER_REQUEST_COOLDOWN_MS = 4000

  useEffect(() => {
    rtcConfiguration.current = buildRtcConfiguration(iceServers)
  }, [iceServers])

  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  useEffect(() => {
    onSessionStatusRef.current = onSessionStatus
  }, [onSessionStatus])

  const acceptedPeerIds = useCallback((): string[] => {
    const hubId = String(callerId)
    const activeParticipants = participantsRef.current

    if (!isGroupCall) {
      if (!isCaller) {
        return hubId !== userIdStr ? [hubId] : []
      }

      return activeParticipants
        .filter(
          (p) =>
            p.userId !== userId &&
            p.role === "callee" &&
            p.status === "accepted",
        )
        .map((p) => String(p.userId))
    }

    if (!isCaller) {
      return hubId !== userIdStr ? [hubId] : []
    }

    return activeParticipants
      .filter((p) => p.userId !== userId && p.role === "callee" && p.status === "accepted")
      .map((p) => String(p.userId))
      .slice(0, MAX_GROUP_HOST_PEERS)
  }, [userId, userIdStr, isGroupCall, isCaller, callerId])

  const updateMediaConnected = useCallback(() => {
    const expectedPeers = acceptedPeerIds()
    if (expectedPeers.length === 0) {
      setMediaConnected(false)
      setConnectionStatus(isCaller ? "Waiting for someone to answer…" : "Waiting for caller…")
      return
    }

    const remoteForPeer = (peerId: string) =>
      remoteStreamsRef.current.find((item) => item.peerId === peerId)?.stream

    const peersWithAudio = expectedPeers.filter((peerId) => {
      const stream = remoteForPeer(peerId)
      if (hasLiveAudioTrack(stream)) {
        return true
      }
      const pc = peerConnections.current.get(peerId)
      return pc ? hasReceivingAudio(pc) : false
    }).length

    const ready = peersWithAudio >= expectedPeers.length

    setMediaConnected(ready)
    if (ready) {
      setConnectionStatus("Connected")
      return
    }

    const negotiating = expectedPeers.some((peerId) => {
      const pc = peerConnections.current.get(peerId)
      return pc && isPeerNegotiating(pc) && pc.localDescription && pc.remoteDescription
    })

    setConnectionStatus(
      negotiating
        ? "Almost connected…"
        : peersWithAudio > 0
          ? expectedPeers.length === 1
            ? "Connecting audio…"
            : `Audio live · ${peersWithAudio}/${expectedPeers.length}`
          : "Connecting audio…",
    )
  }, [acceptedPeerIds, isCaller])

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams
    updateMediaConnected()
  }, [remoteStreams, updateMediaConnected])

  useEffect(() => {
    if (!mediaConnected) {
      return
    }
    resumeUnityCallRemotePlayback()
  }, [mediaConnected, remoteStreams])

  useEffect(() => {
    mediaConnectedRef.current = mediaConnected
  }, [mediaConnected])

  const postSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (callEnded.current) {
        return
      }

      const now = Date.now()
      if (now < signalBackoffUntil.current) {
        await new Promise((resolve) => window.setTimeout(resolve, signalBackoffUntil.current - now))
      }

      const payload = normalizeWebRtcSignal(signal)
      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""

      try {
        const response = await fetch(route("unity-calls.signal", callId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRF-TOKEN": csrf,
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`signal HTTP ${response.status}`)
        }

        await new Promise((resolve) => window.setTimeout(resolve, SIGNAL_MIN_GAP_MS))
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to send signal:", error)
        signalBackoffUntil.current = Date.now() + 2500
        throw error
      }
    },
    [callId],
  )

  const enqueueSignalSend = useCallback(
    (signal: WebRTCSignal) => {
      signalSendChain.current = signalSendChain.current
        .then(() => postSignal(signal))
        .catch(() => {})
    },
    [postSignal],
  )

  const flushIceCandidatesForPeerRef = useRef<(peerId: string) => void>(() => {})

  flushIceCandidatesForPeerRef.current = (peerId: string) => {
    const queue = iceCandidateQueues.current.get(peerId) ?? []
    if (queue.length === 0) {
      iceFlushTimers.current.delete(peerId)
      return
    }

    const batch = queue.splice(0, MAX_ICE_PER_FLUSH)
    iceCandidateQueues.current.set(peerId, queue)

    for (const signal of batch) {
      enqueueSignalSend(signal)
    }

    if (queue.length > 0) {
      const timer = window.setTimeout(() => flushIceCandidatesForPeerRef.current(peerId), ICE_FLUSH_MS)
      iceFlushTimers.current.set(peerId, timer)
    } else {
      iceFlushTimers.current.delete(peerId)
    }
  }

  const sendSignal = useCallback(
    (signal: WebRTCSignal) => {
      if (callEnded.current) {
        return
      }

      const normalized = normalizeWebRtcSignal(signal)

      if (normalized.type === "ice-candidate") {
        const peerId = normalized.to
        const queue = iceCandidateQueues.current.get(peerId) ?? []
        queue.push(normalized)
        iceCandidateQueues.current.set(peerId, queue)

        if (!iceFlushTimers.current.has(peerId)) {
          const timer = window.setTimeout(() => flushIceCandidatesForPeerRef.current(peerId), ICE_FLUSH_MS)
          iceFlushTimers.current.set(peerId, timer)
        }
        return
      }

      if (normalized.type === "offer-request") {
        const peerId = normalized.to
        const lastSent = lastOfferRequestAt.current.get(peerId) ?? 0
        if (Date.now() - lastSent < OFFER_REQUEST_COOLDOWN_MS) {
          return
        }
        lastOfferRequestAt.current.set(peerId, Date.now())
      }

      enqueueSignalSend(normalized)
    },
    [enqueueSignalSend],
  )

  const getOutgoingTrack = useCallback(
    (peerId: string): MediaStreamTrack | null => {
      const source = localStreamRef.current?.getAudioTracks()[0] ?? null
      if (!source) {
        return null
      }

      const micEnabled = isAudioEnabledRef.current

      if (!isCaller || !isGroupCall) {
        source.enabled = micEnabled
        return source
      }

      let cloned = outboundTracksRef.current.get(peerId)
      if (!cloned || cloned.readyState !== "live") {
        cloned?.stop()
        cloned = source.clone()
        outboundTracksRef.current.set(peerId, cloned)
      }
      cloned.enabled = micEnabled
      return cloned
    },
    [isCaller, isGroupCall],
  )

  const addLocalAudioToPeer = useCallback(
    async (peerId: string, pc: RTCPeerConnection): Promise<boolean> => {
      const track = getOutgoingTrack(peerId)
      if (!track) {
        return false
      }

      const attachStream =
        localStreamRef.current &&
        localStreamRef.current.getAudioTracks().some((item) => item.id === track.id)
          ? localStreamRef.current
          : new MediaStream([track])

      const previous = attachAudioChain.current.get(peerId) ?? Promise.resolve(true)
      const next = previous
        .catch(() => true)
        .then(() => ensurePeerAudioTransceiver(pc, track, attachStream))
      attachAudioChain.current.set(peerId, next)
      return next
    },
    [getOutgoingTrack],
  )

  const resetPeerConnection = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      pc.close()
      peerConnections.current.delete(peerId)
    }
    pendingCandidates.current.delete(peerId)
    makingOffer.current.delete(peerId)
    ignoreOffer.current.delete(peerId)
    offerRequestSentFor.current.delete(peerId)
    for (const key of [...processedSignals.current]) {
      if (key.includes(`:${peerId}`) || key.endsWith(`:${peerId}`)) {
        processedSignals.current.delete(key)
      }
    }
    const cloned = outboundTracksRef.current.get(peerId)
    if (cloned) {
      cloned.stop()
      outboundTracksRef.current.delete(peerId)
    }
    attachAudioChain.current.delete(peerId)
    hostOfferChain.current.delete(peerId)
    setRemoteStreams((prev) => prev.filter((item) => item.peerId !== peerId))
  }, [])

  const registerRemoteTrack = useCallback(
    (peerId: string, track: MediaStreamTrack) => {
      if (track.kind !== "audio" || track.readyState === "ended") {
        return
      }

      track.enabled = true
      setRemoteStreams((prev) => {
        if (!isGroupCall) {
          const stream = new MediaStream([track])
          return [...prev.filter((item) => item.peerId !== peerId), { peerId, stream }]
        }

        const existing = prev.find((item) => item.peerId === peerId)
        const tracks = existing ? [...existing.stream.getAudioTracks()] : []
        if (!tracks.some((item) => item.id === track.id)) {
          tracks.push(track)
        }
        const stream = new MediaStream(tracks)
        return [...prev.filter((item) => item.peerId !== peerId), { peerId, stream }]
      })
      updateMediaConnected()
      resumeUnityCallRemotePlayback()
    },
    [isGroupCall, updateMediaConnected],
  )

  const syncRemoteTracksFromPeer = useCallback(
    (peerId: string, pc: RTCPeerConnection) => {
      pc.getReceivers().forEach((receiver) => {
        const track = receiver.track
        if (track?.kind === "audio" && track.readyState !== "ended") {
          registerRemoteTrack(peerId, track)
        }
      })
    },
    [registerRemoteTrack],
  )

  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peerConnections.current.get(peerId)
      if (existing && isPeerConnectionUsable(existing)) {
        return existing
      }
      if (existing) {
        peerConnections.current.delete(peerId)
      }

      const pc = new RTCPeerConnection(rtcConfiguration.current)
      makingOffer.current.set(peerId, false)
      ignoreOffer.current.set(peerId, false)

      pc.ontrack = (event) => {
        const track = event.track
        if (!track || track.kind !== "audio") {
          return
        }

        track.enabled = true

        const remoteStream = event.streams[0]
        if (remoteStream) {
          remoteStream.getAudioTracks().forEach((audioTrack) => {
            audioTrack.enabled = true
            registerRemoteTrack(peerId, audioTrack)
          })
        } else {
          registerRemoteTrack(peerId, track)
        }

        track.onunmute = () => {
          registerRemoteTrack(peerId, track)
          resumeUnityCallRemotePlayback()
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            candidate: event.candidate,
            from: userIdStr,
            to: peerId,
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          try {
            pc.restartIce()
          } catch {
            resetPeerConnection(peerId)
          }
        }
        if (pc.connectionState === "connected") {
          syncRemoteTracksFromPeer(peerId, pc)
          resumeUnityCallRemotePlayback()
        }
        updateMediaConnected()
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          syncRemoteTracksFromPeer(peerId, pc)
          resumeUnityCallRemotePlayback()
        }
        updateMediaConnected()
      }

      peerConnections.current.set(peerId, pc)
      return pc
    },
    [registerRemoteTrack, resetPeerConnection, sendSignal, syncRemoteTracksFromPeer, updateMediaConnected, userIdStr],
  )

  const runCreateHostOffer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || !isCaller || !localStreamRef.current || peerId === userIdStr) {
        return
      }

      if (makingOffer.current.get(peerId)) {
        return
      }

      makingOffer.current.set(peerId, true)
      try {
        let pc = peerConnections.current.get(peerId)
        if (!isPeerConnectionUsable(pc)) {
          if (pc) {
            resetPeerConnection(peerId)
          }
          pc = createPeerConnection(peerId)
        }

        if (peerHasCompletedNegotiation(pc) || isPeerConnected(pc) || isPeerNegotiationSettled(pc)) {
          await addLocalAudioToPeer(peerId, pc)
          syncRemoteTracksFromPeer(peerId, pc)
          resumeUnityCallRemotePlayback()
          updateMediaConnected()
          return
        }

        if (pc.signalingState === "have-local-offer" && pc.localDescription) {
          sendSignal({
            type: "offer",
            offer: normalizeSessionDescription(pc.localDescription) ?? pc.localDescription,
            from: userIdStr,
            to: peerId,
          })
          return
        }

        if (pc.signalingState !== "stable" || pc.localDescription || pc.remoteDescription) {
          return
        }

        if (pc.getTransceivers().length === 0) {
          pc.addTransceiver("audio", { direction: "sendrecv" })
        }

        const attached = await addLocalAudioToPeer(peerId, pc)
        if (!attached || !hasAudioSender(pc)) {
          return
        }

        if (peerHasCompletedNegotiation(pc) || pc.localDescription || pc.remoteDescription) {
          return
        }

        const offer = await pc.createOffer()
        const normalized = normalizeSessionDescription(offer)
        if (!normalized) {
          return
        }
        await pc.setLocalDescription(normalized)
        await waitForIceGathering(pc)
        sendSignal({
          type: "offer",
          offer: normalizeSessionDescription(pc.localDescription ?? undefined) ?? normalized,
          from: userIdStr,
          to: peerId,
        })
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to create host offer:", error)
        const pc = peerConnections.current.get(peerId)
        if (!pc || (!isPeerConnected(pc) && !peerHasCompletedNegotiation(pc))) {
          resetPeerConnection(peerId)
        }
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [addLocalAudioToPeer, createPeerConnection, isCaller, resetPeerConnection, sendSignal, syncRemoteTracksFromPeer, updateMediaConnected, userIdStr],
  )

  const createHostOffer = useCallback(
    (peerId: string): Promise<void> => {
      const previous = hostOfferChain.current.get(peerId) ?? Promise.resolve()
      const next = previous.catch(() => {}).then(() => runCreateHostOffer(peerId))
      hostOfferChain.current.set(peerId, next)
      return next
    },
    [runCreateHostOffer],
  )

  /** 1:1 fallback when caller offer never arrives (signaling delay / Echo miss). */
  const createDirectCalleeOffer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || isCaller || isGroupCall || !localStreamRef.current || peerId === userIdStr) {
        return
      }

      if (peerId !== String(callerId)) {
        return
      }

      const existingPc = peerConnections.current.get(peerId)
      const pc = isPeerConnectionUsable(existingPc) ? existingPc : createPeerConnection(peerId)
      if (pc.signalingState !== "stable" || pc.remoteDescription || pc.localDescription) {
        return
      }

      makingOffer.current.set(peerId, true)
      try {
        if (pc.getTransceivers().length === 0) {
          pc.addTransceiver("audio", { direction: "sendrecv" })
        }

        const attached = await addLocalAudioToPeer(peerId, pc)
        if (!attached || !hasAudioSender(pc)) {
          return
        }

        const offer = await pc.createOffer()
        const normalized = normalizeSessionDescription(offer)
        if (!normalized) {
          return
        }
        await pc.setLocalDescription(normalized)
        await waitForIceGathering(pc)
        sendSignal({
          type: "offer",
          offer: normalizeSessionDescription(pc.localDescription ?? undefined) ?? normalized,
          from: userIdStr,
          to: peerId,
        })
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to create callee offer:", error)
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [addLocalAudioToPeer, callerId, createPeerConnection, isCaller, isGroupCall, sendSignal, userIdStr],
  )

  const resendDirectCalleeOffer = useCallback(
    (peerId: string) => {
      if (callEnded.current || isCaller || isGroupCall || peerId !== String(callerId)) {
        return
      }

      const pc = peerConnections.current.get(peerId)
      if (!pc?.localDescription || pc.signalingState !== "have-local-offer" || pc.remoteDescription) {
        return
      }

      const normalized = normalizeSessionDescription(pc.localDescription)
      if (!normalized) {
        return
      }

      sendSignal({
        type: "offer",
        offer: normalized,
        from: userIdStr,
        to: peerId,
      })
    },
    [callerId, isCaller, isGroupCall, sendSignal, userIdStr],
  )

  const handleSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (callEnded.current) {
        return
      }

      const normalized = normalizeWebRtcSignal(signal)

      if (normalized.type === "offer-request") {
        if (normalized.to !== userIdStr || !isCaller) {
          return
        }

        const from = normalized.from
        const existing = peerConnections.current.get(from)
        if (existing && (isPeerConnected(existing) || isPeerNegotiationSettled(existing))) {
          void addLocalAudioToPeer(from, existing)
          syncRemoteTracksFromPeer(from, existing)
          return
        }

        if (!isPeerConnectionUsable(existing)) {
          resetPeerConnection(from)
        }

        await createHostOffer(from)
        return
      }

      if (normalized.to !== userIdStr) {
        return
      }

      const from = normalized.from
      if (!isCaller && from !== String(callerId)) {
        return
      }

      const dedupeKey = webRtcSignalKey(normalized)
      if (processedSignals.current.has(dedupeKey)) {
        return
      }
      processedSignals.current.add(dedupeKey)

      let pc = peerConnections.current.get(from)
      if (!isPeerConnectionUsable(pc)) {
        if (pc) {
          resetPeerConnection(from)
        }
        pc = createPeerConnection(from)
      }

      try {
        switch (normalized.type) {
          case "offer": {
            const isPolite = isGroupCall ? Number(userIdStr) > Number(from) : true
            const offerCollision = pc.signalingState !== "stable" || makingOffer.current.get(from)
            ignoreOffer.current.set(from, !isPolite && Boolean(offerCollision))
            if (ignoreOffer.current.get(from)) {
              processedSignals.current.delete(dedupeKey)
              return
            }

            const remoteOffer = normalizeSessionDescription(normalized.offer)
            if (!remoteOffer) {
              return
            }

            if (pc.signalingState === "have-local-offer") {
              await pc.setLocalDescription({ type: "rollback" })
            }

            await pc.setRemoteDescription(remoteOffer)

            const pending = pendingCandidates.current.get(from) ?? []
            for (const candidate of pending) {
              await pc.addIceCandidate(candidate).catch(() => {})
            }
            pendingCandidates.current.delete(from)

            await addLocalAudioToPeer(from, pc)

            const answer = await pc.createAnswer()
            const normalizedAnswer = normalizeSessionDescription(answer)
            if (!normalizedAnswer) {
              return
            }
            await pc.setLocalDescription(normalizedAnswer)
            await waitForIceGathering(pc)
            sendSignal({
              type: "answer",
              answer: normalizeSessionDescription(pc.localDescription ?? undefined) ?? normalizedAnswer,
              from: userIdStr,
              to: from,
            })
            syncRemoteTracksFromPeer(from, pc)
            resumeUnityCallRemotePlayback()
            break
          }
          case "answer": {
            const remoteAnswer = normalizeSessionDescription(normalized.answer)
            if (!remoteAnswer || pc.signalingState !== "have-local-offer") {
              return
            }
            await pc.setRemoteDescription(remoteAnswer)
            await addLocalAudioToPeer(from, pc)
            syncRemoteTracksFromPeer(from, pc)
            const pending = pendingCandidates.current.get(from) ?? []
            for (const candidate of pending) {
              await pc.addIceCandidate(candidate).catch(() => {})
            }
            pendingCandidates.current.delete(from)
            resumeUnityCallRemotePlayback()
            break
          }
          case "ice-candidate": {
            if (!normalized.candidate) {
              return
            }
            if (pc.remoteDescription?.type) {
              await pc.addIceCandidate(normalized.candidate).catch(() => {})
            } else {
              const pending = pendingCandidates.current.get(from) ?? []
              pending.push(normalized.candidate)
              pendingCandidates.current.set(from, pending)
            }
            break
          }
        }
      } catch (error) {
        console.error("[UnityCallWebRTC] Signal handling failed:", normalized.type, error)
        processedSignals.current.delete(dedupeKey)
        if (normalized.type === "offer" || normalized.type === "answer") {
          const failedPc = peerConnections.current.get(from)
          if (!failedPc || (!isPeerConnected(failedPc) && !peerHasCompletedNegotiation(failedPc))) {
            resetPeerConnection(from)
          }
        }
      }

      updateMediaConnected()
    },
    [
      addLocalAudioToPeer,
      callerId,
      createHostOffer,
      createPeerConnection,
      isCaller,
      resetPeerConnection,
      sendSignal,
      updateMediaConnected,
      syncRemoteTracksFromPeer,
      userIdStr,
    ],
  )

  handleSignalRef.current = handleSignal

  const enqueueSignal = useCallback((signal: WebRTCSignal) => {
    if (!mediaStarted.current || !localStreamRef.current) {
      pendingSignals.current.push(signal)
      return
    }

    handleSignalChain.current = handleSignalChain.current
      .then(() => handleSignalRef.current(signal))
      .catch((error) => {
        console.error("[UnityCallWebRTC] Queued signal failed:", error)
      })
  }, [])

  const flushPendingSignals = useCallback(() => {
    const queued = [...pendingSignals.current]
    pendingSignals.current = []
    queued.forEach((signal) => enqueueSignal(signal))
  }, [enqueueSignal])

  const fetchPendingSignals = useCallback(async () => {
    if (callEnded.current) {
      return
    }

    try {
      const res = await fetch(route("unity-calls.pending-signals", callId), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
      })
      if (!res.ok) {
        return
      }
      const body = (await res.json()) as { signals?: WebRTCSignal[] }
      for (const signal of body.signals ?? []) {
        enqueueSignal(signal)
      }
    } catch (error) {
      console.error("[UnityCallWebRTC] Failed to fetch pending signals:", error)
    }
  }, [callId, enqueueSignal])

  const connectPeers = useCallback(() => {
    if (callEnded.current || !mediaStarted.current || !localStreamRef.current) {
      return
    }

    const peers = acceptedPeerIds()
    peers.forEach((peerId) => {
      const pc = createPeerConnection(peerId)

      if (isPeerConnected(pc) || isPeerNegotiationSettled(pc)) {
        void addLocalAudioToPeer(peerId, pc)
        syncRemoteTracksFromPeer(peerId, pc)
        return
      }

      void addLocalAudioToPeer(peerId, pc)

      if (isCaller) {
        void createHostOffer(peerId)
      } else if (!isGroupCall) {
        sendSignal({
          type: "offer-request",
          from: userIdStr,
          to: peerId,
        })
      } else {
        void createDirectCalleeOffer(peerId)
        sendSignal({
          type: "offer-request",
          from: userIdStr,
          to: peerId,
        })
      }
    })

    updateMediaConnected()
  }, [acceptedPeerIds, addLocalAudioToPeer, createDirectCalleeOffer, createHostOffer, createPeerConnection, isCaller, isGroupCall, sendSignal, syncRemoteTracksFromPeer, updateMediaConnected, userIdStr])

  const attachMicTrackMonitor = useCallback((track: MediaStreamTrack) => {
    micMonitorCleanupRef.current?.()
    micMonitorCleanupRef.current = null

    const onMicIssue = () => {
      void reviveLocalMicrophoneRef.current()
    }

    track.addEventListener("ended", onMicIssue)

    micMonitorCleanupRef.current = () => {
      track.removeEventListener("ended", onMicIssue)
    }
  }, [])

  const refreshLocalAudioOnPeers = useCallback(async () => {
    for (const [peerId, pc] of peerConnections.current.entries()) {
      await addLocalAudioToPeer(peerId, pc)
    }
  }, [addLocalAudioToPeer])

  const reviveLocalMicrophone = useCallback(async () => {
    if (callEnded.current || !mediaStarted.current || reviveMicInFlightRef.current) {
      return
    }

    const currentTrack = localStreamRef.current?.getAudioTracks()[0]
    const needsNewCapture = localMicNeedsRevive(currentTrack)

    if (!needsNewCapture && currentTrack?.readyState === "live") {
      await refreshLocalAudioOnPeers()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      return
    }

    reviveMicInFlightRef.current = true
    let didReplaceCapture = false

    try {
      const previousStream = localStreamRef.current

      const freshStream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      })

      freshStream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioEnabledRef.current
      })

      previousStream?.getTracks().forEach((track) => {
        if (track.readyState === "live") {
          track.stop()
        }
      })

      outboundTracksRef.current.forEach((track) => track.stop())
      outboundTracksRef.current.clear()

      localStreamRef.current = freshStream
      setLocalStream(freshStream)
      didReplaceCapture = true

      const freshTrack = freshStream.getAudioTracks()[0]
      if (freshTrack) {
        attachMicTrackMonitor(freshTrack)
      }

      await refreshLocalAudioOnPeers()

      if (didReplaceCapture && isCaller) {
        for (const [peerId, pc] of peerConnections.current.entries()) {
          if (!peerHasCompletedNegotiation(pc) && !isPeerConnected(pc) && !isPeerNegotiationSettled(pc)) {
            void createHostOffer(peerId)
          }
        }
      }
    } catch (error) {
      console.error("[UnityCallWebRTC] Failed to revive microphone:", error)
    } finally {
      reviveMicInFlightRef.current = false
    }
  }, [attachMicTrackMonitor, createHostOffer, isCaller, refreshLocalAudioOnPeers])

  useEffect(() => {
    reviveLocalMicrophoneRef.current = reviveLocalMicrophone
  }, [reviveLocalMicrophone])

  const stopMedia = useCallback(() => {
    callEnded.current = true
    mediaStarted.current = false
    channelReady.current = false
    pendingSignals.current = []
    processedSignals.current.clear()
    offerRequestSentFor.current.clear()
    handleSignalChain.current = Promise.resolve()
    signalSendChain.current = Promise.resolve()
    iceCandidateQueues.current.clear()
    iceFlushTimers.current.forEach((timer) => window.clearTimeout(timer))
    iceFlushTimers.current.clear()
    lastOfferRequestAt.current.clear()
    signalBackoffUntil.current = 0

    peerConnections.current.forEach((pc) => pc.close())
    peerConnections.current.clear()
    pendingCandidates.current.clear()
    makingOffer.current.clear()
    ignoreOffer.current.clear()

    outboundTracksRef.current.forEach((track) => track.stop())
    outboundTracksRef.current.clear()
    attachAudioChain.current.clear()
    hostOfferChain.current.clear()

    micMonitorCleanupRef.current?.()
    micMonitorCleanupRef.current = null

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    setLocalStream(null)
    setRemoteStreams([])
    setMediaConnected(false)
    setConnectionStatus("idle")
    setPermissionStatus("idle")

  }, [])

  const startMedia = useCallback(async () => {
    if (mediaStarted.current || callEnded.current || !mediaActive) {
      return
    }

    mediaStarted.current = true
    callEnded.current = false
    setConnectionStatus("Requesting microphone…")

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionStatus("unsupported")
        setConnectionStatus("Microphone not supported in this browser")
        mediaStarted.current = false
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      })
      invalidateAudioOutputCache()
      localStreamRef.current = stream
      setLocalStream(stream)
      setPermissionStatus("granted")
      setConnectionStatus(channelReady.current ? "Connecting audio…" : "Joining call channel…")

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        attachMicTrackMonitor(audioTrack)
      }

      for (const [peerId, pc] of peerConnections.current.entries()) {
        await addLocalAudioToPeer(peerId, pc)
      }

      flushPendingSignals()
      void fetchPendingSignals()
      connectPeers()
    } catch (error) {
      mediaStarted.current = false
      const denied = error instanceof DOMException && error.name === "NotAllowedError"
      setPermissionStatus(denied ? "denied" : "prompt")
      setConnectionStatus(denied ? "Microphone access blocked" : "Could not access microphone")
    }
  }, [addLocalAudioToPeer, attachMicTrackMonitor, connectPeers, fetchPendingSignals, flushPendingSignals, mediaActive])

  const applyOutgoingAudioEnabled = useCallback((enabled: boolean) => {
    isAudioEnabledRef.current = enabled
    localStreamRef.current?.getAudioTracks().forEach((audioTrack) => {
      audioTrack.enabled = enabled
    })
    outboundTracksRef.current.forEach((clonedTrack) => {
      clonedTrack.enabled = enabled
    })
    peerConnections.current.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === "audio") {
          sender.track.enabled = enabled
        }
      })
    })
    setIsAudioEnabled(enabled)
  }, [])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current?.getAudioTracks()[0]) {
      return
    }
    applyOutgoingAudioEnabled(!isAudioEnabledRef.current)
  }, [applyOutgoingAudioEnabled])

  const retryPermission = useCallback(() => {
    mediaStarted.current = false
    callEnded.current = false
    void startMedia()
  }, [startMedia])

  const syncPeerConnections = useCallback(() => {
    if (callEnded.current || !mediaStarted.current) {
      return
    }

    const activePeers = new Set(acceptedPeerIds())
    for (const peerId of [...peerConnections.current.keys()]) {
      if (!activePeers.has(peerId)) {
        resetPeerConnection(peerId)
      }
    }

    connectPeers()
  }, [acceptedPeerIds, connectPeers, resetPeerConnection])

  const syncPeerConnectionsRef = useRef(syncPeerConnections)
  const connectPeersRef = useRef(connectPeers)
  const enqueueSignalRef = useRef(enqueueSignal)
  const fetchPendingSignalsRef = useRef(fetchPendingSignals)
  const stopMediaRef = useRef(stopMedia)
  const updateMediaConnectedRef = useRef(updateMediaConnected)

  const resyncCall = useCallback(() => {
    if (callEnded.current || !mediaStarted.current) {
      return
    }

    const resumeRemotePlayback = () => {
      document.querySelectorAll('audio[data-unity-call-remote="1"]').forEach((node) => {
        void (node as HTMLAudioElement).play().catch(() => {})
      })
    }

    if (mediaConnectedRef.current) {
      resumeRemotePlayback()
      updateMediaConnected()
      return
    }

    void reviveLocalMicrophone().finally(() => {
      void fetchPendingSignals().finally(() => {
        syncPeerConnections()
        updateMediaConnected()
        resumeRemotePlayback()
      })
    })
  }, [fetchPendingSignals, reviveLocalMicrophone, syncPeerConnections, updateMediaConnected])

  const resyncCallRef = useRef(resyncCall)

  useEffect(() => {
    resyncCallRef.current = resyncCall
  }, [resyncCall])

  useEffect(() => {
    syncPeerConnectionsRef.current = syncPeerConnections
  }, [syncPeerConnections])

  useEffect(() => {
    connectPeersRef.current = connectPeers
  }, [connectPeers])

  useEffect(() => {
    enqueueSignalRef.current = enqueueSignal
  }, [enqueueSignal])

  useEffect(() => {
    fetchPendingSignalsRef.current = fetchPendingSignals
  }, [fetchPendingSignals])

  useEffect(() => {
    stopMediaRef.current = stopMedia
  }, [stopMedia])

  useEffect(() => {
    updateMediaConnectedRef.current = updateMediaConnected
  }, [updateMediaConnected])

  useEffect(() => {
    if (!keepAlive || !callId) {
      return
    }

    const resumeRemotePlayback = () => {
      document.querySelectorAll('audio[data-unity-call-remote="1"]').forEach((node) => {
        void (node as HTMLAudioElement).play().catch(() => {})
      })
    }

    const onVisibility = () => {
      if (callEnded.current || !mediaStarted.current) {
        return
      }

      resumeRemotePlayback()

      if (mediaConnectedRef.current) {
        updateMediaConnectedRef.current()
        return
      }

      void reviveLocalMicrophoneRef.current()

      void fetchPendingSignalsRef.current().finally(() => {
        syncPeerConnectionsRef.current()
        updateMediaConnectedRef.current()
      })
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [callId, keepAlive])

  useEffect(() => {
    if (!keepAlive || !callId) {
      return
    }

    let navigateResyncTimer = 0

    const onNavigate = () => {
      refreshEchoAuthHeaders()
      if (navigateResyncTimer) {
        window.clearTimeout(navigateResyncTimer)
      }
      navigateResyncTimer = window.setTimeout(() => {
        resyncCallRef.current()
      }, 400)
    }

    onNavigate()
    const unsubRouter = router.on("success", onNavigate)

    return () => {
      if (navigateResyncTimer) {
        window.clearTimeout(navigateResyncTimer)
      }
      unsubRouter()
    }
  }, [callId, keepAlive])

  useEffect(() => {
    if (!keepAlive || !callId) {
      return
    }

    const connector = echo().connector as {
      pusher?: { connection?: { bind: (event: string, handler: () => void) => void; unbind: (event: string, handler: () => void) => void } }
    }
    const connection = connector.pusher?.connection
    if (!connection) {
      return
    }

    const onReconnected = () => {
      void fetchPendingSignalsRef.current().finally(() => {
        connectPeersRef.current()
        updateMediaConnectedRef.current()
      })
    }

    connection.bind("connected", onReconnected)
    return () => connection.unbind("connected", onReconnected)
  }, [callId, keepAlive])

  useEffect(() => {
    if (!keepAlive || !callId) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (callEnded.current || !mediaStarted.current || mediaConnectedRef.current) {
        return
      }
      resyncCallRef.current()
    }, 12000)

    return () => window.clearInterval(intervalId)
  }, [callId, keepAlive])

  useEffect(() => {
    if (!keepAlive || !callId) {
      return
    }

    let intervalId = 0

    const keepMicAlive = () => {
      if (callEnded.current || !mediaStarted.current) {
        return
      }

      if (mediaConnectedRef.current && document.visibilityState !== "hidden") {
        return
      }

      void reviveLocalMicrophoneRef.current()
    }

    const restartInterval = () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      const connected = mediaConnectedRef.current
      const hidden = document.visibilityState === "hidden"
      const delay = connected ? (hidden ? 5000 : 30000) : hidden ? 1500 : 5000
      intervalId = window.setInterval(keepMicAlive, delay)
    }

    restartInterval()
    document.addEventListener("visibilitychange", restartInterval)

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      document.removeEventListener("visibilitychange", restartInterval)
    }
  }, [callId, keepAlive, mediaConnected])

  useEffect(() => {
    if (!callId) {
      return
    }

    const channel = echo().private(`unity-call.${callId}`) as unknown as ChannelWithListen

    channel.listen(".webrtc.signal", (payload) => {
      enqueueSignalRef.current(payload as WebRTCSignal)
    })

    channel.listen(".call.session.status", (payload) => {
      const statusPayload = payload as UnityCallStatusPayload
      if (statusPayload.call?.id !== callId) {
        return
      }

      if (Array.isArray(statusPayload.participants) && statusPayload.participants.length > 0) {
        participantsRef.current = mergeCallParticipants(
          participantsRef.current,
          statusPayload.participants,
        )
        onSessionStatusRef.current?.(statusPayload)
      }

      if (["cancelled", "ended", "declined", "missed"].includes(statusPayload.reason)) {
        stopMediaRef.current()
        return
      }

      if (
        ["accepted", "participant_left", "participant_declined", "participant_missed"].includes(
          statusPayload.reason,
        )
      ) {
        void fetchPendingSignalsRef.current().finally(() => {
          if (mediaStarted.current) {
            syncPeerConnectionsRef.current()
          }
        })
      }
    })

    channel
      .subscribed(() => {
        channelReady.current = true
        if (mediaStarted.current) {
          setConnectionStatus((prev) =>
            prev === "Joining call channel…" || prev === "idle" ? "Connecting audio…" : prev,
          )
          void fetchPendingSignalsRef.current().finally(() => {
            connectPeersRef.current()
          })
        }
      })
      .error((error) => {
        console.error("[UnityCallWebRTC] Channel subscription failed:", error)
        channelReady.current = false
        setConnectionStatus("Realtime channel unavailable — using direct signaling…")
        if (mediaStarted.current) {
          void fetchPendingSignalsRef.current().finally(() => {
            connectPeersRef.current()
          })
        }
      })

    const subscribeFallbackId = window.setTimeout(() => {
      if (channelReady.current || callEnded.current || !mediaStarted.current) {
        return
      }

      setConnectionStatus((prev) =>
        prev === "Joining call channel…" ? "Realtime channel slow — using direct signaling…" : prev,
      )
      void fetchPendingSignalsRef.current().finally(() => {
        connectPeersRef.current()
      })
    }, 8000)

    return () => {
      window.clearTimeout(subscribeFallbackId)
      channel.stopListening?.(".webrtc.signal")
      channel.stopListening?.(".call.session.status")
      channelReady.current = false
    }
    // Keep subscription alive for the whole call — reconnecting on participant updates was dropping audio signals.
  }, [callId])

  useEffect(() => {
    if (!mediaActive) {
      return
    }
    void startMedia()
  }, [mediaActive, startMedia])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current) {
      return
    }
    syncPeerConnections()
  }, [syncPeerConnections, mediaActive, participants, callStatus])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || callStatus !== "accepted") {
      return
    }

    void fetchPendingSignalsRef.current().finally(() => {
      syncPeerConnectionsRef.current()
    })
  }, [callStatus, mediaActive])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current) {
      return
    }

    const intervalId = window.setInterval(() => {
      updateMediaConnected()
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [mediaActive, updateMediaConnected])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || mediaConnected) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (mediaConnected || callEnded.current) {
        return
      }

      if (isCaller) {
        acceptedPeerIds().forEach((peerId) => {
          const pc = peerConnections.current.get(peerId)
          if (pc && (isPeerConnected(pc) || isPeerNegotiationSettled(pc))) {
            syncRemoteTracksFromPeer(peerId, pc)
            void addLocalAudioToPeer(peerId, pc)
            resumeUnityCallRemotePlayback()
            return
          }
          void createHostOffer(peerId)
        })
      }
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [acceptedPeerIds, addLocalAudioToPeer, createHostOffer, isCaller, mediaActive, mediaConnected, syncRemoteTracksFromPeer])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || mediaConnected || callEnded.current) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (mediaConnected || callEnded.current) {
        return
      }
      void fetchPendingSignalsRef.current()
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [mediaActive, mediaConnected])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || mediaConnected || callEnded.current || isCaller || isGroupCall) {
      return
    }

    const peerId = String(callerId)

    const intervalId = window.setInterval(() => {
      if (mediaConnected || callEnded.current) {
        return
      }

      const pc = peerConnections.current.get(peerId)
      if (pc?.remoteDescription) {
        return
      }

      sendSignal({
        type: "offer-request",
        from: userIdStr,
        to: peerId,
      })
    }, 2500)

    const fallbackOfferId = window.setTimeout(() => {
      if (mediaConnected || callEnded.current) {
        return
      }

      const pc = peerConnections.current.get(peerId)
      if (pc?.remoteDescription || pc?.localDescription) {
        return
      }

      void createDirectCalleeOffer(peerId)
    }, 12000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(fallbackOfferId)
    }
  }, [callerId, createDirectCalleeOffer, isCaller, isGroupCall, mediaActive, mediaConnected, sendSignal, userIdStr])

  useEffect(() => {
    return subscribeUnityCallTerminated((payload) => {
      if (payload.call.id === callId) {
        stopMedia()
      }
    })
  }, [callId, stopMedia])

  useEffect(() => {
    return () => {
      if (!keepAlive) {
        stopMedia()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tear down only when leaving this call
  }, [callId, keepAlive, stopMedia])

  return {
    localStream,
    remoteStreams,
    mediaConnected,
    isAudioEnabled,
    permissionStatus,
    connectionStatus,
    startMedia,
    stopMedia,
    toggleMute,
    retryPermission,
    resyncCall,
  }
}
