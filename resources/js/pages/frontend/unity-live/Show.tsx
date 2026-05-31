"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Slider } from "@/components/frontend/ui/slider"
import {
  Building2,
  Loader2,
  Maximize2,
  Minimize2,
  Share2,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react"
import toast from "react-hot-toast"
import { useUnityLiveViewerStatus } from "@/hooks/useUnityLiveViewerStatus"
import StreamEndedOverlay from "@/components/unity-live/StreamEndedOverlay"
import GoingLiveOverlay from "@/components/unity-live/GoingLiveOverlay"
import UnityLiveOverlayLayer from "@/components/unity-live/UnityLiveOverlayLayer"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"
import { UnityLiveBadge } from "@/components/unity-live/UnityLiveBadge"
import { UnityLiveOtherStreamsSidebar } from "@/components/unity-live/UnityLiveOtherStreamsSidebar"
import { UnityLiveWatchHeader } from "@/components/unity-live/UnityLiveWatchHeader"
import {
  hostTypeLabel,
  type UnityLiveStreamItem,
} from "@/lib/unity-live-display"
import { useLiveSince } from "@/hooks/useLiveSince"

interface Props {
  seo?: { title?: string; description?: string }
  livestream: UnityLiveStreamItem
  otherLivestreams: UnityLiveStreamItem[]
  broadcastChannel: string
}

export default function UnityLiveShow({ seo, livestream, otherLivestreams, broadcastChannel }: Props) {
  const { streamEnded, endedMessage, isGoingLive, playerRevision } = useUnityLiveViewerStatus(
    broadcastChannel,
    { initialStatus: "live", watchPage: true },
  )
  const [isLoading, setIsLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingMinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const liveSince = useLiveSince(livestream.startedAt)

  const iframeSrc = useMemo(() => {
    const base = livestream.viewUrl
    const sep = base.includes("?") ? "&" : "?"
    return `${base}${sep}_=${Date.now()}`
  }, [livestream.viewUrl, livestream.slug, playerRevision])

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

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.share) {
        await navigator.share({ title: livestream.title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not share link")
    }
  }

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
        title={seo?.title ?? `${livestream.title} | Unity Live`}
        description={seo?.description}
      />

      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <UnityLiveWatchHeader
          showLiveBadge={!streamEnded && !isGoingLive}
          trailing={
            <span className="hidden max-w-[200px] truncate text-sm text-neutral-500 dark:text-neutral-400 sm:inline lg:max-w-[280px]">
              {livestream.organizationName}
            </span>
          }
        />

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            <div className="min-w-0 flex-1">
              <div
                ref={playerContainerRef}
                className={`relative overflow-hidden bg-black shadow-2xl transition-[border-radius] ${
                  isFullscreen
                    ? "rounded-none ring-0"
                    : "rounded-2xl ring-2 ring-purple-500/25 dark:ring-purple-400/20"
                }`}
              >
                <div className="relative aspect-video w-full">
                  <iframe
                    ref={iframeRef}
                    key={`${livestream.slug}-${playerRevision}`}
                    src={iframeSrc}
                    title={livestream.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
                      isLoading || streamEnded ? "pointer-events-none opacity-0" : "opacity-100"
                    }`}
                    onLoad={handleIframeLoad}
                  />
                  {isGoingLive && !streamEnded ? <GoingLiveOverlay /> : null}
                  {streamEnded ? (
                    <StreamEndedOverlay
                      title={livestream.title}
                      hostName={livestream.organizationName}
                      message={endedMessage}
                    />
                  ) : null}
                  {isLoading && !streamEnded && !isGoingLive && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-950 dark:to-neutral-900">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-600 dark:text-purple-400" aria-hidden />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">Loading stream…</span>
                    </div>
                  )}
                  {!streamEnded && !isGoingLive ? (
                    <div className="absolute left-4 top-4 z-10">
                      <UnityLiveBadge size="md" />
                    </div>
                  ) : null}
                  {!streamEnded && !isGoingLive ? (
                    livestream.overlay ? (
                      <UnityLiveOverlayLayer overlay={livestream.overlay} hideLiveBadge />
                    ) : (
                      <UnityMeetVideoLogoOverlay className="z-20" />
                    )
                  ) : null}
                  {isFullscreen && (
                    <div
                      className={`pointer-events-none absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-200 ${
                        controlsVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <div className="pointer-events-auto flex items-center justify-between gap-4 p-4">
                        <span className="truncate text-sm font-medium text-white">
                          {livestream.title} · {livestream.organizationName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-white hover:bg-white/20"
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
                  className={`flex flex-wrap items-center gap-4 border-t border-neutral-200 bg-neutral-100/95 px-4 py-3 dark:border-white/10 dark:bg-neutral-900/95 ${
                    isFullscreen && !controlsVisible ? "invisible" : ""
                  } ${isFullscreen ? "absolute bottom-0 left-0 right-0 z-10 transition-opacity duration-200 " + (controlsVisible ? "opacity-100" : "opacity-0") : ""}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={handleMuteToggle}
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
                      <span className="hidden text-sm sm:inline">{muted ? "Unmute" : "Mute"}</span>
                    </Button>
                    <div className="flex min-w-[120px] max-w-[180px] items-center gap-2">
                      <Slider
                        value={[muted ? 0 : volume]}
                        onValueChange={handleVolumeChange}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                        aria-label="Volume"
                      />
                      <span className="w-8 shrink-0 tabular-nums text-xs text-neutral-500">
                        {muted ? "0" : volume}%
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 shrink-0 gap-2 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    <span className="hidden text-sm sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
                  </Button>
                </div>
              </div>

              <div className="mt-5 space-y-3 px-0.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold leading-tight text-neutral-900 dark:text-white sm:text-2xl">
                      {livestream.title}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1.5">
                        {livestream.hostType === "organization" ? (
                          <Building2 className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <UserRound className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
                        )}
                        {livestream.organizationName}
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span>{hostTypeLabel(livestream.hostType)}</span>
                      {liveSince ? (
                        <>
                          <span className="text-neutral-300 dark:text-neutral-600">·</span>
                          <span>{liveSince}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2 border-purple-500/30 text-purple-700 hover:bg-purple-500/5 dark:border-purple-400/30 dark:text-purple-300 dark:hover:bg-purple-500/10"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            <UnityLiveOtherStreamsSidebar
              streams={otherLivestreams}
              currentSlug={livestream.slug}
            />
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
