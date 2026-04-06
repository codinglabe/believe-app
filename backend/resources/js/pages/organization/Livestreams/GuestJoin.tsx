"use client"

import { useState, useRef, useEffect } from "react"
import { Head, Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import {
  Video,
  ExternalLink,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react"

interface Livestream {
  id: number
  title: string | null
  description: string | null
  roomName: string
  roomPassword: string
  participantUrl: string
  status: "draft" | "scheduled" | "live" | "ended" | "cancelled"
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
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const testCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      setStream(mediaStream)
      setCameraEnabled(true)
      setMicEnabled(true)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera/microphone:", error)
      alert("Unable to access camera/microphone. Please check your permissions.")
    }
  }

  const stopTest = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setCameraEnabled(false)
      setMicEnabled(false)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  const getStatusBadge = () => {
    if (livestream.status === "live") {
      return <Badge className="bg-red-500/20 text-red-400 animate-pulse">Live Now</Badge>
    }
    if (livestream.status === "scheduled") {
      return <Badge className="bg-blue-500/20 text-blue-400">Scheduled</Badge>
    }
    if (livestream.status === "ended") {
      return <Badge className="bg-gray-500/20 text-gray-400">Ended</Badge>
    }
    return <Badge className="bg-gray-500/20 text-gray-400">Draft</Badge>
  }

  const canJoin = livestream.status === "live" || livestream.status === "scheduled" || livestream.status === "draft"

  return (
    <FrontendLayout>
      <Head title={`Join Livestream: ${livestream.title || "Untitled"}`} />
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">
            {livestream.title || "Join Livestream"}
          </h1>
          <p className="text-gray-400 text-lg mb-4">{organization.name}</p>
          {getStatusBadge()}
        </div>

        {livestream.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-gray-300">{livestream.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Camera Test */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Test Your Camera & Microphone
            </CardTitle>
            <CardDescription>
              Make sure your camera and microphone are working before joining
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative bg-black rounded-lg aspect-video overflow-hidden">
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <CameraOff className="w-16 h-16" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {cameraEnabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-sm">Camera</span>
                </div>
                <div className="flex items-center gap-2">
                  {micEnabled ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-500" />
                  )}
                  <span className="text-sm">Microphone</span>
                </div>
              </div>
              <div className="flex gap-2">
                {!cameraEnabled ? (
                  <Button onClick={testCamera} variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Test Camera
                  </Button>
                ) : (
                  <Button onClick={stopTest} variant="outline">
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Test
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join Button */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Join?</CardTitle>
            <CardDescription>
              Click the button below to join the livestream room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canJoin && (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  This livestream is not currently available to join.
                </AlertDescription>
              </Alert>
            )}

            {canJoin && (
              <>
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    <strong>No account needed!</strong> Just click the button below and allow camera/microphone access when prompted.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => window.open(livestream.participantUrl, "_blank")}
                  className="w-full bg-gradient-to-r from-[#FF1493] to-[#DC143C] hover:from-[#FF1493]/90 hover:to-[#DC143C]/90 text-lg py-6"
                  size="lg"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Join Livestream
                </Button>

                <p className="text-sm text-gray-400 text-center">
                  The livestream will open in a new window. Make sure pop-ups are enabled.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6 bg-blue-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-sm">What to expect</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
              <li>You'll be asked to allow camera and microphone access</li>
              <li>Your video will appear in the livestream</li>
              <li>The host can see and hear you</li>
              <li>You can mute/unmute yourself using the controls</li>
              <li>No software installation required - it all works in your browser!</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </FrontendLayout>
  )
}

