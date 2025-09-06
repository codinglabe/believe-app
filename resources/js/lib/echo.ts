import Echo from "laravel-echo"
import Pusher from "pusher-js"

// Extend Window interface for global access
declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo
  }
}

// WebRTC Signaling Types
export interface WebRTCSignal {
  type: "offer" | "answer" | "ice-candidate" | "participant-joined" | "participant-left"
  senderId: string
  targetId: string
  data?: any
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export interface ParticipantUpdate {
  userId: string
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  connectionQuality?: "excellent" | "good" | "poor" | "disconnected"
}

export interface MeetingEvent {
  type:
    | "participant-joined"
    | "participant-left"
    | "meeting-started"
    | "meeting-ended"
    | "recording-started"
    | "recording-stopped"
  userId: string
  timestamp: string
  data?: any
}

// Echo Configuration
const echoConfig = {
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
  wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
  enabledTransports: ["ws", "wss"],
  auth: {
    headers: {
      "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
    },
  },
}

// Initialize Pusher
window.Pusher = Pusher

// Create Echo instance
export const echo = new Echo(echoConfig)

// Assign to window for global access
window.Echo = echo

// Connection status monitoring
let connectionStatus: "connecting" | "connected" | "disconnected" | "error" = "connecting"
let reconnectAttempts = 0
const maxReconnectAttempts = 5

// Connection event handlers
if (echo.connector && echo.connector.pusher) {
  echo.connector.pusher.connection.bind("connected", () => {
    console.log("Echo connected successfully")
    connectionStatus = "connected"
    reconnectAttempts = 0
  })

  echo.connector.pusher.connection.bind("disconnected", () => {
    console.log("Echo disconnected")
    connectionStatus = "disconnected"
    attemptReconnect()
  })

  echo.connector.pusher.connection.bind("error", (error: any) => {
    console.error("Echo connection error:", error)
    connectionStatus = "error"
    attemptReconnect()
  })
}

// Reconnection logic
function attemptReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error("Max reconnection attempts reached")
    return
  }

  reconnectAttempts++
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)

  console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)

  setTimeout(() => {
    if (connectionStatus !== "connected") {
      echo.connector.pusher.connect()
    }
  }, delay)
}

// Utility functions
export const getConnectionStatus = (): string => connectionStatus

export const waitForConnection = (timeout = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (connectionStatus === "connected") {
      resolve(true)
      return
    }

    const startTime = Date.now()
    const checkConnection = () => {
      if (connectionStatus === "connected") {
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        resolve(false)
      } else {
        setTimeout(checkConnection, 100)
      }
    }

    checkConnection()
  })
}

// Meeting channel helpers
export const joinMeetingChannel = (meetingId: string) => {
  return echo.channel(`meeting.${meetingId}`)
}

export const joinWebRTCChannel = (meetingId: string) => {
  return echo.channel(`meeting.${meetingId}.webrtc`)
}

export const joinParticipantsChannel = (meetingId: string) => {
  return echo.channel(`meeting.${meetingId}.participants`)
}

export const leaveMeetingChannels = (meetingId: string) => {
  echo.leaveChannel(`meeting.${meetingId}`)
  echo.leaveChannel(`meeting.${meetingId}.webrtc`)
  echo.leaveChannel(`meeting.${meetingId}.participants`)
}

export default echo
