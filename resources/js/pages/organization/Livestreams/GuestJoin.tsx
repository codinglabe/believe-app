"use client"

import { useState, useRef, useEffect } from "react"
import { Head } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Lock,
  Heart,
  Settings,
  ChevronDown,
  AlertCircle,
  Bot,
} from "lucide-react"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  participantUrl: string
  status: "draft" | "scheduled" | "meeting_live" | "live" | "ended" | "cancelled"
}

interface Organization {
  id: number
  name: string
}

interface Props {
  livestream: Livestream
  organization: Organization
}

export default function GuestJoin({ livestream, organization }: Props) {
  const [displayName, setDisplayName] = useState("")
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [deviceOk, setDeviceOk] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const testDevices = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      setStream(mediaStream)
      setCameraEnabled(true)
      setMicEnabled(true)
      setDeviceOk(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error("Error accessing devices:", err)
      setDeviceOk(false)
    }
  }

  const canJoin = ["draft", "scheduled", "meeting_live", "live"].includes(livestream.status)

  const handleJoin = () => {
    if (!canJoin) return
    const name = displayName.trim() || "Guest"
    const url = new URL(livestream.participantUrl)
    url.searchParams.set("label", name)
    window.open(url.toString(), "_blank")
  }

  return (
    <FrontendLayout>
      <Head title={`Join: ${livestream.title || "Meeting"}`} />
      <div className="min-h-[calc(100vh-140px)] flex flex-col md:flex-row bg-background">
        {/* Left panel: Join controls */}
        <div className="flex flex-col justify-center p-6 md:p-8 md:w-72 md:max-w-[320px] md:min-h-[calc(100vh-140px)] border-r border-border/50">
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-1">
            Join meeting
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mb-6">
            {livestream.title || "Untitled"}
          </p>

          {!canJoin && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This meeting is not currently available to join.
              </AlertDescription>
            </Alert>
          )}

          {canJoin && (
            <>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Your name
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-muted/50 border-border mb-4 h-11"
              />

              <Button
                onClick={handleJoin}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium"
              >
                Join meeting
                <ChevronDown className="ml-2 h-4 w-4 -rotate-90" aria-hidden />
              </Button>

              {/* Icon row: mic, video, lock, heart, settings */}
              <div className="flex items-center gap-4 mt-6 text-muted-foreground">
                <button
                  type="button"
                  onClick={testDevices}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  title={micEnabled ? "Microphone on" : "Test microphone"}
                  aria-label="Microphone"
                >
                  {micEnabled ? (
                    <Mic className="h-5 w-5 text-foreground" />
                  ) : (
                    <MicOff className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  title={cameraEnabled ? "Camera on" : "Camera off"}
                  aria-label="Camera"
                >
                  {cameraEnabled ? (
                    <Video className="h-5 w-5 text-foreground" />
                  ) : (
                    <VideoOff className="h-5 w-5" />
                  )}
                </button>
                <span className="p-2 text-green-500" title="Secure connection" aria-hidden>
                  <Lock className="h-5 w-5" />
                </span>
                <span className="p-2" aria-hidden>
                  <Heart className="h-5 w-5" />
                </span>
                <span className="p-2" aria-hidden>
                  <Settings className="h-5 w-5" />
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mt-6 text-sm text-muted-foreground">
                <span
                  className={`h-2 w-2 rounded-full ${deviceOk ? "bg-green-500" : "bg-muted-foreground/50"}`}
                  aria-hidden
                />
                {deviceOk ? "Everything is working properly" : "Allow camera and microphone to verify"}
              </div>
            </>
          )}
        </div>

        {/* Right panel: Video / avatar placeholder */}
        <div className="flex-1 min-h-[320px] md:min-h-[calc(100vh-140px)] flex items-center justify-center bg-muted/30 p-6">
          {cameraEnabled && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-full max-w-full rounded-lg object-contain aspect-video bg-black"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bot className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/70" />
              </div>
              <p className="text-sm">Your video will appear here</p>
              {canJoin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={testDevices}
                >
                  Test camera
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </FrontendLayout>
  )
}
