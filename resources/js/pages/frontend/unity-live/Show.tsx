"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Slider } from "@/components/frontend/ui/slider"
import {
  Loader2,
  Maximize2,
  Minimize2,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react"
import toast from "react-hot-toast"
import { useUnityLiveViewerStatus } from "@/hooks/useUnityLiveViewerStatus"
import { useUnityLiveViewerPresence } from "@/hooks/useUnityLiveViewerPresence"
import { useStreamElapsed } from "@/hooks/useStreamElapsed"
import StreamEndedOverlay from "@/components/unity-live/StreamEndedOverlay"
import GoingLiveOverlay from "@/components/unity-live/GoingLiveOverlay"
import UnityLiveOverlayLayer from "@/components/unity-live/UnityLiveOverlayLayer"
import UnityMeetVideoLogoOverlay from "@/components/meeting/UnityMeetVideoLogoOverlay"
import { UnityLiveBadge } from "@/components/unity-live/UnityLiveBadge"
import { UnityLiveOtherStreamsSidebar } from "@/components/unity-live/UnityLiveOtherStreamsSidebar"
import { UnityLiveWatchHeader } from "@/components/unity-live/UnityLiveWatchHeader"
import { UnityLiveHostActions } from "@/components/unity-live/UnityLiveHostActions"
import { UnityLiveEarnRewardsBar } from "@/components/unity-live/UnityLiveEarnRewardsBar"
import { UnityLiveStreamInfoSection } from "@/components/unity-live/UnityLiveStreamInfoSection"
import { UnityLiveLiveChat } from "@/components/unity-live/UnityLiveLiveChat"
import {
  UnityLiveCtaBanner,
  UnityLiveDonationBanner,
  UnityLiveSponsorBanner,
} from "@/components/unity-live/UnityLiveBelowPlayerBanners"
import DonationModal from "@/components/frontend/donation-modal"
import {
  type UnityLiveEarnSaveLinks,
  type UnityLiveStreamItem,
} from "@/lib/unity-live-display"

interface Props {
  seo?: { title?: string; description?: string }
  livestream: UnityLiveStreamItem
  otherLivestreams: UnityLiveStreamItem[]
  broadcastChannel: string
  earnSaveLinks: UnityLiveEarnSaveLinks
}

export default function UnityLiveShow({
  seo,
  livestream,
  otherLivestreams,
  broadcastChannel,
  earnSaveLinks,
}: Props) {
  const { streamEnded, endedMessage, isGoingLive, playerRevision } = useUnityLiveViewerStatus(
    broadcastChannel,
    { initialStatus: "live", watchPage: true },
  )
  const { viewerCount } = useUnityLiveViewerPresence(livestream.slug, livestream.viewerCount ?? 0)
  const streamElapsed = useStreamElapsed(livestream.startedAt)
  const [isLoading, setIsLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [donateOpen, setDonateOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingMinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hostProfile = livestream.hostProfile

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

  const openDonate = useCallback(() => {
    if (hostProfile?.canDonate) {
      setDonateOpen(true)
    }
  }, [hostProfile?.canDonate])

  return (
    <FrontendLayout>
      <PageHead
        title={seo?.title ?? `${livestream.title} | Unity Live`}
        description={seo?.description}
      />

      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <UnityLiveWatchHeader
          showLiveBadge={!streamEnded && !isGoingLive}
          title={livestream.title}
          viewerCount={viewerCount}
          actions={
            hostProfile ? (
              <UnityLiveHostActions
                hostProfile={hostProfile}
                onShare={handleShare}
                size="sm"
                donateOpen={donateOpen}
                onDonateOpenChange={setDonateOpen}
              />
            ) : null
          }
        />

        <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:py-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_min(340px,32vw)] lg:items-start lg:gap-6">
            <div className="min-w-0 space-y-5">
              <div
                ref={playerContainerRef}
                className={`group/player relative overflow-hidden bg-black shadow-2xl transition-[border-radius] ${
                  isFullscreen
                    ? "rounded-none ring-0"
                    : "rounded-2xl ring-1 ring-neutral-800"
                }`}
              >
                <div className="relative aspect-video w-full bg-neutral-950">
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
                    <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
                      <UnityLiveBadge size="md" />
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
                        {viewerCount.toLocaleString()} watching
                      </span>
                      {streamElapsed ? (
                        <span className="rounded-md bg-black/60 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-white backdrop-blur">
                          {streamElapsed}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {!streamEnded && !isGoingLive ? (
                    livestream.overlay ? (
                      <UnityLiveOverlayLayer
                        overlay={livestream.overlay}
                        hideLiveBadge
                        belowPlayerChrome
                      />
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

                {!isFullscreen && !streamEnded && !isGoingLive ? (
                  <div className="flex flex-wrap items-center gap-3 border-t border-neutral-800 bg-neutral-950 px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-2 text-neutral-300 hover:bg-white/10 hover:text-white"
                        onClick={handleMuteToggle}
                        aria-label={muted ? "Unmute" : "Mute"}
                      >
                        {muted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
                        <span className="hidden text-sm sm:inline">{muted ? "Unmute" : "Mute"}</span>
                      </Button>
                      <div className="flex min-w-[100px] max-w-[200px] flex-1 items-center gap-2">
                        <Slider
                          value={[muted ? 0 : volume]}
                          onValueChange={handleVolumeChange}
                          min={0}
                          max={100}
                          step={5}
                          className="w-full"
                          aria-label="Volume"
                        />
                        <span className="hidden w-8 shrink-0 tabular-nums text-xs text-neutral-400 sm:inline">
                          {muted ? "0" : volume}%
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 shrink-0 gap-2 text-neutral-300 hover:bg-white/10 hover:text-white"
                        aria-label="Settings"
                      >
                        <Settings className="h-4 w-4" />
                        <span className="hidden text-sm lg:inline">Settings</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 shrink-0 gap-2 text-neutral-300 hover:bg-white/10 hover:text-white"
                        onClick={toggleFullscreen}
                        aria-label="Fullscreen"
                      >
                        <Maximize2 className="h-4 w-4" />
                        <span className="hidden text-sm lg:inline">Fullscreen</span>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {!streamEnded && !isGoingLive ? (
                <div className="space-y-2.5">
                  <UnityLiveSponsorBanner overlay={livestream.overlay} />
                  <UnityLiveDonationBanner overlay={livestream.overlay} onCtaClick={openDonate} />
                  <UnityLiveCtaBanner overlay={livestream.overlay} onCtaClick={openDonate} />
                </div>
              ) : null}

              {!streamEnded && !isGoingLive ? (
                <UnityLiveEarnRewardsBar
                  links={earnSaveLinks}
                  overlay={livestream.overlay}
                  onDonate={openDonate}
                />
              ) : null}

              <div className="px-0.5 md:hidden">
                <h1 className="text-xl font-bold leading-tight text-neutral-900 dark:text-white">
                  {livestream.title}
                </h1>
              </div>

              {!streamEnded ? (
                <UnityLiveStreamInfoSection
                  livestream={livestream}
                  viewerCount={viewerCount}
                  chatCount={0}
                  onShare={handleShare}
                  donateOpen={donateOpen}
                  onDonateOpenChange={setDonateOpen}
                />
              ) : null}
            </div>

            <aside className="flex w-full min-w-0 flex-col gap-4 lg:sticky lg:top-[4.25rem] lg:self-start">
              <UnityLiveOtherStreamsSidebar
                streams={otherLivestreams}
                currentSlug={livestream.slug}
              />
              {!streamEnded && !isGoingLive ? (
                <UnityLiveLiveChat
                  slug={livestream.slug}
                  broadcastChannel={broadcastChannel}
                  viewerCount={viewerCount}
                  className="lg:flex-1"
                />
              ) : null}
            </aside>
          </div>
        </div>
      </div>

      {hostProfile?.donationOrganization ? (
        <DonationModal
          isOpen={donateOpen}
          onClose={() => setDonateOpen(false)}
          organization={hostProfile.donationOrganization}
        />
      ) : null}
    </FrontendLayout>
  )
}
