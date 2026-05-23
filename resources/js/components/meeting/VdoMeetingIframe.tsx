"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Camera, Loader2, Mic, Video } from "lucide-react"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * Feature Policy for the VDO.Ninja iframe.
 * Do not attach origins to display-capture/camera — invalid syntax breaks Firefox and Edge.
 */
export const VDO_IFRAME_ALLOW =
  "camera *; microphone *; display-capture *; fullscreen *; autoplay *; clipboard-write *; encrypted-media; gyroscope; picture-in-picture"

const VDO_READY_ACTIONS = new Set([
  "director-connected",
  "guest-connected",
  "scene-connected",
  "joining-room",
])

type MediaAccessState = "checking" | "prompt" | "granted" | "denied" | "unsupported"

function normalizeMeetingSrc(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:"
    }
    if (!parsed.searchParams.has("iframe")) {
      parsed.searchParams.set("iframe", "")
    }
    return parsed.toString()
  } catch {
    return url
  }
}

async function queryMediaPermissionState(): Promise<"granted" | "prompt" | "denied" | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown"
  }

  try {
    const [camera, microphone] = await Promise.all([
      navigator.permissions.query({ name: "camera" as PermissionName }),
      navigator.permissions.query({ name: "microphone" as PermissionName }),
    ])

    if (camera.state === "denied" || microphone.state === "denied") {
      return "denied"
    }
    if (camera.state === "granted" && microphone.state === "granted") {
      return "granted"
    }
    return "prompt"
  } catch {
    return "unknown"
  }
}

async function requestCameraAndMicrophone(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch {
    return false
  }
}

function isVdoReadyMessage(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false
  }

  const payload = data as { action?: string; value?: unknown }
  if (!payload.action) {
    return false
  }

  if (VDO_READY_ACTIONS.has(payload.action)) {
    return true
  }

  if (payload.action === "push-connection" && payload.value === true) {
    return true
  }

  if (payload.action === "view-connection" && payload.value === true) {
    return true
  }

  return false
}

type VdoMeetingIframeProps = {
  src: string
  title?: string
  className?: string
  allow?: string
  showLogoOverlay?: boolean
}

export default function VdoMeetingIframe({
  src,
  title = "Meeting",
  className = "absolute inset-0 z-[1] h-full w-full border-0 bg-black",
  allow = VDO_IFRAME_ALLOW,
  showLogoOverlay = true,
}: VdoMeetingIframeProps) {
  const meetingSrc = useMemo(() => normalizeMeetingSrc(src), [src])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [mediaAccess, setMediaAccess] = useState<MediaAccessState>("checking")
  const [isRequestingAccess, setIsRequestingAccess] = useState(false)
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const [vdoSessionReady, setVdoSessionReady] = useState(false)
  const [insecureContext, setInsecureContext] = useState(false)

  useEffect(() => {
    setInsecureContext(typeof window !== "undefined" && !window.isSecureContext)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (typeof window === "undefined") {
        return
      }

      if (!window.isSecureContext) {
        if (!cancelled) {
          setMediaAccess("unsupported")
        }
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setMediaAccess("unsupported")
        }
        return
      }

      if (!cancelled) {
        setMediaAccess("checking")
      }

      const permissionState = await queryMediaPermissionState()
      if (cancelled) {
        return
      }

      if (permissionState === "granted") {
        setMediaAccess("granted")
        return
      }

      if (permissionState === "denied") {
        setMediaAccess("denied")
        return
      }

      setMediaAccess("prompt")
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [meetingSrc])

  useEffect(() => {
    setVdoSessionReady(false)
    setIframeSrc(null)

    if (mediaAccess !== "granted") {
      return
    }

    const deferId = window.setTimeout(() => setIframeSrc(meetingSrc), 0)
    return () => window.clearTimeout(deferId)
  }, [mediaAccess, meetingSrc])

  useEffect(() => {
    if (!iframeSrc) {
      return
    }

    const onMessage = (event: MessageEvent) => {
      if (!event.origin.includes("vdo.ninja")) {
        return
      }

      const frameWindow = iframeRef.current?.contentWindow
      if (frameWindow && event.source !== frameWindow) {
        return
      }

      if (isVdoReadyMessage(event.data)) {
        setVdoSessionReady(true)
      }
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [iframeSrc])

  const handleAllowAccess = useCallback(async () => {
    setIsRequestingAccess(true)
    const allowed = await requestCameraAndMicrophone()
    setIsRequestingAccess(false)

    if (allowed) {
      setMediaAccess("granted")
      return
    }

    const permissionState = await queryMediaPermissionState()
    setMediaAccess(permissionState === "denied" ? "denied" : "prompt")
  }, [])

  const handleRetryPermission = useCallback(() => {
    setMediaAccess("prompt")
    void handleAllowAccess()
  }, [handleAllowAccess])

  const showMeeting = mediaAccess === "granted" && vdoSessionReady

  return (
    <div className="absolute inset-0 min-h-0 min-w-0">
      {insecureContext && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3">
          <Alert className="pointer-events-auto border-amber-500/50 bg-amber-950/90 text-amber-50">
            <AlertDescription className="text-sm">
              Camera and microphone require a secure connection (HTTPS). Reload this page using{" "}
              <span className="font-medium">https://</span> in the address bar.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!showMeeting && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center"
          aria-live="polite"
          aria-busy={mediaAccess === "checking" || isRequestingAccess || (mediaAccess === "granted" && !vdoSessionReady)}
        >
          {mediaAccess === "checking" || isRequestingAccess ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-purple-400" aria-hidden />
              <p className="text-sm font-medium text-white/90">
                {isRequestingAccess ? "Waiting for camera and microphone access…" : "Checking access…"}
              </p>
            </>
          ) : mediaAccess === "prompt" ? (
            <>
              <div className="flex items-center gap-3 text-purple-300">
                <Camera className="h-8 w-8" aria-hidden />
                <Mic className="h-8 w-8" aria-hidden />
              </div>
              <div className="space-y-2 max-w-sm">
                <p className="text-base font-semibold text-white">Camera &amp; microphone required</p>
                <p className="text-sm text-white/70">
                  Allow access to join the meeting. The room will not load until permission is granted.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void handleAllowAccess()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              >
                <Video className="mr-2 h-4 w-4" />
                Allow camera &amp; microphone
              </Button>
            </>
          ) : mediaAccess === "denied" ? (
            <>
              <Camera className="h-10 w-10 text-amber-400" aria-hidden />
              <div className="space-y-2 max-w-sm">
                <p className="text-base font-semibold text-white">Access blocked</p>
                <p className="text-sm text-white/70">
                  Enable camera and microphone for this site in your browser settings, then try again.
                </p>
              </div>
              <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={handleRetryPermission}>
                Try again
              </Button>
            </>
          ) : mediaAccess === "unsupported" ? (
            <>
              <p className="text-sm font-medium text-white/90 max-w-sm">
                Camera and microphone are not available in this browser or connection.
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-purple-400" aria-hidden />
              <p className="text-sm font-medium text-white/90">Connecting to meeting…</p>
              <p className="text-xs text-white/60 max-w-xs">
                If your browser asks for camera or microphone access for VDO.Ninja, choose Allow.
              </p>
            </>
          )}
        </div>
      )}

      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={title}
          className={`${className} transition-opacity duration-300 ${showMeeting ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          allow={allow}
          allowFullScreen
        />
      ) : null}
      {showLogoOverlay && showMeeting ? <UnityMeetVideoLogoOverlay /> : null}
    </div>
  )
}
