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

  constructor() {
    this.initializeEcho()
  }

  private initializeEcho() {
    try {
      window.Pusher = Pusher

      this.echo = new Echo({
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
        enabledTransports: ["ws", "wss"],
        auth: {
          headers: {
            Authorization: `Bearer ${document.querySelector('meta[name="auth-token"]')?.getAttribute("content")}`,
          },
        },
      })

      // Monitor connection status
      this.echo.connector.pusher.connection.bind("connected", () => {
        console.log("Echo connected")
        this.connectionStatus = "connected"
      })

      this.echo.connector.pusher.connection.bind("disconnected", () => {
        console.log("Echo disconnected")
        this.connectionStatus = "disconnected"
      })

      this.echo.connector.pusher.connection.bind("connecting", () => {
        console.log("Echo connecting")
        this.connectionStatus = "connecting"
      })

      this.echo.connector.pusher.connection.bind("failed", () => {
        console.log("Echo connection failed")
        this.connectionStatus = "failed"
      })

      console.log("Echo service initialized")
    } catch (error) {
      console.error("Failed to initialize Echo:", error)
      this.connectionStatus = "failed"
    }
  }

  getConnectionStatus(): string {
    return this.connectionStatus
  }

  async waitForConnection(timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.connectionStatus === "connected") {
        resolve(true)
        return
      }

      const checkConnection = () => {
        if (this.connectionStatus === "connected") {
          resolve(true)
        } else if (this.connectionStatus === "failed") {
          resolve(false)
        } else {
          setTimeout(checkConnection, 100)
        }
      }

      setTimeout(() => resolve(false), timeout)
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
      // Join the meeting channel
      const channel = this.echo.private(channelName)
      this.channels.set(channelName, channel)

      // Set up event listeners
      if (callbacks.onParticipantJoined) {
        channel.listen("ParticipantJoined", callbacks.onParticipantJoined)
      }

      if (callbacks.onParticipantLeft) {
        channel.listen("ParticipantLeft", callbacks.onParticipantLeft)
      }

      if (callbacks.onParticipantMuted) {
        channel.listen("ParticipantMuted", callbacks.onParticipantMuted)
      }

      if (callbacks.onParticipantVideoToggled) {
        channel.listen("ParticipantVideoToggled", callbacks.onParticipantVideoToggled)
      }

      if (callbacks.onMessageReceived) {
        channel.listen("MessageSent", callbacks.onMessageReceived)
      }

      if (callbacks.onEmojiReceived) {
        channel.listen("EmojiReaction", callbacks.onEmojiReceived)
      }

      if (callbacks.onMeetingStarted) {
        channel.listen("MeetingStarted", callbacks.onMeetingStarted)
      }

      if (callbacks.onMeetingEnded) {
        channel.listen("MeetingEnded", callbacks.onMeetingEnded)
      }

      if (callbacks.onRecordingStarted) {
        channel.listen("RecordingStarted", callbacks.onRecordingStarted)
      }

      if (callbacks.onRecordingStopped) {
        channel.listen("RecordingStopped", callbacks.onRecordingStopped)
      }

      if (callbacks.onWebRTCSignal) {
        channel.listen("WebRTCSignal", callbacks.onWebRTCSignal)
      }

      console.log(`Joined meeting channel: ${channelName}`)
      return channelName
    } catch (error) {
      console.error("Failed to join meeting channel:", error)
      return ""
    }
  }

  leaveMeeting(meetingId: string): void {
    const channelName = `meeting.${meetingId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      try {
        this.echo?.leave(channelName)
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
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
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
        body: JSON.stringify({ emoji }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
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
      } catch (error) {
        console.error("Failed to broadcast video toggle:", error)
      }
    }
  }

  sendWebRTCSignal(meetingId: string, signal: any): void {
    const channelName = `meeting.${meetingId}`
    const channel = this.channels.get(channelName)

    if (channel) {
      try {
        channel.whisper("webrtc-signal", signal)
      } catch (error) {
        console.error("Failed to send WebRTC signal:", error)
      }
    }
  }

  disconnect(): void {
    try {
      this.channels.forEach((channel, channelName) => {
        this.echo?.leave(channelName)
      })
      this.channels.clear()

      if (this.echo) {
        this.echo.disconnect()
      }

      console.log("Echo service disconnected")
    } catch (error) {
      console.error("Failed to disconnect Echo service:", error)
    }
  }
}

// Create and export a singleton instance
const echoService = new EchoService()
export default echoService
