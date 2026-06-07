"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { echo } from "@laravel/echo-react"
import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"
import { subscribeUnityCallTerminated } from "@/lib/unityCallEvents"

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
  listen: (event: string, callback: (payload: WebRTCSignal) => void) => ChannelWithListen
  subscribed: (callback: () => void) => ChannelWithListen
  error: (callback: (error: unknown) => void) => ChannelWithListen
  stopListening?: (event: string) => void
}

const MAX_GROUP_HOST_PEERS = 32

type UseUnityCallWebRTCOptions = {
  callId: number
  userId: number
  isCaller: boolean
  isGroupCall: boolean
  callerId: number
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
    bundlePolicy: "max-bundle",
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

export function useUnityCallWebRTC({
  callId,
  userId,
  isCaller,
  isGroupCall,
  callerId,
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

  useEffect(() => {
    rtcConfiguration.current = buildRtcConfiguration(iceServers)
  }, [iceServers])

  const remoteStreamsRef = useRef<UnityCallRemoteStream[]>([])

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams
  }, [remoteStreams])

  const acceptedPeerIds = useCallback((): string[] => {
    if (isGroupCall) {
      const hubId = String(callerId)
      if (!isCaller) {
        return hubId !== userIdStr ? [hubId] : []
      }

      return participants
        .filter((p) => p.userId !== userId && p.role === "callee" && p.status === "accepted")
        .map((p) => String(p.userId))
        .slice(0, MAX_GROUP_HOST_PEERS)
    }

    return participants
      .filter((p) => p.userId !== userId && p.status === "accepted")
      .map((p) => String(p.userId))
  }, [participants, userId, userIdStr, isGroupCall, isCaller, callerId])

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
    setMediaConnected(readyCount >= expectedPeers.length)
    if (readyCount >= expectedPeers.length) {
      setConnectionStatus("Connected")
    } else if (readyCount > 0) {
      setConnectionStatus(`Connected to ${readyCount}/${expectedPeers.length}`)
    } else {
      setConnectionStatus("Connecting audio…")
    }
  }, [acceptedPeerIds, isCaller])

  const sendSignal = useCallback(
    (signal: WebRTCSignal) => {
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
        body: JSON.stringify(signal),
      }).catch((error) => {
        console.error("[UnityCallWebRTC] Failed to send signal:", error)
      })
    },
    [callId],
  )

  const attachLocalTracks = useCallback((stream: MediaStream) => {
    peerConnections.current.forEach((pc) => {
      stream.getTracks().forEach((track) => {
        const hasTrack = pc.getSenders().some((sender) => sender.track?.kind === track.kind)
        if (!hasTrack) {
          pc.addTrack(track, stream)
        }
      })
    })
  }, [])

  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peerConnections.current.get(peerId)
      if (existing) {
        return existing
      }

      const pc = new RTCPeerConnection(rtcConfiguration.current)
      makingOffer.current.set(peerId, false)
      ignoreOffer.current.set(peerId, false)

      const stream = localStreamRef.current

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        if (!remoteStream) {
          return
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
        }
        updateMediaConnected()
      }

      pc.oniceconnectionstatechange = () => {
        updateMediaConnected()
      }

      peerConnections.current.set(peerId, pc)

      if (stream) {
        stream.getTracks().forEach((track) => {
          if (!pc.getSenders().some((sender) => sender.track?.kind === track.kind)) {
            pc.addTrack(track, stream)
          }
        })
      }

      return pc
    },
    [sendSignal, updateMediaConnected, userIdStr],
  )

  const sendOfferToPeer = useCallback(
    (peerId: string, pc: RTCPeerConnection) => {
      const description = pc.localDescription
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

  const createOfferForPeer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || peerId === userIdStr || !localStreamRef.current) {
        return
      }

      const pc = createPeerConnection(peerId)

      if (pc.signalingState === "have-local-offer" && pc.localDescription) {
        sendOfferToPeer(peerId, pc)
        return
      }

      if (pc.signalingState !== "stable") {
        return
      }

      try {
        makingOffer.current.set(peerId, true)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendOfferToPeer(peerId, pc)
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to create offer:", error)
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [createPeerConnection, sendOfferToPeer, userIdStr],
  )

  const handleSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (callEnded.current) {
        return
      }

      if (signal.type === "offer-request") {
        if (signal.to !== userIdStr) {
          return
        }
        const from = signal.from
        const pc = peerConnections.current.get(from) ?? createPeerConnection(from)
        if (pc.localDescription && pc.signalingState === "have-local-offer") {
          sendOfferToPeer(from, pc)
        } else {
          await createOfferForPeer(from)
        }
        return
      }

      if (signal.to !== userIdStr) {
        return
      }

      const from = signal.from
      let pc = peerConnections.current.get(from)
      if (!pc) {
        pc = createPeerConnection(from)
      }

      switch (signal.type) {
        case "offer": {
          const isPolite = Number(userIdStr) > Number(from)
          const offerCollision = pc.signalingState !== "stable" || makingOffer.current.get(from)
          ignoreOffer.current.set(from, !isPolite && Boolean(offerCollision))
          if (ignoreOffer.current.get(from) || !signal.offer) {
            return
          }

          if (pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" })
          }

          await pc.setRemoteDescription(signal.offer)
          const pending = pendingCandidates.current.get(from) ?? []
          for (const candidate of pending) {
            await pc.addIceCandidate(candidate).catch(() => {})
          }
          pendingCandidates.current.delete(from)

          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          sendSignal({
            type: "answer",
            answer: pc.localDescription ?? answer,
            from: userIdStr,
            to: from,
          })
          break
        }
        case "answer": {
          if (!signal.answer) {
            return
          }
          await pc.setRemoteDescription(signal.answer)
          const pending = pendingCandidates.current.get(from) ?? []
          for (const candidate of pending) {
            await pc.addIceCandidate(candidate).catch(() => {})
          }
          pendingCandidates.current.delete(from)
          break
        }
        case "ice-candidate": {
          if (!signal.candidate) {
            return
          }
          if (pc.remoteDescription?.type) {
            await pc.addIceCandidate(signal.candidate).catch(() => {})
          } else {
            const pending = pendingCandidates.current.get(from) ?? []
            pending.push(signal.candidate)
            pendingCandidates.current.set(from, pending)
          }
          break
        }
      }

      updateMediaConnected()
    },
    [createOfferForPeer, createPeerConnection, sendOfferToPeer, sendSignal, updateMediaConnected, userIdStr],
  )

  handleSignalRef.current = handleSignal

  const enqueueOrHandleSignal = useCallback((signal: WebRTCSignal) => {
    if (!mediaStarted.current || !localStreamRef.current) {
      pendingSignals.current.push(signal)
      return
    }
    void handleSignalRef.current(signal)
  }, [])

  const flushPendingSignals = useCallback(() => {
    if (!mediaStarted.current || !localStreamRef.current) {
      return
    }
    const queued = [...pendingSignals.current]
    pendingSignals.current = []
    queued.forEach((signal) => {
      void handleSignalRef.current(signal)
    })
  }, [])

  flushPendingSignalsRef.current = flushPendingSignals

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
      if (Number(userIdStr) < Number(peerId)) {
        void createOfferForPeer(peerId)
      } else {
        sendSignal({
          type: "offer-request",
          from: userIdStr,
          to: peerId,
        })
      }
    })

    updateMediaConnected()
  }, [acceptedPeerIds, createOfferForPeer, sendSignal, updateMediaConnected, userIdStr])

  tryConnectRef.current = connectToAcceptedPeers

  const stopMedia = useCallback(() => {
    callEnded.current = true
    mediaStarted.current = false
    channelReady.current = false
    pendingSignals.current = []

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
      localStreamRef.current = stream
      setLocalStream(stream)
      attachLocalTracks(stream)
      setPermissionStatus("granted")
      setConnectionStatus(channelReady.current ? "Connecting audio…" : "Joining call channel…")

      flushPendingSignalsRef.current()
      connectToAcceptedPeers()
    } catch (error) {
      mediaStarted.current = false
      const denied = error instanceof DOMException && error.name === "NotAllowedError"
      setPermissionStatus(denied ? "denied" : "prompt")
      setConnectionStatus(denied ? "Microphone access blocked" : "Could not access microphone")
    }
  }, [attachLocalTracks, connectToAcceptedPeers, mediaActive])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) {
      return
    }
    const enabled = !stream.getAudioTracks()[0]?.enabled
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
    setIsAudioEnabled(enabled)
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
      enqueueOrHandleSignal(payload)
    })

    channel
      .subscribed(() => {
        channelReady.current = true
        setConnectionStatus((prev) =>
          prev === "Joining call channel…" || prev === "idle" ? "Connecting audio…" : prev,
        )
        tryConnectRef.current()
      })
      .error((error) => {
        console.error("[UnityCallWebRTC] Channel subscription failed:", error)
        setConnectionStatus("Could not join call channel")
      })

    return () => {
      channel.stopListening?.(".webrtc.signal")
      echo().leave(`unity-call.${callId}`)
      channelReady.current = false
    }
  }, [callId, enqueueOrHandleSignal])

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
  }, [connectToAcceptedPeers, mediaActive, participants])

  useEffect(() => {
    if (!mediaActive || !mediaStarted.current || mediaConnected) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (mediaConnected || callEnded.current) {
        return
      }
      connectToAcceptedPeers()
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [connectToAcceptedPeers, mediaActive, mediaConnected])

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
  }, [stopMedia])

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
