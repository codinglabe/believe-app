"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { echo } from "@/lib/echo"

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
  startCall: () => Promise<void>
  endCall: () => void
  toggleAudio: () => void
  toggleVideo: () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
  requestPermissions: () => Promise<boolean>
  createOfferForPeer: (peerId: string) => Promise<void>
  handleWebRTCSignal: (signal: any) => Promise<void>
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

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null)
  const echoListenersSetup = useRef(false)

  // WebRTC Configuration
  const rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  }

  // Request media permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setPermissionStatus("requesting")
      setConnectionStatus("Requesting permissions...")

      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)
      setPermissionStatus("granted")
      setConnectionStatus("Permissions granted")

      // Store original video track for screen sharing
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        originalVideoTrack.current = videoTrack
      }

      console.log("Media permissions granted successfully")
      return true
    } catch (error) {
      console.error("Failed to get media permissions:", error)
      setPermissionStatus("denied")
      setConnectionStatus("Media permissions denied")

      // Try audio only as fallback
      try {
        console.log("Trying audio-only fallback...")
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setLocalStream(audioStream)
        setIsVideoEnabled(false)
        setPermissionStatus("partial")
        setConnectionStatus("Audio only - Video permission denied")
        console.log("Audio-only permissions granted")
        return true
      } catch (audioError) {
        console.error("Failed to get audio permission:", audioError)
        setConnectionStatus("All media permissions denied")
        return false
      }
    }
  }, [])

  // Create peer connection
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      console.log("Creating peer connection for:", peerId)
      const pc = new RTCPeerConnection(rtcConfiguration)

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          console.log("Adding track to peer connection:", track.kind)
          pc.addTrack(track, localStream)
        })
      }

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log("Received remote track from:", peerId, event.track.kind)
        const remoteStream = event.streams[0]

        setRemoteStreams((prev) => {
          const existingIndex = prev.findIndex((stream) => stream.id === remoteStream.id)
          if (existingIndex === -1) {
            console.log("Adding new remote stream:", remoteStream.id)
            return [...prev, remoteStream]
          }
          return prev
        })
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate to:", peerId)
          echo.private(`meeting.${meetingId}`).whisper("webrtc-signal", {
            type: "ice-candidate",
            candidate: event.candidate,
            from: userId,
            to: peerId,
          })
        }
      }

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Peer connection state with ${peerId}:`, pc.connectionState)

        if (pc.connectionState === "connected") {
          setIsConnected(true)
          setConnectionStatus("Connected")
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setIsConnected(false)
          setConnectionStatus(`Connection ${pc.connectionState}`)
        }
      }

      // Handle ICE connection state changes
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState)
      }

      peerConnections.current.set(peerId, pc)
      return pc
    },
    [localStream, meetingId, userId],
  )

  // Handle WebRTC signaling
  const handleWebRTCSignal = useCallback(
    async (signal: any) => {
      try {
        const { type, from, to, offer, answer, candidate } = signal

        // Only process signals meant for this user
        if (to !== userId) return

        console.log("Received WebRTC signal:", type, "from:", from)

        let pc = peerConnections.current.get(from)
        if (!pc) {
          pc = createPeerConnection(from)
        }

        switch (type) {
          case "offer":
            await pc.setRemoteDescription(new RTCSessionDescription(offer))
            const answer_desc = await pc.createAnswer()
            await pc.setLocalDescription(answer_desc)

            echo.private(`meeting.${meetingId}`).whisper("webrtc-signal", {
              type: "answer",
              answer: answer_desc,
              from: userId,
              to: from,
            })
            break

          case "answer":
            await pc.setRemoteDescription(new RTCSessionDescription(answer))
            break

          case "ice-candidate":
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
            break

          case "screen-share-start":
            console.log("Participant started screen sharing:", from)
            break

          case "screen-share-stop":
            console.log("Participant stopped screen sharing:", from)
            break
        }
      } catch (error) {
        console.error("Error handling WebRTC signal:", error)
      }
    },
    [userId, meetingId, createPeerConnection],
  )

  // Set up Echo listeners
  const setupEchoListeners = useCallback(() => {
    if (echoListenersSetup.current) return

    console.log("Setting up Echo listeners for meeting:", meetingId)

    const channel = echo.private(`meeting.${meetingId}`)

    // Listen for WebRTC signals
    channel.listenForWhisper("webrtc-signal", handleWebRTCSignal)

    // Listen for new participants
    channel.listen("ParticipantJoined", (data: any) => {
      console.log("New participant joined:", data.user.id)
      if (data.user.id !== userId) {
        // Create offer for new participant
        createOfferForPeer(data.user.id.toString())
      }
    })

    // Listen for participants leaving
    channel.listen("ParticipantLeft", (data: any) => {
      console.log("Participant left:", data.user.id)
      const pc = peerConnections.current.get(data.user.id.toString())
      if (pc) {
        pc.close()
        peerConnections.current.delete(data.user.id.toString())
      }

      // Remove their remote stream
      setRemoteStreams((prev) => prev.filter((stream) => stream.id !== `remote-${data.user.id}`))
    })

    echoListenersSetup.current = true
  }, [meetingId, userId, handleWebRTCSignal])

  // Start call
  const startCall = useCallback(async () => {
    try {
      console.log("Starting WebRTC call...")
      setConnectionStatus("Starting call...")

      // Request permissions if not already granted
      if (!localStream && permissionStatus !== "granted") {
        const granted = await requestPermissions()
        if (!granted) {
          throw new Error("Media permissions required")
        }
      }

      console.log("Local stream initialized")

      // Set up Echo listeners
      console.log("Setting up Echo listeners...")
      setupEchoListeners()

      // Join meeting on server
      console.log("Joining meeting on server...")
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
      console.log("Successfully joined meeting:", data)

      setConnectionStatus("Call started")
      console.log("Call started successfully")
    } catch (error) {
      console.error("Failed to start call:", error)
      setConnectionStatus(`Failed to start call: ${error.message}`)
      setIsConnected(false)
    }
  }, [localStream, permissionStatus, requestPermissions, meetingId, setupEchoListeners])

  // Create offer for new participant
  const createOfferForPeer = useCallback(
    async (peerId: string) => {
      try {
        console.log("Creating offer for peer:", peerId)
        const pc = createPeerConnection(peerId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        echo.private(`meeting.${meetingId}`).whisper("webrtc-signal", {
          type: "offer",
          offer,
          from: userId,
          to: peerId,
        })

        console.log("Created offer for peer:", peerId)
      } catch (error) {
        console.error("Failed to create offer for peer:", error)
      }
    },
    [createPeerConnection, meetingId, userId],
  )

  // End call
  const endCall = useCallback(() => {
    try {
      console.log("Ending call...")

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }

      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop())
        setScreenStream(null)
        setIsScreenSharing(false)
      }

      // Close all peer connections
      peerConnections.current.forEach((pc) => {
        pc.close()
      })
      peerConnections.current.clear()

      setIsConnected(false)
      setConnectionStatus("Call ended")
      setRemoteStreams([])
      echoListenersSetup.current = false
      console.log("Call ended successfully")
    } catch (error) {
      console.error("Failed to end call:", error)
    }
  }, [localStream, screenStream])

  // Toggle audio
  const toggleAudio = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
        console.log("Audio toggled:", audioTrack.enabled ? "enabled" : "disabled")

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
          console.error("Failed to update audio status:", error)
        }
      }
    }
  }, [localStream, meetingId])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
        console.log("Video toggled:", videoTrack.enabled ? "enabled" : "disabled")

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
          console.error("Failed to update video status:", error)
        }
      }
    }
  }, [localStream, meetingId])

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      console.log("Starting screen share...")

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      })

      setScreenStream(stream)
      setIsScreenSharing(true)

      // Replace video track in all peer connections
      const videoTrack = stream.getVideoTracks()[0]
      peerConnections.current.forEach(async (pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
        if (sender) {
          await sender.replaceTrack(videoTrack)
          console.log("Replaced video track with screen share")
        }
      })

      // Notify other participants
      echo.private(`meeting.${meetingId}`).whisper("webrtc-signal", {
        type: "screen-share-start",
        from: userId,
      })

      // Handle screen share end
      videoTrack.onended = () => {
        console.log("Screen share ended by user")
        stopScreenShare()
      }

      console.log("Screen share started successfully")
    } catch (error) {
      console.error("Failed to start screen share:", error)
      setIsScreenSharing(false)
    }
  }, [meetingId, userId])

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    try {
      console.log("Stopping screen share...")

      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop())
        setScreenStream(null)
      }

      setIsScreenSharing(false)

      // Restore original camera video
      if (originalVideoTrack.current && originalVideoTrack.current.readyState === "live") {
        peerConnections.current.forEach(async (pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
          if (sender) {
            await sender.replaceTrack(originalVideoTrack.current)
            console.log("Restored original video track")
          }
        })
      }

      // Notify other participants
      echo.private(`meeting.${meetingId}`).whisper("webrtc-signal", {
        type: "screen-share-stop",
        from: userId,
      })

      console.log("Screen share stopped successfully")
    } catch (error) {
      console.error("Failed to stop screen share:", error)
    }
  }, [screenStream, meetingId, userId])

  // Auto-request permissions on mount
  useEffect(() => {
    requestPermissions()
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
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    requestPermissions,
    createOfferForPeer,
    handleWebRTCSignal,
  }
}
