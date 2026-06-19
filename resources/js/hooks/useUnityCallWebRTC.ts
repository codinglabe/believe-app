"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { echo } from "@laravel/echo-react"
import type { UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"
import { subscribeUnityCallTerminated } from "@/lib/unityCallEvents"
import { invalidateAudioOutputCache } from "@/lib/callAudioOutput"
import { normalizeSessionDescription, normalizeWebRtcSignal, webRtcSignalKey, buildUnityCallRtcConfiguration } from "@/lib/unityCallWebRTC"

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
  /** Keep WebRTC alive when the call UI unmounts (background / minimized call). */
  keepAlive?: boolean
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
  return (
    stream?.getAudioTracks().some((track) => track.readyState === "live" && track.enabled) ?? false
  )
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
}: UseUnityCallWebRTCOptions) {
  const userIdStr = String(userId)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<UnityCallRemoteStream[]>([])
  const [mediaConnected, setMediaConnected] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState<UnityCallMediaPermission>("idle")
  const [connectionStatus, setConnectionStatus] = useState("idle")

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

  useEffect(() => {
    rtcConfiguration.current = buildRtcConfiguration(iceServers)
  }, [iceServers])

  const acceptedPeerIds = useCallback((): string[] => {
    const hubId = String(callerId)

    if (!isGroupCall) {
      if (!isCaller) {
        return hubId !== userIdStr ? [hubId] : []
      }

      return participants
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

    return participants
      .filter((p) => p.userId !== userId && p.role === "callee" && p.status === "accepted")
      .map((p) => String(p.userId))
      .slice(0, MAX_GROUP_HOST_PEERS)
  }, [participants, userId, userIdStr, isGroupCall, isCaller, callerId])

  const updateMediaConnected = useCallback(() => {
    const expectedPeers = acceptedPeerIds()
    if (expectedPeers.length === 0) {
      setMediaConnected(false)
      setConnectionStatus(isCaller ? "Waiting for someone to answer…" : "Waiting for caller…")
      return
    }

    const remoteForPeer = (peerId: string) =>
      remoteStreamsRef.current.find((item) => item.peerId === peerId)?.stream

    const peersWithAudio = expectedPeers.filter((peerId) => hasLiveAudioTrack(remoteForPeer(peerId))).length

    const connectedCount = expectedPeers.filter((peerId) => {
      const pc = peerConnections.current.get(peerId)
      if (!pc) {
        return hasLiveAudioTrack(remoteForPeer(peerId))
      }
      if (isPeerConnected(pc)) {
        return true
      }
      return hasLiveAudioTrack(remoteForPeer(peerId)) && Boolean(pc.remoteDescription)
    }).length

    const ready = peersWithAudio >= expectedPeers.length || connectedCount >= expectedPeers.length

    setMediaConnected(ready)
    if (ready) {
      setConnectionStatus("Connected")
      return
    }

    if (peersWithAudio > 0) {
      setConnectionStatus(
        expectedPeers.length === 1 ? "Connected" : `Audio live · ${peersWithAudio}/${expectedPeers.length}`,
      )
      setMediaConnected(true)
      return
    }

    const negotiating = expectedPeers.some((peerId) => {
      const pc = peerConnections.current.get(peerId)
      return pc && isPeerNegotiating(pc) && pc.localDescription && pc.remoteDescription
    })

    setConnectionStatus(
      negotiating
        ? "Almost connected…"
        : connectedCount > 0
          ? `Connected to ${connectedCount}/${expectedPeers.length}`
          : "Connecting audio…",
    )
  }, [acceptedPeerIds, isCaller])

  useEffect(() => {
    remoteStreamsRef.current = remoteStreams
    updateMediaConnected()
  }, [remoteStreams, updateMediaConnected])

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

  const getOutgoingTrack = useCallback(
    (peerId: string): MediaStreamTrack | null => {
      const source = localStreamRef.current?.getAudioTracks()[0] ?? null
      if (!source) {
        return null
      }

      source.enabled = true

      if (!isCaller || !isGroupCall) {
        return source
      }

      let cloned = outboundTracksRef.current.get(peerId)
      if (!cloned || cloned.readyState !== "live") {
        cloned?.stop()
        cloned = source.clone()
        outboundTracksRef.current.set(peerId, cloned)
      }
      cloned.enabled = source.enabled
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

      const sender = pc.getSenders().find((item) => item.track?.kind === "audio")
      if (sender) {
        if (sender.track?.id !== track.id) {
          await sender.replaceTrack(track)
        }
        return true
      }

      const stream = localStreamRef.current ?? new MediaStream([track])
      pc.addTrack(track, stream)
      return true
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
    const cloned = outboundTracksRef.current.get(peerId)
    if (cloned) {
      cloned.stop()
      outboundTracksRef.current.delete(peerId)
    }
    setRemoteStreams((prev) => prev.filter((item) => item.peerId !== peerId))
  }, [])

  const registerRemoteTrack = useCallback(
    (peerId: string, track: MediaStreamTrack) => {
      if (track.kind !== "audio" || track.readyState === "ended") {
        return
      }

      track.enabled = true
      setRemoteStreams((prev) => {
        const existing = prev.find((item) => item.peerId === peerId)
        if (existing) {
          if (!existing.stream.getTracks().some((item) => item.id === track.id)) {
            existing.stream.addTrack(track)
          }
          return [...prev]
        }
        return [...prev, { peerId, stream: new MediaStream([track]) }]
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

      if (localStreamRef.current) {
        void addLocalAudioToPeer(peerId, pc)
      }

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

        track.onunmute = () => registerRemoteTrack(peerId, track)
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
        updateMediaConnected()
      }

      pc.oniceconnectionstatechange = () => {
        updateMediaConnected()
      }

      peerConnections.current.set(peerId, pc)
      return pc
    },
    [addLocalAudioToPeer, registerRemoteTrack, resetPeerConnection, sendSignal, updateMediaConnected, userIdStr],
  )

  const createHostOffer = useCallback(
    async (peerId: string) => {
      if (callEnded.current || !isCaller || !localStreamRef.current || peerId === userIdStr) {
        return
      }

      makingOffer.current.set(peerId, true)
      try {
        let pc = peerConnections.current.get(peerId)
        if (!pc) {
          pc = createPeerConnection(peerId)
        }

        const attached = await addLocalAudioToPeer(peerId, pc)
        if (!attached || !hasAudioSender(pc)) {
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

        if (pc.signalingState !== "stable") {
          return
        }

        const offer = await pc.createOffer({ offerToReceiveAudio: true })
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
        resetPeerConnection(peerId)
      } finally {
        makingOffer.current.set(peerId, false)
      }
    },
    [addLocalAudioToPeer, createPeerConnection, isCaller, resetPeerConnection, sendSignal, userIdStr],
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

      const pc = peerConnections.current.get(peerId) ?? createPeerConnection(peerId)
      if (pc.signalingState !== "stable" || pc.remoteDescription || pc.localDescription) {
        return
      }

      makingOffer.current.set(peerId, true)
      try {
        const attached = await addLocalAudioToPeer(peerId, pc)
        if (!attached || !hasAudioSender(pc)) {
          return
        }

        const offer = await pc.createOffer({ offerToReceiveAudio: true })
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
        if (existing && isPeerConnected(existing)) {
          return
        }

        if (!existing || existing.signalingState === "closed") {
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
      if (!pc) {
        pc = createPeerConnection(from)
      }

      try {
        switch (normalized.type) {
          case "offer": {
            const isPolite = Number(userIdStr) > Number(from)
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
            break
          }
          case "answer": {
            const remoteAnswer = normalizeSessionDescription(normalized.answer)
            if (!remoteAnswer || pc.signalingState !== "have-local-offer") {
              return
            }
            await pc.setRemoteDescription(remoteAnswer)
            const pending = pendingCandidates.current.get(from) ?? []
            for (const candidate of pending) {
              await pc.addIceCandidate(candidate).catch(() => {})
            }
            pendingCandidates.current.delete(from)
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
          resetPeerConnection(from)
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
    if (callEnded.current || !channelReady.current || !mediaStarted.current || !localStreamRef.current) {
      return
    }

    const peers = acceptedPeerIds()
    peers.forEach((peerId) => {
      createPeerConnection(peerId)
      if (isCaller) {
        void createHostOffer(peerId)
      } else if (!offerRequestSentFor.current.has(peerId)) {
        offerRequestSentFor.current.add(peerId)
        sendSignal({
          type: "offer-request",
          from: userIdStr,
          to: peerId,
        })
      }
    })

    updateMediaConnected()
  }, [acceptedPeerIds, createHostOffer, createPeerConnection, isCaller, sendSignal, updateMediaConnected, userIdStr])

  const stopMedia = useCallback(() => {
    callEnded.current = true
    mediaStarted.current = false
    channelReady.current = false
    pendingSignals.current = []
    processedSignals.current.clear()
    offerRequestSentFor.current.clear()
    handleSignalChain.current = Promise.resolve()

    peerConnections.current.forEach((pc) => pc.close())
    peerConnections.current.clear()
    pendingCandidates.current.clear()
    makingOffer.current.clear()
    ignoreOffer.current.clear()

    outboundTracksRef.current.forEach((track) => track.stop())
    outboundTracksRef.current.clear()

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
  }, [addLocalAudioToPeer, connectPeers, fetchPendingSignals, flushPendingSignals, mediaActive])

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
    outboundTracksRef.current.forEach((clonedTrack) => {
      clonedTrack.enabled = nextEnabled
    })
    setIsAudioEnabled(nextEnabled)
  }, [])

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

      const stream = localStreamRef.current
      stream?.getAudioTracks().forEach((track) => {
        if (track.readyState === "live") {
          track.enabled = track.enabled
        }
      })

      if (document.visibilityState === "visible") {
        void fetchPendingSignalsRef.current().finally(() => {
          syncPeerConnectionsRef.current()
          updateMediaConnectedRef.current()
        })
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [callId, keepAlive])

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
          syncPeerConnectionsRef.current()
        })
      }
    })

    channel
      .subscribed(() => {
        channelReady.current = true
        setConnectionStatus((prev) =>
          prev === "Joining call channel…" || prev === "idle" ? "Connecting audio…" : prev,
        )
        void fetchPendingSignalsRef.current().finally(() => {
          connectPeersRef.current()
        })
      })
      .error((error) => {
        console.error("[UnityCallWebRTC] Channel subscription failed:", error)
        setConnectionStatus("Could not join call channel")
      })

    return () => {
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
          void createHostOffer(peerId)
        })
      }
    }, 1500)

    return () => window.clearInterval(intervalId)
  }, [acceptedPeerIds, createHostOffer, isCaller, mediaActive, mediaConnected])

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
      if (pc?.remoteDescription || pc?.localDescription) {
        return
      }
      void createDirectCalleeOffer(peerId)
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [callerId, createDirectCalleeOffer, isCaller, isGroupCall, mediaActive, mediaConnected])

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
  }
}
