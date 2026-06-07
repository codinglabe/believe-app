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
  type: "offer" | "answer" | "ice-candidate"
  from: string
  to: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

type ChannelWithWhisper = {
  listenForWhisper: (event: string, callback: (payload: WebRTCSignal) => void) => void
  whisper: (event: string, payload: WebRTCSignal) => void
  stopListening?: (event: string) => void
}

type UseUnityCallWebRTCOptions = {
  callId: number
  userId: number
  isCaller: boolean
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

export function useUnityCallWebRTC({
  callId,
  userId,
  isCaller,
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
  const channelRef = useRef<ChannelWithWhisper | null>(null)
  const callEnded = useRef(false)
  const mediaStarted = useRef(false)
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const makingOffer = useRef<Map<string, boolean>>(new Map())
  const ignoreOffer = useRef<Map<string, boolean>>(new Map())
  const rtcConfiguration = useRef(buildRtcConfiguration(iceServers))

  useEffect(() => {
    rtcConfiguration.current = buildRtcConfiguration(iceServers)
  }, [iceServers])

  const updateMediaConnected = useCallback(() => {
    const connectedCount = Array.from(peerConnections.current.values()).filter(
      (pc) => pc.connectionState === "connected",
    ).length

    const expectedPeers = participants.filter(
      (p) => p.userId !== userId && p.status === "accepted",
    ).length

    if (expectedPeers === 0) {
      setMediaConnected(false)
      setConnectionStatus(isCaller ? "Waiting for someone to answer…" : "Waiting for caller…")
      return
    }

    setMediaConnected(expectedPeers > 0 && connectedCount >= expectedPeers)
    if (connectedCount >= expectedPeers) {
      setConnectionStatus("Connected")
    } else if (connectedCount > 0) {
      setConnectionStatus(`Connected to ${connectedCount}/${expectedPeers}`)
    } else {
      setConnectionStatus("Connecting audio…")
    }
  }, [participants, userId, isCaller])

  const sendSignal = useCallback((signal: WebRTCSignal) => {
    if (!channelRef.current) {
      return
    }
    try {
      channelRef.current.whisper("webrtc-signal", signal)
    } catch (error) {
      console.error("[UnityCallWebRTC] Failed to send signal:", error)
    }
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
      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })
      }

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
          pc.close()
          peerConnections.current.delete(peerId)
          setRemoteStreams((prev) => prev.filter((item) => item.peerId !== peerId))
        }
        updateMediaConnected()
      }

      peerConnections.current.set(peerId, pc)
      return pc
    },
    [sendSignal, updateMediaConnected, userIdStr],
  )

  const createOfferForPeer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || peerId === userIdStr) {
        return
      }

      const pc = createPeerConnection(peerId)
      if (pc.signalingState !== "stable") {
        return
      }

      try {
        makingOffer.current.set(peerId, true)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal({
          type: "offer",
          offer: pc.localDescription ?? offer,
          from: userIdStr,
          to: peerId,
        })
      } catch (error) {
        console.error("[UnityCallWebRTC] Failed to create offer:", error)
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [createPeerConnection, sendSignal, userIdStr],
  )

  const handleSignal = useCallback(
    async (signal: WebRTCSignal) => {
      if (callEnded.current || signal.to !== userIdStr) {
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
    [createPeerConnection, sendSignal, updateMediaConnected, userIdStr],
  )

  const connectToAcceptedPeers = useCallback(() => {
    if (!isCaller || callEnded.current) {
      return
    }

    participants
      .filter((p) => p.userId !== userId && p.status === "accepted")
      .forEach((p) => {
        void createOfferForPeer(String(p.userId))
      })
  }, [createOfferForPeer, isCaller, participants, userId])

  const stopMedia = useCallback(() => {
    callEnded.current = true
    mediaStarted.current = false

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

    const channel = channelRef.current as ChannelWithWhisper & { stopListeningForWhisper?: (event: string) => void }
    channel?.stopListeningForWhisper?.("webrtc-signal")
    echo().leave(`unity-call.${callId}`)
    channelRef.current = null
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
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
      setLocalStream(stream)
      setPermissionStatus("granted")
      setConnectionStatus("Joining call channel…")

      const channel = echo().private(`unity-call.${callId}`) as unknown as ChannelWithWhisper
      channelRef.current = channel
      channel.listenForWhisper("webrtc-signal", (payload) => {
        void handleSignal(payload)
      })

      setConnectionStatus("Connecting audio…")
      connectToAcceptedPeers()
      updateMediaConnected()
    } catch (error) {
      mediaStarted.current = false
      const denied = error instanceof DOMException && error.name === "NotAllowedError"
      setPermissionStatus(denied ? "denied" : "prompt")
      setConnectionStatus(denied ? "Microphone access blocked" : "Could not access microphone")
    }
  }, [callId, connectToAcceptedPeers, handleSignal, mediaActive, updateMediaConnected])

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
    updateMediaConnected()
  }, [connectToAcceptedPeers, mediaActive, participants, updateMediaConnected])

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
