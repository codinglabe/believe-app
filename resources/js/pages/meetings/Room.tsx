"use client"

import { useState, useEffect, useRef } from "react"
import { Head, router } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/frontend/ui/popover"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Phone,
  Settings,
  Grid3X3,
  Smile,
  MoreHorizontal,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react"
import { useWebRTC } from "@/hooks/useWebRTC"
import { useRecording } from "@/hooks/useRecording"
import type { Meeting, User, MeetingLink, Participant, ChatMessage } from "@/types"
import AppLayout from "@/layouts/app-layout"
import ParticipantsCard from "@/components/meeting/ParticipantsCard"
import ChatCard from "@/components/meeting/ChatCard"
import EmojiPicker from "@/components/meeting/EmojiPicker"
import echoService from "@/Services/EchoService"

interface Props {
  meeting: Meeting
  user: User
  role: "host" | "student" | "organization" | "user"
  meetingLink: MeetingLink
}

export default function MeetingRoom({ meeting, user, role, meetingLink }: Props) {
  // State
  const [meetingDuration, setMeetingDuration] = useState(0)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState("Automatic")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState("connecting")
  const [chatConnectionStatus, setChatConnectionStatus] = useState("connecting")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [gridView, setGridView] = useState(false)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const screenShareRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Custom Hooks
  const {
    localStream,
    remoteStreams,
    screenStream,
    isConnected: isWebRTCConnected,
    connectionStatus: webrtcStatus,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(meeting.id, user.id, role)

  const { isRecording, startRecording, stopRecording } = useRecording(
    meeting.id,
    role === "host" || role === "organization",
  )

  // Meeting timer
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingDuration((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(console.error)
    }
  }, [localStream])

  useEffect(() => {
    remoteStreams.forEach((stream, index) => {
      const videoElement = document.getElementById(`remote-video-${index}`) as HTMLVideoElement
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream
        videoElement.play().catch(console.error)
      }
    })
  }, [remoteStreams])

  // Set up screen share ref
  useEffect(() => {
    if (screenShareRef.current && screenStream) {
      screenShareRef.current.srcObject = screenStream
      screenShareRef.current.play().catch(console.error)
    }
  }, [screenStream])

  // Load initial data and set up Echo
  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        setIsLoading(true)

        // Load participants
        const participantsResponse = await fetch(`/meetings/${meeting.id}/participants`, {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })
        const participantsData = await participantsResponse.json()
        setParticipants(participantsData.participants || [])

        // Load messages
        const messagesResponse = await fetch(`/meetings/${meeting.id}/messages`, {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })
        const messagesData = await messagesResponse.json()
        setMessages(messagesData.messages || [])

        // Set up Echo service
        const channelKey = echoService.joinMeeting(meeting.id, user.id, {
          onParticipantJoined: (participant) => {
            setParticipants((prev) => {
              const exists = prev.find((p) => p.id === participant.id)
              if (!exists) {
                return [...prev, participant]
              }
              return prev
            })
          },
          onParticipantLeft: (participant) => {
            setParticipants((prev) => prev.filter((p) => p.id !== participant.id))
          },
          onParticipantMuted: (data) => {
            setParticipants((prev) =>
              prev.map((p) => (p.user.id === data.user_id ? { ...p, is_muted: data.muted } : p)),
            )
          },
          onParticipantVideoToggled: (data) => {
            setParticipants((prev) =>
              prev.map((p) => (p.user.id === data.user_id ? { ...p, is_video_enabled: data.video_enabled } : p)),
            )
          },
          onMessageReceived: (message) => {
            setMessages((prev) => [...prev, message])
          },
          onEmojiReceived: (data) => {
            const emojiMessage: ChatMessage = {
              id: Date.now(),
              user: data.user,
              content: data.emoji,
              timestamp: data.timestamp,
              type: "emoji",
              meeting_id: meeting.id,
              created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, emojiMessage])
          },
          onMeetingStarted: (data) => {
            console.log("Meeting started by:", data.started_by)
          },
          onMeetingEnded: (data) => {
            console.log("Meeting ended by:", data.ended_by)
            router.visit("/meetings")
          },
          onRecordingStarted: (data) => {
            console.log("Recording started by:", data.started_by)
          },
          onRecordingStopped: (data) => {
            console.log("Recording stopped by:", data.stopped_by)
          },
        })

        // Monitor connection status
        const statusInterval = setInterval(() => {
          const status = echoService.getConnectionStatus()
          setConnectionStatus(status)
          setChatConnectionStatus(status)
        }, 1000)

        setIsLoading(false)

        return () => {
          clearInterval(statusInterval)
          echoService.leaveMeeting(meeting.id)
        }
      } catch (error) {
        console.error("Failed to initialize meeting:", error)
        setIsLoading(false)
      }
    }

    initializeMeeting()
  }, [meeting.id, user.id])

  // Auto-start call when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startCall()
    }, 1000)

    return () => {
      clearTimeout(timer)
      endCall()
    }
  }, [])

  // Handle responsive sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Handle end meeting
  const handleEndMeeting = async () => {
    if (window.confirm("Are you sure you want to end this meeting for everyone?")) {
      try {
        await fetch(`/meetings/${meeting.id}/end`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })

        endCall()
        echoService.leaveMeeting(meeting.id)
        router.visit("/meetings")
      } catch (error) {
        console.error("Failed to end meeting:", error)
      }
    }
  }

  // Handle leave meeting
  const handleLeaveMeeting = async () => {
    if (window.confirm("Are you sure you want to leave this meeting?")) {
      try {
        await fetch(`/meetings/${meeting.id}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })

        endCall()
        echoService.leaveMeeting(meeting.id)
        router.visit("/meetings")
      } catch (error) {
        console.error("Failed to leave meeting:", error)
      }
    }
  }

  // Handle send message
  const handleSendMessage = async (message: string) => {
    try {
      await echoService.sendMessage(meeting.id, message)
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  // Handle emoji send
  const handleEmojiSend = async (emoji: any) => {
    try {
      await echoService.sendEmoji(meeting.id, emoji.native)
      setShowEmojiPicker(false)
    } catch (error) {
      console.error("Failed to send emoji:", error)
    }
  }

  const renderMainVideo = () => {
    // Screen share takes priority
    if (isScreenSharing && screenStream) {
      return (
        <video
          ref={screenShareRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain transition-all duration-500"
        />
      )
    }

    // Show remote video if available
    if (remoteStreams.length > 0) {
      return (
        <video
          id="remote-video-0"
          autoPlay
          playsInline
          className="w-full h-full object-cover transition-all duration-500"
        />
      )
    }

    // Fallback to waiting state
    return (
      <div className="text-center animate-fade-in px-4">
        <div className="relative mb-4 lg:mb-6">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto shadow-2xl ring-4 ring-white/20 transition-all duration-500 hover:scale-105">
            <AvatarFallback className="text-2xl sm:text-3xl lg:text-4xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 w-5 h-5 lg:w-6 lg:h-6 bg-green-500 rounded-full border-2 lg:border-4 border-white animate-pulse"></div>
        </div>
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {participants.length === 0 ? "Waiting for participants..." : "Meeting in Progress"}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Status:{" "}
          <span className={`font-medium ${isWebRTCConnected ? "text-green-500" : "text-yellow-500"}`}>
            {webrtcStatus}
          </span>{" "}
          • Participants: {participants.length + 1}
        </p>

        {/* Connection Status Indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div
            className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full ${isWebRTCConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-bounce"}`}
          ></div>
          <span className="text-xs text-gray-400">{isWebRTCConnected ? "Ready" : "Connecting..."}</span>
        </div>
      </div>
    )
  }

  // Determine overall connection status
  const isConnected = isWebRTCConnected && (webrtcStatus === "connected" || webrtcStatus === "ready")

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
          <div className="text-center animate-fade-in">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 text-blue-500" />
              <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Joining Meeting</h3>
            <p className="text-gray-600 dark:text-gray-400 animate-pulse">Setting up your connection...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Head title={`${meeting.title} - Meeting Room`} />

      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-16">
        {/* Main Grid Container - Proper spacing from header */}
        <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4">
          {/* Main Video Area - Responsive Grid */}
          <div className={`flex-1 flex flex-col min-h-0 ${sidebarCollapsed ? "" : "lg:flex-[2]"}`}>
            {/* Video Container - Responsive height */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-gray-700/50 backdrop-blur-sm mb-4 min-h-[300px] lg:min-h-[400px]">
              {/* Recording Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-20 animate-slide-in-left">
                  <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full flex items-center space-x-2 shadow-lg backdrop-blur-sm">
                    <div className="w-2 h-2 lg:w-3 lg:h-3 bg-white rounded-full animate-pulse" />
                    <span className="text-xs lg:text-sm font-medium">Recording</span>
                  </div>
                </div>
              )}

              {/* Screen Share Indicator */}
              {isScreenSharing && (
                <div className="absolute top-4 right-20 lg:top-6 lg:right-24 z-20 animate-slide-in-right">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full flex items-center space-x-2 shadow-lg backdrop-blur-sm">
                    <Monitor className="w-3 h-3 lg:w-4 lg:h-4" />
                    <span className="text-xs lg:text-sm font-medium">Sharing Screen</span>
                  </div>
                </div>
              )}

              {/* Top Right Controls */}
              <div className="absolute top-4 right-4 lg:top-6 lg:right-6 flex space-x-2 lg:space-x-3 z-20 animate-slide-in-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full w-10 h-10 lg:w-12 lg:h-12 backdrop-blur-sm transition-all duration-300 hover:scale-110"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  ) : (
                    <Maximize2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full w-10 h-10 lg:w-12 lg:h-12 backdrop-blur-sm transition-all duration-300 hover:scale-110"
                >
                  <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
              </div>

              {/* Main Video Content */}
              <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                {renderMainVideo()}
              </div>

              {/* Participant Thumbnails - Responsive grid */}
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10 animate-slide-in-up lg:bottom-6">
                <div className="flex flex-wrap justify-center gap-2 lg:gap-3 max-w-full px-2 lg:px-4">
                  {/* Local Video Thumbnail */}
                  <div className="relative w-20 h-14 sm:w-24 sm:h-16 lg:w-28 lg:h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg lg:rounded-xl overflow-hidden flex-shrink-0 shadow-lg border-2 border-white/50 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                    {isVideoEnabled && localStream ? (
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                        <Avatar className="w-8 h-8 lg:w-12 lg:h-12">
                          <AvatarFallback className="bg-white/20 text-white text-xs lg:text-sm font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    {/* User Label */}
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 lg:px-2 lg:py-1 rounded backdrop-blur-sm">
                      You {isScreenSharing && "(Sharing)"}
                    </div>

                    {/* Audio Status */}
                    <div className="absolute top-1 left-1">
                      <div
                        className={`w-5 h-5 lg:w-6 lg:h-6 ${isAudioEnabled ? "bg-green-500" : "bg-red-500"} rounded-full flex items-center justify-center shadow-lg transition-all duration-300`}
                      >
                        {isAudioEnabled ? (
                          <Mic className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                        ) : (
                          <MicOff className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Video Status */}
                    {!isVideoEnabled && (
                      <div className="absolute top-1 right-1">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                          <VideoOff className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remote Participants Thumbnails */}
                  {remoteStreams.slice(0, window.innerWidth < 768 ? 2 : 4).map((stream, index) => (
                    <div
                      key={`remote-${index}`}
                      className="relative w-20 h-14 sm:w-24 sm:h-16 lg:w-28 lg:h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg lg:rounded-xl overflow-hidden flex-shrink-0 shadow-lg border-2 border-white/50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <video
                        id={`remote-video-${index}`}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Participant Name */}
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 lg:px-2 lg:py-1 rounded backdrop-blur-sm">
                        Participant {index + 1}
                      </div>

                      {/* Audio Status */}
                      <div className="absolute top-1 left-1">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-300">
                          <Mic className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ... existing code for control bar ... */}
            {/* Professional Bottom Control Bar - Exact Reference Design */}
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl lg:rounded-2xl shadow-2xl border border-gray-700/50 px-4 py-3 lg:px-6 lg:py-4">
              <div className="flex items-center justify-between">
                {/* Left: Meeting Status */}
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <div className="flex items-center space-x-1 lg:space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-bounce"}`}
                    ></div>
                    <span className="text-xs lg:text-sm font-medium text-white tabular-nums">
                      {formatDuration(meetingDuration)}
                    </span>
                  </div>
                  <div className="text-xs lg:text-sm text-gray-400">{participants.length + 1} participants</div>
                </div>

                {/* Center: Main Controls - Exact Reference Design */}
                <div className="flex items-center space-x-1 lg:space-x-2">
                  {/* More Options (Left) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
                  >
                    <MoreHorizontal className="w-3 h-3 lg:w-4 lg:h-4" />
                  </Button>

                  {/* Audio Control */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAudio}
                    className={`rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 transition-all duration-200 ${
                      isAudioEnabled
                        ? "bg-gray-700/80 hover:bg-gray-600 text-white"
                        : "bg-red-500/80 hover:bg-red-600 text-white"
                    }`}
                  >
                    {isAudioEnabled ? (
                      <Mic className="w-3 h-3 lg:w-4 lg:h-4" />
                    ) : (
                      <MicOff className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </Button>

                  {/* Up Arrow / Expand */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 bg-red-500/80 hover:bg-red-600 text-white transition-all duration-200"
                  >
                    <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14l5-5 5 5z" />
                    </svg>
                  </Button>

                  {/* Screen Share with Notification Badge */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                      className={`rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 transition-all duration-200 ${
                        isScreenSharing
                          ? "bg-blue-500/80 hover:bg-blue-600 text-white"
                          : "bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white"
                      }`}
                    >
                      {isScreenSharing ? (
                        <MonitorOff className="w-3 h-3 lg:w-4 lg:h-4" />
                      ) : (
                        <Monitor className="w-3 h-3 lg:w-4 lg:h-4" />
                      )}
                    </Button>
                    {/* Yellow Notification Badge */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-yellow-500 rounded-full flex items-center justify-center text-black text-xs font-bold">
                      1
                    </div>
                  </div>

                  {/* Video Control */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleVideo}
                    className={`rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 transition-all duration-200 ${
                      isVideoEnabled
                        ? "bg-gray-700/80 hover:bg-gray-600 text-white"
                        : "bg-gray-700/80 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    {isVideoEnabled ? (
                      <Video className="w-3 h-3 lg:w-4 lg:h-4" />
                    ) : (
                      <VideoOff className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </Button>

                  {/* Emoji/Reactions */}
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
                      >
                        <Smile className="w-3 h-3 lg:w-4 lg:h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0 shadow-2xl" side="top">
                      <EmojiPicker onEmojiSelect={handleEmojiSend} theme="dark" />
                    </PopoverContent>
                  </Popover>

                  {/* Participants/Grid View */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGridView(!gridView)}
                    className={`rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 transition-all duration-200 ${
                      gridView
                        ? "bg-blue-500/80 hover:bg-blue-600 text-white"
                        : "bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white"
                    }`}
                  >
                    <Grid3X3 className="w-3 h-3 lg:w-4 lg:h-4" />
                  </Button>

                  {/* Hand Raise */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
                  >
                    <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 24h-14c-1.104 0-2-.896-2-2v-16c0-1.104.896-2 2-2h4v-2c0-1.104.448-1 1-1s1 .448 1 1v-8c0-.552-.448-1-1-1s-1 .448-1 1v10c0 .552-.448 1-1 1s-1-.448-1-1v-6h-2v14z" />
                    </svg>
                  </Button>

                  {/* More Options (Right) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-8 h-8 lg:w-10 lg:h-10 p-0 bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white transition-all duration-200"
                  >
                    <MoreHorizontal className="w-3 h-3 lg:w-4 lg:h-4" />
                  </Button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 lg:space-x-3">
                  {/* Sidebar Toggle - Hidden on mobile when sidebar is visible */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:flex text-gray-400 hover:text-white px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium border border-gray-600 hover:border-gray-500"
                  >
                    {sidebarCollapsed ? <Maximize2 className="w-3 h-3 mr-1" /> : <Minimize2 className="w-3 h-3 mr-1" />}
                    <span className="hidden lg:inline">{sidebarCollapsed ? "Show" : "Hide"}</span>
                  </Button>

                  {/* Leave Button - Oval Red Button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={role === "host" || role === "organization" ? handleEndMeeting : handleLeaveMeeting}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full flex items-center space-x-1 lg:space-x-2 font-medium transition-all duration-200"
                  >
                    <Phone className="w-3 h-3 lg:w-4 lg:h-4 rotate-[135deg]" />
                    <span className="text-xs lg:text-sm">Leave</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Responsive */}
          {!sidebarCollapsed && (
            <div className="w-full lg:w-80 lg:flex-shrink-0 flex flex-col space-y-4 animate-slide-in-right overflow-hidden">
              {/* Participants Card */}
              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <ParticipantsCard
                  participants={participants}
                  onInviteClick={() => console.log("Invite clicked")}
                  isLoading={isLoading}
                />
              </div>

              {/* Chat Card - Takes remaining space */}
              <div className="flex-1 min-h-0 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                <ChatCard
                  messages={messages}
                  meetingId={meeting.id}
                  onSendMessage={handleSendMessage}
                  onSendEmoji={(emoji) => handleEmojiSend({ native: emoji })}
                  newMessageCount={0}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          {/* Floating Sidebar Toggle (Mobile) */}
          {sidebarCollapsed && (
            <Button
              onClick={() => setSidebarCollapsed(false)}
              className="fixed bottom-20 right-4 z-50 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 shadow-2xl transition-all duration-300 hover:scale-110 lg:hidden"
            >
              <Maximize2 className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Connection Status Alerts - Only show if not connected */}
        {!isConnected && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 animate-slide-in-down">
            <Alert className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 shadow-xl backdrop-blur-sm">
              <AlertDescription className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-medium">
                  {webrtcStatus === "connecting"
                    ? "Connecting to meeting..."
                    : webrtcStatus === "starting"
                      ? "Starting call..."
                      : `${webrtcStatus} - Setting up connection...`}
                </span>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Custom Styles */}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes fade-in-up {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes slide-in-left {
            from { 
              opacity: 0; 
              transform: translateX(-20px); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }
          
          @keyframes slide-in-right {
            from { 
              opacity: 0; 
              transform: translateX(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }
          
          @keyframes slide-in-up {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes slide-in-down {
            from { 
              opacity: 0; 
              transform: translateY(-20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          
          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out;
          }
          
          .animate-slide-in-left {
            animation: slide-in-left 0.6s ease-out;
          }
          
          .animate-slide-in-right {
            animation: slide-in-right 0.6s ease-out;
          }
          
          .animate-slide-in-up {
            animation: slide-in-up 0.6s ease-out;
          }
          
          .animate-slide-in-down {
            animation: slide-in-down 0.6s ease-out;
          }
          
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          
          .shadow-3xl {
            box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
          }
        `}</style>
      </div>
    </AppLayout>
  )
}
