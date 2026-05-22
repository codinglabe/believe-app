"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"
import { Alert, AlertDescription } from "@/components/ui/alert"

/**
 * Feature Policy for the VDO.Ninja iframe.
 * Do not attach origins to display-capture/camera — invalid syntax breaks Firefox and Edge.
 */
export const VDO_IFRAME_ALLOW =
  "camera *; microphone *; display-capture *; fullscreen *; autoplay *; clipboard-write *; encrypted-media; gyroscope; picture-in-picture"

/** Hide VDO.Ninja landing chrome until the room iframe has loaded. */
const VDO_LOAD_SETTLE_MS = 600

function normalizeMeetingSrc(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:"
    }
    return parsed.toString()
  } catch {
    return url
  }
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
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [insecureContext, setInsecureContext] = useState(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setInsecureContext(typeof window !== "undefined" && !window.isSecureContext)
  }, [])

  useEffect(() => {
    setIsReady(false)
    setIframeSrc(null)
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    const deferId = window.setTimeout(() => setIframeSrc(meetingSrc), 0)
    return () => {
      window.clearTimeout(deferId)
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
    }
  }, [meetingSrc])

  const handleLoad = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current)
    }
    settleTimerRef.current = setTimeout(() => {
      setIsReady(true)
      settleTimerRef.current = null
    }, VDO_LOAD_SETTLE_MS)
  }, [])

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
      {!isReady && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" aria-hidden />
          <p className="text-sm font-medium text-white/90">Loading meeting…</p>
        </div>
      )}
      {iframeSrc ? (
        <iframe
          src={iframeSrc}
          title={title}
          className={`${className} transition-opacity duration-300 ${isReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          allow={allow}
          allowFullScreen
          onLoad={handleLoad}
        />
      ) : null}
      {showLogoOverlay && isReady ? <UnityMeetVideoLogoOverlay /> : null}
    </div>
  )
}
