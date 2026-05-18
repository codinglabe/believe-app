"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"

const VDO_IFRAME_ALLOW =
  "camera; microphone; fullscreen; display-capture https://vdo.ninja https://www.vdo.ninja; autoplay; clipboard-write"

/** Hide VDO.Ninja landing chrome until the room iframe has loaded. */
const VDO_LOAD_SETTLE_MS = 600

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
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsReady(false)
    setIframeSrc(null)
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = null
    }
    const deferId = window.setTimeout(() => setIframeSrc(src), 0)
    return () => {
      window.clearTimeout(deferId)
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
    }
  }, [src])

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
          onLoad={handleLoad}
        />
      ) : null}
      {showLogoOverlay && isReady ? <UnityMeetVideoLogoOverlay /> : null}
    </div>
  )
}
