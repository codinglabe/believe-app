"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import echoService from "@/Services/EchoService"

interface WebRTCHook {
  localStream: MediaStream | null
  remoteStreams: MediaStream[]
  screenStream: MediaStream | null
  isConnected: boolean
  connectionStatus: string
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  permissionStatus: string
  connectedPeers: string[]
  startCall: () => Promise<void>
  endCall: () => void
  toggleAudio: () => void
  toggleVideo: () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  requestPermissions: () => Promise<boolean>
}

export function useWebRTC(meetingId: string, userId: string, role: string): WebRTCHook {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([])
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState("prompt")
  const [connectedPeers, setConnectedPeers] = useState<string[]>([])

  // Refs for managing state
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null)
  const isInitialized = useRef(false)
  const callEnded = useRef(false)
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const makingOffer = useRef<Map<string, boolean>>(new Map())
  const ignoreOffer = useRef<Map<string, boolean>>(new Map())
  const isSettingRemoteAnswerPending = useRef<Map<string, boolean>>(new Map())

  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      // Google STUN servers
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      // Cloudflare STUN
      { urls: "stun:stun.cloudflare.com:3478" },
      // Mozilla STUN
      { urls: "stun:stun.services.mozilla.com" },
      // Add TURN servers for production (uncomment and configure)
      // {
      //   urls: "turn:your-turn-server.com:3478",
      //   username: "your-username",
      //   credential: "your-password"
      // }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  }

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    if (callEnded.current) return

    const totalPeers = peerConnections.current.size
    const connectedCount = Array.from(peerConnections.current.values()).filter(
      (pc) => pc.connectionState === "connected",
    ).length

    console.log(
      "[v0] updateConnectionStatus - isInitialized:",
      isInitialized.current,
      "totalPeers:",
      totalPeers,
      "connectedCount:",
      connectedCount,
    )

    setConnectedPeers(
      Array.from(peerConnections.current.entries())
        .filter(([_, pc]) => pc.connectionState === "connected")
        .map(([peerId, _]) => peerId),
    )

    if (!isInitialized.current) {
      setIsConnected(false)
      setConnectionStatus("Setting up connection...")
      console.log("[v0] Status: Setting up connection...")
    } else if (totalPeers === 0) {
      setIsConnected(true)
      setConnectionStatus("Waiting for participants...")
      console.log("[v0] Status: Waiting for participants...")
    } else if (connectedCount === totalPeers) {
      setIsConnected(true)
      setConnectionStatus("Connected to all participants")
      console.log("[v0] Status: Connected to all participants")
    } else if (connectedCount > 0) {
      setIsConnected(true)
      setConnectionStatus(`Connected to ${connectedCount}/${totalPeers} participants`)
      console.log("[v0] Status: Connected to some participants")
    } else {
      setIsConnected(false)
      setConnectionStatus("Connecting to participants...")
      console.log("[v0] Status: Connecting to participants...")
    }
  }, [])

  // Request media permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (callEnded.current) return false

    try {
      setPermissionStatus("requesting")
      setConnectionStatus("Requesting media permissions...")

      let stream: MediaStream
      try {
        // Try video + audio first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 15, max: 30 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        })
        console.log("✅ Video and audio permissions granted")
      } catch (videoError) {
        console.warn("⚠️ Video permission denied, trying audio only:", videoError)
        try {
          // Fallback to audio only
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })
          setIsVideoEnabled(false)
          console.log("✅ Audio-only permissions granted")
        } catch (audioError) {
          console.error("❌ All media permissions denied:", audioError)
          setPermissionStatus("denied")
          setConnectionStatus("Media permissions denied")
          return false
        }
      }

      setLocalStream(stream)
      setPermissionStatus("granted")
      setConnectionStatus("Media permissions granted")

      // Store original video track for screen sharing
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        originalVideoTrack.current = videoTrack
      }

      return true
    } catch (error) {
      console.error("❌ Failed to get media permissions:", error)
      setPermissionStatus("denied")
      setConnectionStatus("Failed to get media permissions")
      return false
    }
  }, [])

  // Create peer connection with perfect negotiation pattern
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      if (callEnded.current) {
        throw new Error("Call has ended")
      }

      console.log(`🔗 Creating peer connection for: ${peerId}`)

      // Close existing connection if any
      const existingPc = peerConnections.current.get(peerId)
      if (existingPc) {
        existingPc.close()
        peerConnections.current.delete(peerId)
      }

      const pc = new RTCPeerConnection(rtcConfiguration)

      // Initialize negotiation state
      makingOffer.current.set(peerId, false)
      ignoreOffer.current.set(peerId, false)
      isSettingRemoteAnswerPending.current.set(peerId, false)

      // Add local stream tracks
      if (localStream && !callEnded.current) {
        localStream.getTracks().forEach((track) => {
          console.log(`➕ Adding ${track.kind} track to peer ${peerId}`)
          pc.addTrack(track, localStream)
        })
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        if (callEnded.current) return

        console.log(`📺 Received ${event.track.kind} track from: ${peerId}`)
        const [remoteStream] = event.streams

        if (remoteStream) {
          setRemoteStreams((prev) => {
            const filtered = prev.filter((stream) => stream.id !== remoteStream.id)
            return [...filtered, remoteStream]
          })
          console.log(`📺 Added remote stream for peer: ${peerId}`)
        }
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (callEnded.current) return

        if (event.candidate) {
          console.log(`🧊 Sending ICE candidate to: ${peerId}`)
          echoService.sendWebRTCSignal(meetingId, {
            type: "ice-candidate",
            candidate: event.candidate,
            from: userId,
            to: peerId,
          })
        } else {
          console.log(`🧊 ICE gathering complete for peer: ${peerId}`)
        }
      }

      // Perfect negotiation pattern
      pc.onnegotiationneeded = async () => {
        if (callEnded.current) return

        try {
          console.log(`🤝 Negotiation needed with peer: ${peerId}`)
          makingOffer.current.set(peerId, true)

          await pc.setLocalDescription()
          console.log(`📤 Sending offer to peer: ${peerId}`)

          echoService.sendWebRTCSignal(meetingId, {
            type: "offer",
            offer: pc.localDescription,
            from: userId,
            to: peerId,
          })
        } catch (error) {
          console.error(`❌ Error in negotiation with peer ${peerId}:`, error)
        } finally {
          makingOffer.current.set(peerId, false)
        }
      }

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        if (callEnded.current) return

        console.log(`🔄 Peer ${peerId} connection state: ${pc.connectionState}`)

        switch (pc.connectionState) {
          case "connected":
            console.log(`✅ Peer ${peerId} connected successfully`)
            updateConnectionStatus()
            break
          case "connecting":
            console.log(`🔄 Connecting to peer: ${peerId}`)
            break
          case "disconnected":
            console.log(`⚠️ Peer ${peerId} disconnected`)
            updateConnectionStatus()
            break
          case "failed":
            console.log(`❌ Peer ${peerId} connection failed`)
            // Clean up failed connection
            pc.close()
            peerConnections.current.delete(peerId)
            setRemoteStreams((prev) => prev.filter((stream) => stream.id !== `remote-${peerId}`))
            updateConnectionStatus()
            break
          case "closed":
            console.log(`🔒 Peer ${peerId} connection closed`)
            updateConnectionStatus()
            break
        }
      }

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        if (callEnded.current) return

        console.log(`🧊 ICE connection state with ${peerId}: ${pc.iceConnectionState}`)

        if (pc.iceConnectionState === "failed") {
          console.log(`🔄 Restarting ICE for peer: ${peerId}`)
          pc.restartIce()
        }
      }

      peerConnections.current.set(peerId, pc)
      return pc
    },
    [localStream, meetingId, userId, updateConnectionStatus],
  )

  const handleWebRTCSignal = useCallback(
    async (signal: any) => {
      if (callEnded.current) return

      try {
        const { type, from, to, offer, answer, candidate } = signal

        // Only process signals meant for this user
        if (to !== userId) return

        console.log(`📨 Received ${type} from: ${from}`)

        let pc = peerConnections.current.get(from)
        if (!pc) {
          console.log(`🔗 Creating new peer connection for signal from: ${from}`)
          pc = createPeerConnection(from)
        }

        switch (type) {
          case "offer":
            try {
              const isPolite = userId > from // Polite peer determination
              const offerCollision = pc.signalingState !== "stable" || makingOffer.current.get(from)

              ignoreOffer.current.set(from, !isPolite && offerCollision)

              if (ignoreOffer.current.get(from)) {
                console.log(`🚫 Ignoring offer from ${from} (collision)`)
                return
              }

              console.log(`📥 Processing offer from ${from}`)
              await pc.setRemoteDescription(offer)

              // Process any pending candidates
              const pending = pendingCandidates.current.get(from) || []
              for (const candidate of pending) {
                try {
                  await pc.addIceCandidate(candidate)
                  console.log(`🧊 Added pending candidate from ${from}`)
                } catch (e) {
                  console.warn(`Failed to add pending candidate: ${e}`)
                }
              }
              pendingCandidates.current.delete(from)

              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)

              console.log(`📤 Sending answer to: ${from}`)
              echoService.sendWebRTCSignal(meetingId, {
                type: "answer",
                answer: pc.localDescription,
                from: userId,
                to: from,
              })
            } catch (error) {
              console.error(`❌ Error processing offer from ${from}:`, error)
            }
            break

          case "answer":
            try {
              console.log(`📥 Processing answer from ${from}`)
              await pc.setRemoteDescription(answer)
              console.log(`✅ Set remote description for answer from: ${from}`)

              // Process any pending candidates
              const pending = pendingCandidates.current.get(from) || []
              for (const candidate of pending) {
                try {
                  await pc.addIceCandidate(candidate)
                  console.log(`🧊 Added pending candidate from ${from}`)
                } catch (e) {
                  console.warn(`Failed to add pending candidate: ${e}`)
                }
              }
              pendingCandidates.current.delete(from)
            } catch (error) {
              console.error(`❌ Error processing answer from ${from}:`, error)
            }
            break

          case "ice-candidate":
            try {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(candidate)
                console.log(`🧊 Added ICE candidate from: ${from}`)
              } else {
                console.log(`🧊 Queuing ICE candidate from ${from} (no remote description)`)
                const pending = pendingCandidates.current.get(from) || []
                pending.push(candidate)
                pendingCandidates.current.set(from, pending)
              }
            } catch (error) {
              console.error(`❌ Error adding ICE candidate from ${from}:`, error)
            }
            break
        }
      } catch (error) {
        console.error("❌ Error handling WebRTC signal:", error)
      }
    },
    [userId, meetingId, createPeerConnection],
  )

  // Set up Echo listeners
  const setupEchoListeners = useCallback(() => {
    console.log(`🔊 Setting up Echo listeners for meeting: ${meetingId}`)

    const channelName = echoService.joinMeeting(meetingId, userId, {
      onParticipantJoined: (participant: any) => {
        const participantId = participant.user?.id?.toString() || participant.id?.toString()
        console.log(`👋 New participant joined: ${participantId}`)

        if (participantId && participantId !== userId && !callEnded.current) {
          setConnectionStatus("New participant joining...")
          setTimeout(() => {
            if (!callEnded.current) {
              const pc = createPeerConnection(participantId)
              // Initiate negotiation for new participant
              pc.onnegotiationneeded()
              updateConnectionStatus()
            }
          }, 500) // Reduced delay for faster connection
        }
      },
      onParticipantLeft: (participant: any) => {
        const participantId = participant.user?.id?.toString() || participant.id?.toString()
        console.log(`👋 Participant left: ${participantId}`)

        if (participantId) {
          const pc = peerConnections.current.get(participantId)
          if (pc) {
            pc.close()
            peerConnections.current.delete(participantId)
          }

          setRemoteStreams((prev) => prev.filter((stream) => stream.id !== `remote-${participantId}`))

          // Clean up negotiation state
          makingOffer.current.delete(participantId)
          ignoreOffer.current.delete(participantId)
          isSettingRemoteAnswerPending.current.delete(participantId)
          pendingCandidates.current.delete(participantId)

          updateConnectionStatus()
        }
      },
      onWebRTCSignal: handleWebRTCSignal,
    })

    return channelName !== ""
  }, [meetingId, userId, handleWebRTCSignal, createPeerConnection, updateConnectionStatus])

  const startCall = useCallback(async () => {
    if (isInitialized.current || callEnded.current) {
      console.log("📞 Call already initialized or ended")
      return
    }

    try {
      console.log("📞 Starting WebRTC call...")
      callEnded.current = false
      setConnectionStatus("Initializing call...")

      // Request permissions if needed
      if (!localStream && permissionStatus !== "granted") {
        setConnectionStatus("Requesting media permissions...")
        const granted = await requestPermissions()
        if (!granted) {
          throw new Error("Media permissions required")
        }
      }

      setConnectionStatus("Setting up real-time communication...")

      // Set up Echo listeners first
      const success = setupEchoListeners()
      if (!success) {
        throw new Error("Failed to set up real-time communication")
      }

      // Wait for Echo to be ready
      setConnectionStatus("Connecting to meeting server...")
      const connected = await echoService.waitForConnection(10000)
      if (!connected) {
        throw new Error("Failed to connect to meeting server")
      }

      // Join meeting on server
      console.log("🚪 Joining meeting on server...")
      setConnectionStatus("Joining meeting...")
      const response = await fetch(`/meetings/${meetingId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to join meeting: ${errorText}`)
      }

      const data = await response.json()
      console.log("✅ Successfully joined meeting:", data)

      isInitialized.current = true
      setConnectionStatus("Connected to meeting")
      updateConnectionStatus()

      console.log("✅ Call started successfully")
    } catch (error) {
      console.error("❌ Failed to start call:", error)
      setConnectionStatus(`Failed to start call: ${error.message}`)
      setIsConnected(false)
      isInitialized.current = false
      callEnded.current = true
    }
  }, [localStream, permissionStatus, requestPermissions, setupEchoListeners, meetingId, updateConnectionStatus])

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (localStream && !callEnded.current) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        console.log(`🎤 Audio ${audioTrack.enabled ? "enabled" : "disabled"}`)

        // Broadcast to other participants
        echoService.broadcastAudioToggle(meetingId, userId, audioTrack.enabled)

        // Update server
        try {
          await fetch(`/meetings/${meetingId}/audio`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
            },
            body: JSON.stringify({ audio_enabled: audioTrack.enabled }),
          })
        } catch (error) {
          console.error("❌ Failed to update audio status:", error)
        }
      }
    }
  }, [localStream, meetingId, userId])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStream && !callEnded.current) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        console.log(`📹 Video ${videoTrack.enabled ? "enabled" : "disabled"}`)

        // Broadcast to other participants
        echoService.broadcastVideoToggle(meetingId, userId, videoTrack.enabled)

        // Update server
        try {
          await fetch(`/meetings/${meetingId}/video`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
            },
            body: JSON.stringify({ video_enabled: videoTrack.enabled }),
          })
        } catch (error) {
          console.error("❌ Failed to update video status:", error)
        }
      }
    }
  }, [localStream, meetingId, userId])

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (callEnded.current) return

    try {
      console.log("🖥️ Starting screen share...")

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      setScreenStream(stream)
      setIsScreenSharing(true)

      // Replace video track in all peer connections
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const promises = Array.from(peerConnections.current.values()).map(async (pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
          if (sender) {
            await sender.replaceTrack(videoTrack)
            console.log("🔄 Replaced video track with screen share")
          }
        })
        await Promise.all(promises)
      }

      // Handle screen share end
      videoTrack.onended = () => {
        console.log("🖥️ Screen share ended by user")
        stopScreenShare()
      }

      console.log("✅ Screen share started successfully")
    } catch (error) {
      console.error("❌ Failed to start screen share:", error)
      setIsScreenSharing(false)
    }
  }, [])

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (callEnded.current) return

    try {
      console.log("🖥️ Stopping screen share...")

      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop())
        setScreenStream(null)
      }

      setIsScreenSharing(false)

      // Restore original camera video
      if (originalVideoTrack.current && originalVideoTrack.current.readyState === "live") {
        const promises = Array.from(peerConnections.current.values()).map(async (pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
          if (sender) {
            await sender.replaceTrack(originalVideoTrack.current)
            console.log("🔄 Restored original video track")
          }
        })
        Promise.all(promises).catch(console.error)
      }

      console.log("✅ Screen share stopped successfully")
    } catch (error) {
      console.error("❌ Failed to stop screen share:", error)
    }
  }, [screenStream])

  // End call
  const endCall = useCallback(() => {
    try {
      console.log("📞 Ending call...")
      callEnded.current = true

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          track.stop()
          console.log(`🛑 Stopped ${track.kind} track`)
        })
        setLocalStream(null)
      }

      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop())
        setScreenStream(null)
        setIsScreenSharing(false)
      }

      // Close all peer connections
      peerConnections.current.forEach((pc, peerId) => {
        console.log(`🔒 Closing peer connection for: ${peerId}`)
        pc.close()
      })
      peerConnections.current.clear()

      // Clear all state
      setRemoteStreams([])
      setConnectedPeers([])
      makingOffer.current.clear()
      ignoreOffer.current.clear()
      isSettingRemoteAnswerPending.current.clear()
      pendingCandidates.current.clear()

      // Leave Echo channel
      echoService.leaveMeeting(meetingId)

      setIsConnected(false)
      setConnectionStatus("disconnected")
      isInitialized.current = false
      console.log("✅ Call ended successfully")
    } catch (error) {
      console.error("❌ Failed to end call:", error)
    }
  }, [localStream, screenStream, meetingId])

  // Auto-request permissions on mount
  useEffect(() => {
    if (!callEnded.current && !isInitialized.current) {
      requestPermissions()
    }
  }, [requestPermissions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall()
    }
  }, [endCall])

  return {
    localStream,
    remoteStreams,
    screenStream,
    isConnected,
    connectionStatus,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    permissionStatus,
    connectedPeers,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    requestPermissions,
  }
}
