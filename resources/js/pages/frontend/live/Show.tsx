"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link } from "@inertiajs/react"
import { Button } from "@/components/frontend/ui/button"
import { Slider } from "@/components/frontend/ui/slider"
import { ArrowLeft, Loader2, Radio, Volume2, VolumeX, Maximize2, Minimize2 } from "lucide-react"

interface LivestreamItem {
  slug: string
  title: string
  organizationName: string
  viewUrl: string
}

interface Props {
  seo?: { title?: string; description?: string }
  livestream: LivestreamItem
}

export default function LiveShow({ seo, livestream }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingMinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iframeSrc = useMemo(() => {
    const base = livestream.viewUrl
    const sep = base.includes("?") ? "&" : "?"
    return `${base}${sep}_=${Date.now()}`
  }, [livestream.viewUrl])

  const sendToIframe = useCallback((payload: Record<string, unknown>) => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(payload, "*")
    }
  }, [])

  const handleMuteToggle = () => {
    const next = !muted
    setMuted(next)
    sendToIframe({ mute: next })
  }

  const handleVolumeChange = (value: number[]) => {
    const v = value[0] ?? 100
    setVolume(v)
    if (v === 0) {
      setMuted(true)
      sendToIframe({ mute: true })
    } else {
      const norm = v / 100
      sendToIframe({ volume: norm })
      if (muted) {
        setMuted(false)
        sendToIframe({ mute: false })
      }
    }
  }

  const toggleFullscreen = useCallback(() => {
    const container = playerContainerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const showControls = () => {
    setControlsVisible(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3500)
  }

  useEffect(() => {
    if (!isFullscreen) return
    const container = playerContainerRef.current
    if (!container) return
    container.addEventListener("mousemove", showControls)
    container.addEventListener("touchstart", showControls)
    return () => {
      container.removeEventListener("mousemove", showControls)
      container.removeEventListener("touchstart", showControls)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isFullscreen])

  const handleIframeLoad = useCallback(() => {
    if (loadingMinTimeoutRef.current) clearTimeout(loadingMinTimeoutRef.current)
    loadingMinTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      loadingMinTimeoutRef.current = null
    }, 2800)
  }, [])

  // When switching stream (e.g. Inertia nav), show loading again until new iframe is ready
  useEffect(() => {
    setIsLoading(true)
  }, [livestream.slug])

  useEffect(() => {
    return () => {
      if (loadingMinTimeoutRef.current) clearTimeout(loadingMinTimeoutRef.current)
    }
  }, [])

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? livestream.title + " | Live"}
        description={seo?.description}
      />
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Compact header */}
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 dark:border-white/10 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <Link
                href="/unity-live"
                className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                All live
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden sm:inline text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[180px] lg:max-w-[240px]">
                  {livestream.organizationName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 dark:bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Player + controls (this div goes fullscreen so video fills screen) */}
          <div
            ref={playerContainerRef}
            className={`relative overflow-hidden bg-black shadow-2xl ring-1 ring-neutral-200 dark:ring-white/10 transition-[border-radius] ${
              isFullscreen ? "rounded-none" : "rounded-xl"
            }`}
          >
            {/* Video area */}
            <div className="aspect-video w-full relative">
              <iframe
                ref={iframeRef}
                key={livestream.slug}
                src={iframeSrc}
                title={livestream.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${isLoading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                onLoad={handleIframeLoad}
              />
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
                  <Loader2 className="h-10 w-10 text-neutral-500 animate-spin" aria-hidden />
                  <span className="text-sm text-neutral-400">Loading stream…</span>
                </div>
              )}
              {/* LIVE badge on video */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              {/* Fullscreen overlay controls (only in fullscreen, show on move) */}
              {isFullscreen && (
                <div
                  className={`absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none transition-opacity duration-200 ${
                    controlsVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="p-4 pointer-events-auto flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-white truncate">
                      {livestream.title} · {livestream.organizationName}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9 text-white hover:bg-white/20"
                      onClick={toggleFullscreen}
                      aria-label="Exit fullscreen"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Control bar (always visible when not fullscreen; in fullscreen shown with overlay) */}
            <div
              className={`flex flex-wrap items-center gap-4 px-4 py-3 bg-neutral-100 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-white/10 ${
                isFullscreen && !controlsVisible ? "invisible" : ""
              } ${isFullscreen ? "absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-200 " + (controlsVisible ? "opacity-100" : "opacity-0") : ""}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10 h-9"
                  onClick={handleMuteToggle}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4 shrink-0" />
                  ) : (
                    <Volume2 className="h-4 w-4 shrink-0" />
                  )}
                  <span className="hidden sm:inline text-sm">{muted ? "Unmute" : "Mute"}</span>
                </Button>
                <div className="flex items-center gap-2 min-w-[120px] max-w-[180px]">
                  <Slider
                    value={[muted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                    aria-label="Volume"
                  />
                  <span className="text-xs text-neutral-500 dark:text-neutral-500 tabular-nums w-8 shrink-0">{muted ? "0" : volume}%</span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10 h-9 shrink-0"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline text-sm">{isFullscreen ? "Exit" : "Fullscreen"}</span>
              </Button>
            </div>
          </div>

          {/* Title + org below player */}
          <div className="mt-4 px-1">
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">{livestream.title}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{livestream.organizationName}</p>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
