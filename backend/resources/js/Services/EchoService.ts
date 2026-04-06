import Echo from "laravel-echo"
import Pusher from "pusher-js"

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo
  }
}

interface EchoCallbacks {
  onParticipantJoined?: (participant: any) => void
  onParticipantLeft?: (participant: any) => void
  onParticipantMuted?: (data: any) => void
  onParticipantVideoToggled?: (data: any) => void
  onMessageReceived?: (message: any) => void
  onEmojiReceived?: (data: any) => void
  onMeetingStarted?: (data: any) => void
  onMeetingEnded?: (data: any) => void
  onRecordingStarted?: (data: any) => void
  onRecordingStopped?: (data: any) => void
  onWebRTCSignal?: (data: any) => void
}

class EchoService {
  private echo: Echo | null = null
  private channels: Map<string, any> = new Map()
  private connectionStatus = "disconnected"
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeEcho()
  }

  private initializeEcho() {
    try {
      window.Pusher = Pusher

      this.echo = new Echo({
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST || (typeof window !== "undefined" ? window.location.hostname : "localhost"),
        wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 80,
        wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
        enabledTransports: ["ws", "wss"],
        auth: {
          headers: {
            Authorization: `Bearer ${document.querySelector('meta[name="auth-token"]')?.getAttribute("content")}`,
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        },
        cluster: import.meta.env.VITE_PUSHER_CLUSTER || "mt1",
        encrypted: true,
        activityTimeout: 30000,
        pongTimeout: 6000,
        unavailableTimeout: 10000,
      })

      // Set up connection event handlers
      this.setupConnectionHandlers()

      // Assign to window for global access
      window.Echo = this.echo

      console.log("Echo service initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Echo:", error)
      this.connectionStatus = "failed"
      this.attemptReconnect()
    }
  }

  private setupConnectionHandlers() {
    if (!this.echo) return

    this.echo.connector.pusher.connection.bind("connected", () => {
      console.log("Echo connected successfully")
      this.connectionStatus = "connected"
      this.reconnectAttempts = 0
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval)
        this.reconnectInterval = null
      }
    })

    this.echo.connector.pusher.connection.bind("disconnected", () => {
      console.log("Echo disconnected")
      this.connectionStatus = "disconnected"
      this.attemptReconnect()
    })

    this.echo.connector.pusher.connection.bind("connecting", () => {
      console.log("Echo connecting...")
      this.connectionStatus = "connecting"
    })

    this.echo.connector.pusher.connection.bind("failed", () => {
      console.log("Echo connection failed")
      this.connectionStatus = "failed"
      this.attemptReconnect()
    })

    this.echo.connector.pusher.connection.bind("error", (error: any) => {
      console.error("Echo connection error:", error)
      this.connectionStatus = "error"
      this.attemptReconnect()
    })

    this.echo.connector.pusher.connection.bind("unavailable", () => {
      console.log("Echo connection unavailable")
      this.connectionStatus = "unavailable"
      this.attemptReconnect()
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached")
      return
    }

    if (this.reconnectInterval) return

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null
      this.initializeEcho()
    }, delay)
  }

  getConnectionStatus(): string {
    return this.connectionStatus
  }

  async waitForConnection(timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.connectionStatus === "connected") {
        resolve(true)
        return
      }

      const startTime = Date.now()
      const checkConnection = () => {
        if (this.connectionStatus === "connected") {
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

  joinMeeting(meetingId: string, userId: string, callbacks: EchoCallbacks): string {
    if (!this.echo) {
      console.error("Echo not initialized")
      return ""
    }

    const channelName = `meeting.${meetingId}`

    try {
      // Leave existing channel if it exists
      if (this.channels.has(channelName)) {
        this.leaveMeeting(meetingId)
      }

      const channel = this.echo.channel(channelName)
      this.channels.set(channelName, channel)

      channel
        .listen("ParticipantJoined", (e: any) => {
          console.log("Participant joined event:", e)
          const participant = e.participant || e
          // Ensure we have proper participant data
          if (participant && participant.user) {
            callbacks.onParticipantJoined?.(participant)
          } else {
            console.warn("Invalid participant data:", participant)
          }
        })
        .listen("ParticipantLeft", (e: any) => {
          console.log("Participant left event:", e)
          const participant = e.participant || e
          if (participant && participant.user) {
            callbacks.onParticipantLeft?.(participant)
          }
        })
        .listen("ParticipantMuted", (e: any) => {
          console.log("Participant muted:", e)
          callbacks.onParticipantMuted?.(e)
        })
        .listen("ParticipantVideoToggled", (e: any) => {
          console.log("Participant video toggled:", e)
          callbacks.onParticipantVideoToggled?.(e)
        })
        .listen("MeetingMessageSent", (e: any) => {
          console.log("Message received:", e)
          callbacks.onMessageReceived?.(e.message || e)
        })
        .listen("EmojiReaction", (e: any) => {
          console.log("Emoji received:", e)
          callbacks.onEmojiReceived?.(e.message || e)
        })
        .listen("MeetingStarted", (e: any) => {
          console.log("Meeting started:", e)
          callbacks.onMeetingStarted?.(e)
        })
        .listen("MeetingEnded", (e: any) => {
          console.log("Meeting ended:", e)
          callbacks.onMeetingEnded?.(e)
        })
        .listen("RecordingStarted", (e: any) => {
          console.log("Recording started:", e)
          callbacks.onRecordingStarted?.(e)
        })
        .listen("RecordingStopped", (e: any) => {
          console.log("Recording stopped:", e)
          callbacks.onRecordingStopped?.(e)
        })

      channel.listenForWhisper("webrtc-signal", (e: any) => {
        console.log("WebRTC signal received:", e)
        if (e && e.type && e.from && e.to) {
          callbacks.onWebRTCSignal?.(e)
        } else {
          console.warn("Invalid WebRTC signal:", e)
        }
      })

      // Listen for audio/video toggles
      channel.listenForWhisper("audio-toggle", (e: any) => {
        console.log("Audio toggle received:", e)
        if (e && e.user_id !== undefined && e.audio_enabled !== undefined) {
          callbacks.onParticipantMuted?.({ user_id: e.user_id, muted: !e.audio_enabled })
        }
      })

      channel.listenForWhisper("video-toggle", (e: any) => {
        console.log("Video toggle received:", e)
        if (e && e.user_id !== undefined && e.video_enabled !== undefined) {
          callbacks.onParticipantVideoToggled?.({ user_id: e.user_id, video_enabled: e.video_enabled })
        }
      })

      console.log(`Successfully joined meeting channel: ${channelName}`)
      return channelName
    } catch (error) {
      console.error("Failed to join meeting channel:", error)
      return ""
    }
  }

  leaveMeeting(meetingId: string): void {
    const channelName = `meeting.${meetingId}`
    const channel = this.channels.get(channelName)

    if (channel && this.echo) {
      try {
        this.echo.leaveChannel(channelName)
        this.channels.delete(channelName)
        console.log(`Left meeting channel: ${channelName}`)
      } catch (error) {
        console.error("Failed to leave meeting channel:", error)
      }
    }
  }

  async sendMessage(meetingId: string, message: string): Promise<void> {
    try {
      const response = await fetch(`/meetings/${meetingId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({
          message,
          message_type: "text",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Send message error response:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Message sent successfully:", data)
    } catch (error) {
      console.error("Failed to send message:", error)
      throw error
    }
  }

  async sendEmoji(meetingId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(`/meetings/${meetingId}/emoji`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({
          emoji,
          reaction_type: "message",
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Send emoji error response:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      console.log("Emoji sent successfully:", data)
    } catch (error) {
      console.error("Failed to send emoji:", error)
      throw error
    }
  }

  broadcastAudioToggle(meetingId: string, userId: string, isEnabled: boolean): void {
    const channelName = `meeting.${meetingId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      try {
        channel.whisper("audio-toggle", {
          user_id: userId,
          audio_enabled: isEnabled,
          timestamp: new Date().toISOString(),
        })
        console.log("Audio toggle broadcasted:", { userId, isEnabled })
      } catch (error) {
        console.error("Failed to broadcast audio toggle:", error)
      }
    }
  }

  broadcastVideoToggle(meetingId: string, userId: string, isEnabled: boolean): void {
    const channelName = `meeting.${meetingId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      try {
        channel.whisper("video-toggle", {
          user_id: userId,
          video_enabled: isEnabled,
          timestamp: new Date().toISOString(),
        })
        console.log("Video toggle broadcasted:", { userId, isEnabled })
      } catch (error) {
        console.error("Failed to broadcast video toggle:", error)
      }
    }
  }

  sendWebRTCSignal(meetingId: string, signal: any): void {
    const channelName = `meeting.${meetingId}`
    const channel = this.channels.get(channelName)

    if (channel && signal && signal.type && signal.from && signal.to) {
      try {
        channel.whisper("webrtc-signal", signal)
        console.log(`📤 WebRTC signal sent: ${signal.type} from ${signal.from} to ${signal.to}`)
      } catch (error) {
        console.error("Failed to send WebRTC signal:", error)
      }
    } else {
      console.error("Invalid signal or channel not found:", { channelName, signal })
    }
  }

  disconnect(): void {
    try {
      // Clear reconnect interval
      if (this.reconnectInterval) {
        clearInterval(this.reconnectInterval)
        this.reconnectInterval = null
      }

      // Leave all channels
      this.channels.forEach((channel, channelName) => {
        this.echo?.leaveChannel(channelName)
      })
      this.channels.clear()

      // Disconnect Echo
      if (this.echo) {
        this.echo.disconnect()
        this.echo = null
      }

      this.connectionStatus = "disconnected"
      console.log("Echo service disconnected")
    } catch (error) {
      console.error("Failed to disconnect Echo service:", error)
    }
  }
}

// Create and export a singleton instance
const echoService = new EchoService()
export default echoService
