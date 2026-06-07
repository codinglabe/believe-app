"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { echo } from "@laravel/echo-react"
import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"
import { subscribeUnityCallTerminated } from "@/lib/unityCallEvents"
import { invalidateAudioOutputCache } from "@/lib/callAudioOutput"
import {
  isPeerNegotiationSettled,
  normalizeSessionDescription,
  normalizeWebRtcSignal,
  webRtcSignalKey,
} from "@/lib/unityCallWebRTC"

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

type UnityCallStatusPayload = {
  reason: string
  call: { id: number; status: string; chatRoomId?: number | null }
}

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
}

function buildRtcConfiguration(iceServers: RTCIceServer[]): RTCConfiguration {
  const servers =
    iceServers.length > 0
      ? iceServers
      : [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
        ]

  return {
    iceServers: servers,
    iceCandidatePoolSize: 10,
    rtcpMuxPolicy: "require",
  }
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

function isPeerConnected(pc: RTCPeerConnection): boolean {
  const ice = pc.iceConnectionState
  const conn = pc.connectionState
  return ice === "connected" || ice === "completed" || conn === "connected"
}

function peerHasLiveOutgoingAudio(pc: RTCPeerConnection): boolean {
  return pc.getSenders().some(
    (sender) =>
      sender.track?.kind === "audio" && sender.track.enabled && sender.track.readyState === "live",
  )
}

function peerHasLiveIncomingAudio(pc: RTCPeerConnection): boolean {
  return pc.getReceivers().some(
    (receiver) =>
      receiver.track?.kind === "audio" &&
      receiver.track.enabled &&
      receiver.track.readyState === "live",
  )
}

function peerAudioIsFullyNegotiated(pc: RTCPeerConnection): boolean {
  return peerHasLiveOutgoingAudio(pc) && peerHasLiveIncomingAudio(pc)
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
}: UseUnityCallWebRTCOptions) {
  const userIdStr = String(userId)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<UnityCallRemoteStream[]>([])
  const [mediaConnected, setMediaConnected] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<UnityCallMediaPermission>("idle")
  const [connectionStatus, setConnectionStatus] = useState("idle")

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const channelReady = useRef(false)
  const callEnded = useRef(false)
  const mediaStarted = useRef(false)
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const pendingSignals = useRef<WebRTCSignal[]>([])
  const makingOffer = useRef<Map<string, boolean>>(new Map())
  const ignoreOffer = useRef<Map<string, boolean>>(new Map())
  const rtcConfiguration = useRef(buildRtcConfiguration(iceServers))
  const handleSignalRef = useRef<(signal: WebRTCSignal) => Promise<void>>(async () => {})
  const tryConnectRef = useRef<() => void>(() => {})
  const flushPendingSignalsRef = useRef<() => void>(() => {})
  const fetchPendingSignalsRef = useRef<() => Promise<void>>(async () => {})
  const processedSignals = useRef<Set<string>>(new Set())
  const offerRequestSent = useRef<Set<string>>(new Set())
  const handleSignalChain = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    rtcConfiguration.current = buildRtcConfiguration(iceServers)
  }, [iceServers])

  const remoteStreamsRef = useRef<UnityCallRemoteStream[]>([])

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams
  }, [remoteStreams])

  const acceptedPeerIds = useCallback((): string[] => {
    const hubId = String(callerId)

    if (!isGroupCall) {
      if (!isCaller) {
        return hubId !== userIdStr ? [hubId] : []
      }

      const accepted = participants
        .filter((p) => p.userId !== userId && p.status === "accepted")
        .map((p) => String(p.userId))
      if (accepted.length > 0) {
        return accepted
      }

      if (callStatus === "accepted") {
        return participants
          .filter((p) => p.userId !== userId && p.role === "callee")
          .map((p) => String(p.userId))
      }

      return []
    }

    if (!isCaller) {
      return hubId !== userIdStr ? [hubId] : []
    }

    return participants
      .filter((p) => p.userId !== userId && p.role === "callee" && p.status === "accepted")
      .map((p) => String(p.userId))
      .slice(0, MAX_GROUP_HOST_PEERS)
  }, [participants, userId, userIdStr, isGroupCall, isCaller, callerId, callStatus])

  const updateMediaConnected = useCallback(() => {
    const expectedPeers = acceptedPeerIds()
    const connectedCount = Array.from(peerConnections.current.entries()).filter(
      ([peerId, pc]) => expectedPeers.includes(peerId) && isPeerConnected(pc),
    ).length
    const remoteReadyCount = expectedPeers.filter((peerId) =>
      remoteStreamsRef.current.some((item) => item.peerId === peerId && item.stream.getAudioTracks().some((t) => t.readyState === "live")),
    ).length

    if (expectedPeers.length === 0) {
      setMediaConnected(false)
      setConnectionStatus(isCaller ? "Waiting for someone to answer…" : "Waiting for caller…")
      return
    }

    const readyCount = Math.max(connectedCount, remoteReadyCount)
    const hasLiveRemote = remoteStreamsRef.current.some((item) =>
      item.stream.getAudioTracks().some((track) => track.readyState === "live"),
    )
    const isDirectPair = !isGroupCall && expectedPeers.length === 1

    setMediaConnected(
      expectedPeers.length > 0 &&
        (readyCount >= expectedPeers.length || (isDirectPair && hasLiveRemote)),
    )
    if (readyCount >= expectedPeers.length) {
      setConnectionStatus("Connected")
    } else if (readyCount > 0) {
      setConnectionStatus(`Connected to ${readyCount}/${expectedPeers.length}`)
    } else {
      setConnectionStatus("Connecting audio…")
    }
  }, [acceptedPeerIds, isCaller, isGroupCall])

  const sendSignal = useCallback(
    (signal: WebRTCSignal) => {
      const payload = normalizeWebRtcSignal(signal)
      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
      void fetch(route("unity-calls.signal", callId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": csrf,
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      }).catch((error) => {
        console.error("[UnityCallWebRTC] Failed to send signal:", error)
      })
    },
    [callId],
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
    offerRequestSent.current.delete(peerId)
    setRemoteStreams((prev) => prev.filter((item) => item.peerId !== peerId))
  }, [])

  const ensureLocalTracksOnPeer = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const stream = localStreamRef.current
    const track = stream?.getAudioTracks()[0] ?? null

    if (track) {
      track.enabled = true
    }

    let transceiver = pc.getTransceivers().find(
      (item) =>
        item.sender.track?.kind === "audio" ||
        item.receiver.track?.kind === "audio" ||
        item.mid !== null,
    )

    if (!transceiver) {
      transceiver = pc.addTransceiver("audio", { direction: "sendrecv" })
    }

    try {
      transceiver.direction = "sendrecv"
    } catch {
      // ignore read-only direction in some browsers
    }

    if (track && transceiver.sender.track?.id !== track.id) {
      await transceiver.sender.replaceTrack(track)
    }
  }, [])

  const attachLocalTracks = useCallback(
    (stream: MediaStream) => {
      void (async () => {
        for (const [peerId, pc] of peerConnections.current.entries()) {
          await ensureLocalTracksOnPeer(peerId, pc)
        }
        void stream
      })()
    },
    [ensureLocalTracksOnPeer],
  )

  const hostInitiatesWebRtc = useCallback(
    (peerId: string): boolean => {
      if (isGroupCall) {
        return isCaller
      }
      return Number(userIdStr) < Number(peerId)
    },
    [isCaller, isGroupCall, userIdStr],
  )

  const shouldRequestOfferFromPeer = useCallback(
    (peerId: string): boolean => {
      if (isGroupCall) {
        return !isCaller
      }
      return Number(userIdStr) > Number(peerId)
    },
    [isCaller, isGroupCall, userIdStr],
  )

  const pushRemoteStreamFromPeer = useCallback(
    (peerId: string, pc: RTCPeerConnection) => {
      const receiverTracks = pc
        .getReceivers()
        .map((receiver) => receiver.track)
        .filter((track): track is MediaStreamTrack => Boolean(track && track.kind === "audio"))

      receiverTracks.forEach((track) => {
        track.enabled = true
      })

      if (receiverTracks.length === 0) {
        return
      }

      const remoteStream = new MediaStream(receiverTracks)
      setRemoteStreams((prev) => {
        const filtered = prev.filter((item) => item.peerId !== peerId)
        return [...filtered, { peerId, stream: remoteStream }]
      })
      updateMediaConnected()
    },
    [updateMediaConnected],
  )

  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peerConnections.current.get(peerId)
      if (existing) {
        return existing
      }

      const pc = new RTCPeerConnection(rtcConfiguration.current)
      makingOffer.current.set(peerId, false)
      ignoreOffer.current.set(peerId, false)

      pc.ontrack = (event) => {
        const remoteStream =
          event.streams[0] ?? (event.track ? new MediaStream([event.track]) : null)
        if (!remoteStream) {
          return
        }

        if (event.track) {
          event.track.enabled = true
          if (!remoteStream.getTracks().includes(event.track)) {
            remoteStream.addTrack(event.track)
          }
        }

        setRemoteStreams((prev) => {
          const filtered = prev.filter((item) => item.peerId !== peerId)
          return [...filtered, { peerId, stream: remoteStream }]
        })
        updateMediaConnected()
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
            pc.restartIce?.()
          } catch {
            pc.close()
            peerConnections.current.delete(peerId)
            setRemoteStreams((prev) => prev.filter((item) => item.peerId !== peerId))
          }
        } else if (pc.connectionState === "connected") {
          pushRemoteStreamFromPeer(peerId, pc)
        }
        updateMediaConnected()
      }

      pc.oniceconnectionstatechange = () => {
        updateMediaConnected()
      }

      peerConnections.current.set(peerId, pc)
      void ensureLocalTracksOnPeer(peerId, pc)

      return pc
    },
    [ensureLocalTracksOnPeer, pushRemoteStreamFromPeer, sendSignal, updateMediaConnected, userIdStr],
  )

  const sendOfferToPeer = useCallback(
    (peerId: string, pc: RTCPeerConnection) => {
      const description = normalizeSessionDescription(pc.localDescription ?? undefined)
      if (!description) {
        return
      }
      sendSignal({
        type: "offer",
        offer: description,
        from: userIdStr,
        to: peerId,
      })
    },
    [sendSignal, userIdStr],
  )

  const renegotiateAudioWithPeer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || peerId === userIdStr || !localStreamRef.current) {
        return
      }

      let pc = peerConnections.current.get(peerId)
      if (!pc) {
        pc = createPeerConnection(peerId)
      }

      await ensureLocalTracksOnPeer(peerId, pc)

      if (pc.signalingState !== "stable") {
        return
      }

      try {
        makingOffer.current.set(peerId, true)
        const offer = await pc.createOffer({ offerToReceiveAudio: true })
        const normalized = normalizeSessionDescription(offer)
        if (!normalized) {
          return
        }
        await pc.setLocalDescription(normalized)
        sendOfferToPeer(peerId, pc)
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to renegotiate audio:", error)
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [createPeerConnection, ensureLocalTracksOnPeer, sendOfferToPeer, userIdStr],
  )

  const createOfferForPeer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || peerId === userIdStr || !localStreamRef.current) {
        return
      }

      if (isGroupCall && !isCaller) {
        return
      }

      let pc = peerConnections.current.get(peerId)
      if (pc && isPeerNegotiationSettled(pc)) {
        if (!peerHasLiveOutgoingAudio(pc)) {
          await renegotiateAudioWithPeer(peerId)
        }
        return
      }

      if (pc && pc.signalingState !== "stable") {
        if (pc.signalingState === "have-local-offer" && pc.localDescription) {
          if (peerHasLiveOutgoingAudio(pc)) {
            sendOfferToPeer(peerId, pc)
          } else {
            await ensureLocalTracksOnPeer(peerId, pc)
            if (peerHasLiveOutgoingAudio(pc)) {
              await renegotiateAudioWithPeer(peerId)
            }
          }
        }
        return
      }

      if (pc && pc.signalingState === "stable" && pc.currentRemoteDescription && !isPeerNegotiationSettled(pc)) {
        resetPeerConnection(peerId)
        pc = undefined
      }

      pc = pc ?? createPeerConnection(peerId)
      await ensureLocalTracksOnPeer(peerId, pc)

      if (pc.signalingState === "have-local-offer" && pc.localDescription) {
        sendOfferToPeer(peerId, pc)
        return
      }

      if (pc.signalingState !== "stable") {
        return
      }

      try {
        makingOffer.current.set(peerId, true)
        const offer = await pc.createOffer({ offerToReceiveAudio: true })
        const normalized = normalizeSessionDescription(offer)
        if (!normalized) {
          return
        }
        await pc.setLocalDescription(normalized)
        sendOfferToPeer(peerId, pc)
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to create offer:", error)
        resetPeerConnection(peerId)
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [
      createPeerConnection,
      ensureLocalTracksOnPeer,
      isCaller,
      isGroupCall,
      renegotiateAudioWithPeer,
      resetPeerConnection,
      sendOfferToPeer,
      userIdStr,
    ],
  )

  const handleSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (callEnded.current) {
        return
      }

      const normalized = normalizeWebRtcSignal(signal)
      const dedupeKey = webRtcSignalKey(normalized)
      if (processedSignals.current.has(dedupeKey)) {
        return
      }
      processedSignals.current.add(dedupeKey)

      if (normalized.type === "offer-request") {
        if (normalized.to !== userIdStr) {
          return
        }
        if (isGroupCall && !isCaller) {
          return
        }
        const from = normalized.from
        const existing = peerConnections.current.get(from)
        if (existing && isPeerNegotiationSettled(existing)) {
          if (!peerHasLiveOutgoingAudio(existing) || !peerHasLiveIncomingAudio(existing)) {
            await renegotiateAudioWithPeer(from)
          }
          return
        }
        await createOfferForPeer(from)
        return
      }

      if (normalized.to !== userIdStr) {
        return
      }

      const from = normalized.from
      if (isGroupCall && !isCaller && from !== String(callerId)) {
        return
      }
      let pc = peerConnections.current.get(from)
      if (!pc) {
        pc = createPeerConnection(from)
      }

      if (normalized.type === "answer" && isPeerNegotiationSettled(pc) && pc.signalingState === "stable") {
        return
      }

      if (
        normalized.type === "offer" &&
        isPeerNegotiationSettled(pc) &&
        peerAudioIsFullyNegotiated(pc)
      ) {
        return
      }

      try {
        switch (normalized.type) {
          case "offer": {
            const isPolite = Number(userIdStr) > Number(from)
            const offerCollision = pc.signalingState !== "stable" || makingOffer.current.get(from)
            ignoreOffer.current.set(from, !isPolite && Boolean(offerCollision))
            if (ignoreOffer.current.get(from)) {
              return
            }

            const remoteOffer = normalizeSessionDescription(normalized.offer)
            if (!remoteOffer) {
              return
            }

            await ensureLocalTracksOnPeer(from, pc)

            if (pc.signalingState === "have-local-offer") {
              await pc.setLocalDescription({ type: "rollback" })
            }

            await pc.setRemoteDescription(remoteOffer)
            const pending = pendingCandidates.current.get(from) ?? []
            for (const candidate of pending) {
              await pc.addIceCandidate(candidate).catch(() => {})
            }
            pendingCandidates.current.delete(from)

            const answer = await pc.createAnswer()
            const normalizedAnswer = normalizeSessionDescription(answer)
            if (!normalizedAnswer) {
              return
            }
            await pc.setLocalDescription(normalizedAnswer)
            sendSignal({
              type: "answer",
              answer: normalizeSessionDescription(pc.localDescription ?? undefined) ?? normalizedAnswer,
              from: userIdStr,
              to: from,
            })
            pushRemoteStreamFromPeer(from, pc)
            break
          }
          case "answer": {
            const remoteAnswer = normalizeSessionDescription(normalized.answer)
            if (!remoteAnswer) {
              return
            }
            if (pc.signalingState !== "have-local-offer") {
              return
            }
            await pc.setRemoteDescription(remoteAnswer)
            const pending = pendingCandidates.current.get(from) ?? []
            for (const candidate of pending) {
              await pc.addIceCandidate(candidate).catch(() => {})
            }
            pendingCandidates.current.delete(from)
            pushRemoteStreamFromPeer(from, pc)
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
        if (normalized.type === "offer" || normalized.type === "answer") {
          resetPeerConnection(from)
        }
        processedSignals.current.delete(dedupeKey)
      }

      updateMediaConnected()
    },
    [
      callerId,
      createOfferForPeer,
      createPeerConnection,
      ensureLocalTracksOnPeer,
      isCaller,
      isGroupCall,
      pushRemoteStreamFromPeer,
      renegotiateAudioWithPeer,
      resetPeerConnection,
      sendSignal,
      updateMediaConnected,
      userIdStr,
    ],
  )

  handleSignalRef.current = handleSignal

  const enqueueOrHandleSignal = useCallback((signal: WebRTCSignal) => {
    if (!mediaStarted.current || !localStreamRef.current) {
      pendingSignals.current.push(signal)
      return
    }
    handleSignalChain.current = handleSignalChain.current
      .then(() => handleSignalRef.current(normalizeWebRtcSignal(signal)))
      .catch((error) => {
        console.error("[UnityCallWebRTC] Queued signal failed:", error)
      })
  }, [])

  const flushPendingSignals = useCallback(() => {
    if (!mediaStarted.current || !localStreamRef.current) {
      return
    }
    const queued = [...pendingSignals.current]
    pendingSignals.current = []
    queued.forEach((signal) => {
      enqueueOrHandleSignal(signal)
    })
  }, [enqueueOrHandleSignal])

  flushPendingSignalsRef.current = flushPendingSignals

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
      const signals = body.signals ?? []
      for (const signal of signals) {
        enqueueOrHandleSignal(signal)
      }
    } catch (error) {
      console.error("[UnityCallWebRTC] Failed to fetch pending signals:", error)
    }
  }, [callId, enqueueOrHandleSignal])

  fetchPendingSignalsRef.current = fetchPendingSignals

  const connectToAcceptedPeers = useCallback(() => {
    if (callEnded.current || !channelReady.current || !mediaStarted.current || !localStreamRef.current) {
      return
    }

    const peers = acceptedPeerIds()
    if (peers.length === 0) {
      updateMediaConnected()
      return
    }

    peers.forEach((peerId) => {
      const pc = peerConnections.current.get(peerId)

      if (pc && isPeerNegotiationSettled(pc)) {
        if (hostInitiatesWebRtc(peerId) && !peerHasLiveOutgoingAudio(pc)) {
          void renegotiateAudioWithPeer(peerId)
        } else if (!peerHasLiveIncomingAudio(pc) && shouldRequestOfferFromPeer(peerId)) {
          if (!offerRequestSent.current.has(peerId)) {
            offerRequestSent.current.add(peerId)
            sendSignal({
              type: "offer-request",
              from: userIdStr,
              to: peerId,
            })
          }
        }
        return
      }

      if (hostInitiatesWebRtc(peerId)) {
        void createOfferForPeer(peerId)
        return
      }

      if (!pc || (pc.signalingState === "stable" && !pc.currentRemoteDescription)) {
        offerRequestSent.current.delete(peerId)
      }

      if (shouldRequestOfferFromPeer(peerId) && !offerRequestSent.current.has(peerId)) {
        offerRequestSent.current.add(peerId)
        sendSignal({
          type: "offer-request",
          from: userIdStr,
          to: peerId,
        })
      }
    })

    updateMediaConnected()
  }, [
    acceptedPeerIds,
    createOfferForPeer,
    hostInitiatesWebRtc,
    renegotiateAudioWithPeer,
    sendSignal,
    shouldRequestOfferFromPeer,
    updateMediaConnected,
    userIdStr,
  ])

  tryConnectRef.current = connectToAcceptedPeers

  const stopMedia = useCallback(() => {
    callEnded.current = true
    mediaStarted.current = false
    channelReady.current = false
    pendingSignals.current = []
    processedSignals.current.clear()
    offerRequestSent.current.clear()
    handleSignalChain.current = Promise.resolve()

    peerConnections.current.forEach((pc) => pc.close())
    peerConnections.current.clear()
    pendingCandidates.current.clear()
    makingOffer.current.clear()
    ignoreOffer.current.clear()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    setLocalStream(null)
    setRemoteStreams([])
    setMediaConnected(false)
    setConnectionStatus("idle")
    setPermissionStatus("idle")

    echo().leave(`unity-call.${callId}`)
  }, [callId])

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
      attachLocalTracks(stream)
      setPermissionStatus("granted")
      setConnectionStatus(channelReady.current ? "Connecting audio…" : "Joining call channel…")

      peerConnections.current.forEach((pc, peerId) => {
        if (isPeerNegotiationSettled(pc) && !peerHasLiveOutgoingAudio(pc)) {
          void renegotiateAudioWithPeer(peerId)
        }
      })

      flushPendingSignalsRef.current()
      void fetchPendingSignalsRef.current()
      connectToAcceptedPeers()
    } catch (error) {
      mediaStarted.current = false
      const denied = error instanceof DOMException && error.name === "NotAllowedError"
      setPermissionStatus(denied ? "denied" : "prompt")
      setConnectionStatus(denied ? "Microphone access blocked" : "Could not access microphone")
    }
  }, [attachLocalTracks, connectToAcceptedPeers, mediaActive, renegotiateAudioWithPeer])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) {
      return
    }
    const track = stream.getAudioTracks()[0]
    if (!track) {
      return
    }
    const nextEnabled = !track.enabled
    stream.getAudioTracks().forEach((audioTrack) => {
      audioTrack.enabled = nextEnabled
    })
    setIsAudioEnabled(nextEnabled)
  }, [])

  const retryPermission = useCallback(() => {
    mediaStarted.current = false
    callEnded.current = false
    void startMedia()
  }, [startMedia])

  useEffect(() => {
    if (!callId || callEnded.current) {
      return
    }

    const channel = echo().private(`unity-call.${callId}`) as unknown as ChannelWithListen

    channel.listen(".webrtc.signal", (payload) => {
      enqueueOrHandleSignal(payload as WebRTCSignal)
    })

    channel.listen(".call.session.status", (payload) => {
      const statusPayload = payload as UnityCallStatusPayload
      if (
        statusPayload.call?.id === callId &&
        ["cancelled", "ended", "declined", "missed"].includes(statusPayload.reason)
      ) {
        stopMedia()
      }
    })

    channel
      .subscribed(() => {
        channelReady.current = true
        setConnectionStatus((prev) =>
          prev === "Joining call channel…" || prev === "idle" ? "Connecting audio…" : prev,
        )
        void fetchPendingSignalsRef.current().finally(() => {
          tryConnectRef.current()
        })
      })
      .error((error) => {
        console.error("[UnityCallWebRTC] Channel subscription failed:", error)
        setConnectionStatus("Could not join call channel")
      })

    return () => {
      channel.stopListening?.(".webrtc.signal")
      channel.stopListening?.(".call.session.status")
      echo().leave(`unity-call.${callId}`)
      channelReady.current = false
    }
  }, [callId, enqueueOrHandleSignal, stopMedia])

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
    connectToAcceptedPeers()
  }, [connectToAcceptedPeers, mediaActive, participants, callStatus])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || mediaConnected) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (mediaConnected || callEnded.current) {
        return
      }
      const peers = acceptedPeerIds()
      const allSettled = peers.every((peerId) => {
        const pc = peerConnections.current.get(peerId)
        return pc ? isPeerNegotiationSettled(pc) : false
      })
      if (allSettled) {
        return
      }
      connectToAcceptedPeers()
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [connectToAcceptedPeers, mediaActive, mediaConnected, callStatus])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || callEnded.current) {
      return
    }

    const intervalId = window.setInterval(() => {
      const peers = acceptedPeerIds()
      peers.forEach((peerId) => {
        const pc = peerConnections.current.get(peerId)
        if (!pc || !isPeerConnected(pc)) {
          return
        }
        if (hostInitiatesWebRtc(peerId) && !peerHasLiveOutgoingAudio(pc)) {
          void renegotiateAudioWithPeer(peerId)
        } else if (!peerHasLiveIncomingAudio(pc) && shouldRequestOfferFromPeer(peerId)) {
          offerRequestSent.current.delete(peerId)
          connectToAcceptedPeers()
        }
      })
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [
    acceptedPeerIds,
    connectToAcceptedPeers,
    hostInitiatesWebRtc,
    mediaActive,
    renegotiateAudioWithPeer,
    shouldRequestOfferFromPeer,
  ])

  useEffect(() => {
    return subscribeUnityCallTerminated((payload) => {
      if (payload.call.id === callId) {
        stopMedia()
      }
    })
  }, [callId, stopMedia])

  useEffect(() => {
    return () => {
      stopMedia()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tear down only when leaving this call
  }, [callId])

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
  }
}
