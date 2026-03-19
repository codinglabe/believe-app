"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Link } from "@inertiajs/react"
import { Button } from "@/components/frontend/ui/button"
import { Slider } from "@/components/frontend/ui/slider"
import { ArrowLeft, Loader2, Radio, Volume2, VolumeX, Maximize2, Minimize2, Play } from "lucide-react"

interface LivestreamItem {
  id: number
  slug: string
  title: string
  organizationName: string
  viewUrl: string
  viewUrlMuted?: string
  viewUrlFallback: string
  startedAt: string | null
}

interface Props {
  seo?: { title?: string; description?: string }
  livestream: LivestreamItem
  otherLivestreams: LivestreamItem[]
}

export default function UnityLiveShow({ seo, livestream, otherLivestreams }: Props) {
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
  }, [livestream.viewUrl, livestream.slug])

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
        title={seo?.title ?? livestream.title + " | Unity Live"}
        description={seo?.description}
      />
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Compact header */}
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 dark:border-white/10 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <Link
                href="/unity-live"
                className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                All live
              </Link>
              <div className="flex items-center gap-3 min-w-0">
                <span className="hidden sm:inline text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[180px] lg:max-w-[240px]">
                  {livestream.organizationName}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main — player + controls */}
            <div className="flex-1 min-w-0">
              <div
                ref={playerContainerRef}
                className={`relative overflow-hidden bg-black shadow-2xl ring-1 ring-neutral-200 dark:ring-white/10 transition-[border-radius] ${
                  isFullscreen ? "rounded-none" : "rounded-xl"
                }`}
              >
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
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-neutral-100 dark:bg-neutral-950 text-neutral-600 dark:text-white">
                      <Loader2 className="h-10 w-10 text-neutral-400 dark:text-neutral-500 animate-spin" aria-hidden />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Loading stream…</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur px-2.5 py-1 text-xs font-semibold text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
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
                      className="gap-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 h-9"
                      onClick={handleMuteToggle}
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
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
                      <span className="text-xs text-neutral-500 tabular-nums w-8 shrink-0">{muted ? "0" : volume}%</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-white/10 h-9 shrink-0"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="hidden sm:inline text-sm">{isFullscreen ? "Exit" : "Fullscreen"}</span>
                  </Button>
                </div>
              </div>

              <div className="mt-4 px-1">
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-white truncate">{livestream.title}</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{livestream.organizationName} · Unity Live</p>
              </div>
            </div>

            {/* Sidebar — Other live streams */}
            <aside className="w-full lg:w-72 xl:w-80 shrink-0">
              <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900/50 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/10 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">Other live streams</span>
                </div>
                <div className="p-3">
                  <Link
                    href="/unity-live"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <Radio className="h-4 w-4 shrink-0" />
                    All live
                  </Link>
                  {otherLivestreams.length === 0 ? (
                    <p className="text-xs text-neutral-500 px-3 py-4">No other streams live right now</p>
                  ) : (
                    <div className="flex flex-col gap-2 mt-3">
                      {otherLivestreams.map((stream) => (
                        <Link
                          key={stream.slug}
                          href={`/unity-live/${stream.slug}`}
                          className="flex gap-2.5 p-2 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-black/30 hover:bg-neutral-100 dark:hover:bg-white/10 hover:border-neutral-300 dark:hover:border-white/20 transition-colors text-left"
                        >
                          <div className="relative w-24 sm:w-28 aspect-video rounded-md bg-black shrink-0 overflow-hidden">
                            <iframe
                              src={stream.viewUrlMuted ?? stream.viewUrl}
                              title={stream.title}
                              allow="autoplay"
                              className="absolute inset-0 w-full h-full border-0 pointer-events-none z-0 scale-[1.02]"
                            />
                            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                              <Play className="h-5 w-5 text-white/60" />
                            </div>
                            <div className="absolute bottom-0.5 left-0.5 z-10">
                              <span className="inline-flex items-center gap-1 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                LIVE
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1 py-0.5">
                            <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-white line-clamp-2 leading-tight">
                              {stream.title}
                            </p>
                            <p className="text-[10px] sm:text-xs text-neutral-500 line-clamp-1 mt-0.5">
                              {stream.organizationName}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
