"use client"

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  RotateCcw,
  MoreHorizontal,
  Captions,
  Loader2,
  ArrowLeft,
  Heart,
} from "lucide-react"
import { Link } from "@inertiajs/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        config: Record<string, unknown>
      ) => YTPlayer
      PlayerState?: { UNSTARTED: number; ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  getDuration: () => number
  getCurrentTime: () => number
  getPlayerState: () => number
  destroy: () => void
}

const PLAYING = 1
const PAUSED = 2
const ENDED = 0
const BUFFERING = 3

export interface ShortsVideoPlayerProps {
  videoId: string
  title?: string
  likesFormatted?: string
  commentCountFormatted?: string
  userLiked?: boolean
  likeLoading?: boolean
  onLike?: () => void
  onShare?: () => void
  channelSlug?: string | null
  creator?: string | null
  creatorAvatar?: string | null
  className?: string
}

export function ShortsVideoPlayer({
  videoId,
  title,
  likesFormatted = "0",
  commentCountFormatted = "0",
  userLiked = false,
  likeLoading = false,
  onLike,
  onShare,
  channelSlug,
  creator,
  creatorAvatar,
  className,
}: ShortsVideoPlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elementId = "shorts-video-player-" + videoId

  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const stopTimeTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  const startTimeTracking = useCallback(() => {
    stopTimeTracking()
    progressIntervalRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p) return
      const t = p.getCurrentTime()
      const d = p.getDuration()
      if (Number.isFinite(t)) setCurrentTime(t)
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }, 100)
  }, [stopTimeTracking])

  const onPlayerReady = useCallback((e: { target: YTPlayer }) => {
    const p = e.target
    playerRef.current = p
    setIsReady(true)
    setIsBuffering(false)
    const d = p.getDuration()
    if (Number.isFinite(d) && d > 0) setDuration(d)
    setVolume(p.getVolume?.() ?? 100)
    setIsMuted(p.isMuted?.() ?? false)
  }, [])

  const onStateChange = useCallback(
    (event: { data: number }) => {
      const state = event.data
      if (state === PLAYING) {
        setIsPlaying(true)
        setIsBuffering(false)
        if (playerRef.current) {
          const d = playerRef.current.getDuration()
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }
        startTimeTracking()
      } else if (state === PAUSED) {
        setIsPlaying(false)
        setIsBuffering(false)
        stopTimeTracking()
      } else if (state === BUFFERING) {
        setIsBuffering(true)
      } else if (state === ENDED) {
        setIsPlaying(false)
        stopTimeTracking()
      }
    },
    [startTimeTracking, stopTimeTracking]
  )

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pauseVideo()
      stopTimeTracking()
    } else {
      playerRef.current.playVideo()
      startTimeTracking()
    }
  }, [isPlaying, startTimeTracking, stopTimeTracking])

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return
    if (isMuted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(volume || 50)
      setIsMuted(false)
    } else {
      playerRef.current.mute()
      setIsMuted(true)
    }
  }, [isMuted, volume])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleSeek = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!playerRef.current || !progressRef.current || !duration) return
      const rect = progressRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const seekTime = ratio * duration
      playerRef.current.seekTo(seekTime, true)
      setCurrentTime(seekTime)
    },
    [duration]
  )

  const handleShare = useCallback(() => {
    if (onShare) {
      onShare()
    } else {
      const url = `${window.location.origin}/community-videos/shorts/yt/${videoId}${channelSlug ? `?channel_slug=${encodeURIComponent(channelSlug)}&creator=${encodeURIComponent(creator || "")}` : ""}`
      if (navigator.share) {
        navigator.share({ title: title || "Short", url }).catch(() => navigator.clipboard.writeText(url))
      } else {
        navigator.clipboard.writeText(url)
      }
    }
  }, [onShare, videoId, channelSlug, creator, title])

  useEffect(() => {
    if (!videoId) return
    const createPlayer = () => {
      if (!document.getElementById(elementId)) {
        requestAnimationFrame(createPlayer)
        return
      }
      if (!window.YT?.Player) return
      try {
        const player = new window.YT.Player(elementId, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            cc_load_policy: 0,
            enablejsapi: 1,
            origin: typeof window !== "undefined" ? window.location.origin : "",
            playsinline: 1,
          },
          events: { onReady: onPlayerReady, onStateChange },
        }) as unknown as YTPlayer
        playerRef.current = player
      } catch {
        const el = document.getElementById(elementId)
        if (el) {
          el.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?enablejsapi=1&modestbranding=1&rel=0&controls=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&playsinline=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="pointer-events:none;"></iframe>`
        }
      }
    }
    const loadApi = () => {
      if (window.YT?.Player) {
        createPlayer()
        return () => {
          stopTimeTracking()
          if (playerRef.current?.destroy) playerRef.current.destroy()
          playerRef.current = null
          setIsReady(false)
        }
      }
      setTimeout(loadApi, 100)
    }
    if (window.YT?.Player) {
      return loadApi()
    }
    window.onYouTubeIframeAPIReady = loadApi
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    document.head.appendChild(script)
    return () => {
      window.onYouTubeIframeAPIReady = undefined
      stopTimeTracking()
      if (playerRef.current?.destroy) playerRef.current.destroy()
      playerRef.current = null
      setIsReady(false)
    }
  }, [videoId, elementId, onPlayerReady, onStateChange, stopTimeTracking])

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const btnClass = "flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full min-h-[100dvh] overflow-hidden bg-black select-none", className)}
      aria-label={title ? `Short: ${title}` : "Shorts player"}
      onMouseMove={showControlsTemporarily}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-shorts-controls]")) return
        if (!hasStarted) return
        togglePlay()
        showControlsTemporarily()
      }}
    >
      {/* Video + all controls in one centered box so icons overlay the video, not the black bars */}
      <div className="absolute inset-0 flex justify-center items-center">
        <div className="relative w-full h-full max-w-[min(100vw,calc(78dvh*9/16))] max-h-[78dvh] aspect-[9/16] bg-black">
          {/* YouTube iframe - scaled up to push all branding outside visible area */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "scale(1.4)",
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            >
              <div id={elementId} className="w-full h-full" />
            </div>
          </div>

          {/* Full overlay to block ALL YouTube branding interactions */}
          <div className="absolute inset-0 z-10" style={{ pointerEvents: "auto" }} aria-hidden />

          {/* Thumbnail poster - completely hides YouTube branding before first play */}
          {!hasStarted && (
            <div
              className="absolute inset-0 z-30 flex items-center justify-center cursor-pointer"
              style={{
                backgroundImage: `url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: "#000",
              }}
              onClick={(e) => {
                e.stopPropagation()
                setHasStarted(true)
                if (playerRef.current) {
                  playerRef.current.playVideo()
                }
              }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <button
                type="button"
                className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30 border border-white/20 text-white transition-transform hover:scale-110 hover:opacity-90"
                aria-label="Play short"
              >
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              </button>
            </div>
          )}

          {isBuffering && hasStarted && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <Loader2 className="h-12 w-12 text-white/80 animate-spin" />
            </div>
          )}

          {!isPlaying && !isBuffering && isReady && hasStarted && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30 border border-white/20 flex items-center justify-center">
                <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Always-visible top gradient to mask YouTube title bar during playback */}
          {hasStarted && (
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/80 via-black/30 to-transparent z-15 pointer-events-none" />
          )}
          {/* Always-visible bottom gradient to mask YouTube watermark during playback */}
          {hasStarted && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent z-15 pointer-events-none" />
          )}

          {/* Top bar: Back, Play, Volume (left) | CC, More, Fullscreen (right) - overlays video */}
          <div
            data-shorts-controls
            className={cn(
              "absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-3 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-2">
              <Link
                href="/community-videos"
                onClick={(e) => e.stopPropagation()}
                className={btnClass}
                aria-label="Back to Community Videos"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <button type="button" onClick={(e) => {
                e.stopPropagation()
                if (!hasStarted) {
                  setHasStarted(true)
                  if (playerRef.current) playerRef.current.playVideo()
                } else {
                  togglePlay()
                }
              }} className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity" aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); toggleMute() }} className={btnClass} aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className={btnClass} aria-label="Closed captions">
                <Captions className="h-5 w-5" />
              </button>
              <button type="button" className={btnClass} aria-label="More options">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); toggleFullscreen() }} className={btnClass} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Right sidebar: Like, Dislike, Comments, Share, Remix, Channel avatar - same circular bg as top */}
          <div
            data-shorts-controls
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLike?.() }}
              disabled={likeLoading}
              className={cn("flex flex-col items-center gap-0.5 text-white", userLiked && "text-red-400")}
              aria-label={userLiked ? "Unlike" : "Like"}
            >
              <span className={btnClass}>
                {userLiked ? <Heart className="h-5 w-5 fill-current" /> : <ThumbsUp className="h-5 w-5" />}
              </span>
              <span className="text-xs font-medium">{likesFormatted}</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-0.5 text-white">
              <span className={btnClass}>
                <ThumbsDown className="h-5 w-5" />
              </span>
              <span className="text-xs">Dislike</span>
            </button>
            <div className="flex flex-col items-center gap-0.5 text-white">
              <span className={btnClass}>
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium">{commentCountFormatted}</span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); handleShare() }} className="flex flex-col items-center gap-0.5 text-white" aria-label="Share">
              <span className={btnClass}>
                <Share2 className="h-5 w-5" />
              </span>
              <span className="text-xs">Share</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-0.5 text-white">
              <span className={btnClass}>
                <RotateCcw className="h-5 w-5" />
              </span>
              <span className="text-xs">Remix</span>
            </button>
            {channelSlug && (
              <Link
                href={`/channel/${channelSlug}`}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 flex flex-col items-center gap-0.5"
              >
                <span className={cn(btnClass, "ring-2 ring-white/50")}>
                  <Avatar className="h-6 w-6">
                    {creatorAvatar && (creatorAvatar.startsWith("http") || creatorAvatar.startsWith("/")) && (
                      <AvatarImage src={creatorAvatar || "/placeholder.svg"} alt={creator ?? "Channel"} />
                    )}
                    <AvatarFallback className="bg-purple-600 text-white text-xs">{(creator ?? "?").charAt(0)}</AvatarFallback>
                  </Avatar>
                </span>
              </Link>
            )}
          </div>

          {/* Bottom progress bar - thin red, overlays video (positioned up so it stays visible) */}
          <div
            data-shorts-controls
            ref={progressRef}
            className={cn(
              "absolute bottom-4 left-2 right-2 z-20 h-1 rounded-full cursor-pointer bg-white/20 transition-opacity duration-300",
              showControls ? "opacity-100" : "opacity-70"
            )}
            onClick={(e) => { e.stopPropagation(); handleSeek(e) }}
            onMouseDown={(e) => {
              e.stopPropagation()
              handleSeek(e)
              const handleMouseMove = (ev: globalThis.MouseEvent) => {
                if (!progressRef.current || !duration) return
                const rect = progressRef.current.getBoundingClientRect()
                const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
                const seekTime = ratio * duration
                if (playerRef.current) playerRef.current.seekTo(seekTime, true)
                setCurrentTime(seekTime)
              }
              const handleMouseUp = () => {
                window.removeEventListener("mousemove", handleMouseMove)
                window.removeEventListener("mouseup", handleMouseUp)
              }
              window.addEventListener("mousemove", handleMouseMove)
              window.addEventListener("mouseup", handleMouseUp)
            }}
            role="slider"
            aria-label="Seek"
          >
            <div
              className="absolute top-0 left-0 h-full bg-red-600 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
