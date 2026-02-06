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
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        config: Record<string, unknown>
      ) => YTPlayer
      PlayerState?: {
        UNSTARTED: number
        ENDED: number
        PLAYING: number
        PAUSED: number
        BUFFERING: number
        CUED: number
      }
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
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  getAvailablePlaybackRates?: () => number[]
  destroy: () => void
}

const PLAYING = 1
const PAUSED = 2
const ENDED = 0
const BUFFERING = 3

export interface CommunityVideoPlayerProps {
  videoId: string
  title?: string
  className?: string
}

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export function CommunityVideoPlayer({ videoId, title, className }: CommunityVideoPlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elementId = "community-video-player-" + videoId

  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  const isSeekingRef = useRef(false)
  isSeekingRef.current = isSeeking

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
      if (!p || isSeekingRef.current) return
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
      if (isPlaying && !showSpeedMenu && !showVolumeSlider) setShowControls(false)
    }, 3000)
  }, [isPlaying, showSpeedMenu, showVolumeSlider])

  const handleMouseMove = useCallback(() => showControlsTemporarily(), [showControlsTemporarily])
  const handleMouseLeave = useCallback(() => {
    if (isPlaying && !showSpeedMenu && !showVolumeSlider) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 1000)
    }
  }, [isPlaying, showSpeedMenu, showVolumeSlider])

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

  const handleVolumeChange = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!playerRef.current || !volumeRef.current) return
      const rect = volumeRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newVolume = Math.round(ratio * 100)
      playerRef.current.setVolume(newVolume)
      setVolume(newVolume)
      if (newVolume === 0) {
        playerRef.current.mute()
        setIsMuted(true)
      } else if (isMuted) {
        playerRef.current.unMute()
        setIsMuted(false)
      }
    },
    [isMuted]
  )

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

  const handleProgressHover = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !duration) return
      const rect = progressRef.current.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      setHoverTime(ratio * duration)
      setHoverX(e.clientX - rect.left)
    },
    [duration]
  )

  const skipForward = useCallback(() => {
    if (!playerRef.current) return
    const newTime = Math.min(currentTime + 10, duration)
    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
  }, [currentTime, duration])

  const skipBackward = useCallback(() => {
    if (!playerRef.current) return
    const newTime = Math.max(currentTime - 10, 0)
    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
  }, [currentTime])

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

  const handleSpeedChange = useCallback((rate: number) => {
    if (!playerRef.current) return
    playerRef.current.setPlaybackRate(rate)
    setPlaybackRate(rate)
    setShowSpeedMenu(false)
  }, [])

  // Load YouTube IFrame API and create player
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
          events: {
            onReady: onPlayerReady,
            onStateChange,
          },
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
      loadApi()
      return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-init when videoId changes
  }, [videoId, elementId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current) return
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault()
          togglePlay()
          break
        case "ArrowLeft":
          e.preventDefault()
          skipBackward()
          break
        case "ArrowRight":
          e.preventDefault()
          skipForward()
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
        case "f":
          e.preventDefault()
          toggleFullscreen()
          break
        case "ArrowUp":
          e.preventDefault()
          if (playerRef.current) {
            const newVol = Math.min(100, volume + 5)
            playerRef.current.setVolume(newVol)
            setVolume(newVol)
            if (isMuted) {
              playerRef.current.unMute()
              setIsMuted(false)
            }
          }
          break
        case "ArrowDown":
          e.preventDefault()
          if (playerRef.current) {
            const newVol = Math.max(0, volume - 5)
            playerRef.current.setVolume(newVol)
            setVolume(newVol)
            if (newVol === 0) {
              playerRef.current.mute()
              setIsMuted(true)
            }
          }
          break
      }
      showControlsTemporarily()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [togglePlay, skipBackward, skipForward, toggleMute, toggleFullscreen, volume, isMuted, showControlsTemporarily])

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black select-none",
        className
      )}
      style={{ aspectRatio: "16/9" }}
      aria-label={title ? `Video: ${title}` : "Video player"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-controls]")) return
        togglePlay()
        showControlsTemporarily()
      }}
    >
      {/* YouTube iframe container - slightly oversized to crop branding */}
      <div className="absolute z-0" style={{ inset: "-20px", overflow: "hidden" }}>
        <div
          id={elementId}
          className="w-full h-full"
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            bottom: "20px",
            width: "calc(100% - 40px)",
            height: "calc(100% - 40px)",
          }}
        />
      </div>

      {/* Transparent overlay to block YouTube branding clicks & hide YT UI */}
      <div className="absolute inset-0 z-10" />

      {isBuffering && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-white/80 animate-spin" />
        </div>
      )}

      {!isPlaying && !isBuffering && isReady && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              togglePlay()
            }}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30 border border-white/20 text-white transition-transform hover:scale-110 hover:opacity-90"
            aria-label="Play"
          >
            <Play className="h-8 w-8 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 pointer-events-none transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        data-controls
        className={cn(
          "absolute bottom-0 left-0 right-0 z-40 px-4 pb-4 transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div
          ref={progressRef}
          className="group relative h-1.5 mb-3 cursor-pointer rounded-full hover:h-2.5 transition-all bg-white/25"
          onClick={(e) => {
            e.stopPropagation()
            handleSeek(e)
          }}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={(e) => {
            e.stopPropagation()
            setIsSeeking(true)
            handleSeek(e)
            const handleMouseMoveSeek = (ev: globalThis.MouseEvent) => {
              if (!progressRef.current || !duration) return
              const rect = progressRef.current.getBoundingClientRect()
              const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
              const seekTime = ratio * duration
              if (playerRef.current) playerRef.current.seekTo(seekTime, true)
              setCurrentTime(seekTime)
            }
            const handleMouseUpSeek = () => {
              setIsSeeking(false)
              window.removeEventListener("mousemove", handleMouseMoveSeek)
              window.removeEventListener("mouseup", handleMouseUpSeek)
            }
            window.addEventListener("mousemove", handleMouseMoveSeek)
            window.addEventListener("mouseup", handleMouseUpSeek)
          }}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          tabIndex={0}
        >
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/40 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
          {hoverTime !== null && (
            <div
              className="absolute -top-9 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 transition-opacity"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 ml-0.5" fill="currentColor" />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); skipBackward() }}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Skip back 10 seconds"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); skipForward() }}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleMute() }}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <div
                className={cn(
                  "flex items-center overflow-hidden transition-all duration-200",
                  showVolumeSlider ? "w-24 ml-1 opacity-100" : "w-0 opacity-0"
                )}
              >
                <div
                  ref={volumeRef}
                  className="relative h-1 w-24 rounded-full cursor-pointer bg-white/25"
                  onClick={(e) => { e.stopPropagation(); handleVolumeChange(e) }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleVolumeChange(e)
                    const handleMouseMoveVol = (ev: globalThis.MouseEvent) => {
                      if (!volumeRef.current || !playerRef.current) return
                      const rect = volumeRef.current.getBoundingClientRect()
                      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
                      const newVol = Math.round(ratio * 100)
                      playerRef.current.setVolume(newVol)
                      setVolume(newVol)
                      if (newVol === 0) {
                        playerRef.current.mute()
                        setIsMuted(true)
                      } else if (isMuted) {
                        playerRef.current.unMute()
                        setIsMuted(false)
                      }
                    }
                    const handleMouseUpVol = () => {
                      window.removeEventListener("mousemove", handleMouseMoveVol)
                      window.removeEventListener("mouseup", handleMouseUpVol)
                    }
                    window.addEventListener("mousemove", handleMouseMoveVol)
                    window.addEventListener("mouseup", handleMouseUpVol)
                  }}
                  role="slider"
                  aria-label="Volume"
                  aria-valuenow={isMuted ? 0 : volume}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  tabIndex={0}
                >
                  <div className="absolute top-0 left-0 h-full rounded-full bg-white" style={{ width: `${isMuted ? 0 : volume}%` }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow"
                    style={{ left: `${isMuted ? 0 : volume}%` }}
                  />
                </div>
              </div>
            </div>
            <span className="text-white/90 text-sm font-mono ml-2 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu) }}
                className="flex items-center justify-center h-10 px-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                aria-label="Playback speed"
              >
                <Settings className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div
                  className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-white/50 text-xs font-medium uppercase tracking-wider border-b border-white/10">Speed</div>
                  {SPEEDS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleSpeedChange(rate)}
                      className={cn(
                        "flex items-center w-full px-4 py-2 text-sm transition-colors",
                        playbackRate === rate ? "text-purple-400 bg-white/10" : "text-white hover:bg-white/5"
                      )}
                    >
                      {rate === 1 ? "Normal" : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Top gradient to cover YouTube's title bar branding */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 via-black/50 to-transparent z-20 pointer-events-none transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}
