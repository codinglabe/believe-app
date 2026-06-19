export type UnityCallBackgroundKeepAliveOptions = {
  title: string
  subtitle?: string
  onHangUp?: () => void
  localStream?: MediaStream | null
  remoteStream?: MediaStream | null
  speakerOn?: boolean
  /** When true, route remote audio only through Web Audio (HTML `<audio>` must stay idle). */
  preferWebAudioRemote?: boolean
  onResume?: () => void
}

export type UnityCallBackgroundKeepAliveHandle = {
  release: () => void
  resumePlayback: () => void
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null
  }

  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  )
}

function pauseHtmlRemotePlayback(): void {
  if (typeof document === "undefined") {
    return
  }

  document.querySelectorAll('audio[data-unity-call-remote="1"]').forEach((node) => {
    const audio = node as HTMLAudioElement
    audio.muted = true
    audio.pause()
  })
}

function resumeUnityCallRemotePlayback(): void {
  if (typeof document === "undefined") {
    return
  }

  document.querySelectorAll('audio[data-unity-call-remote="1"]').forEach((node) => {
    const audio = node as HTMLAudioElement
    audio.muted = false
    void audio.play().catch(() => {})
  })
}

export function startUnityCallBackgroundKeepAlive(
  options: UnityCallBackgroundKeepAliveOptions,
): UnityCallBackgroundKeepAliveHandle {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { release: () => {}, resumePlayback: () => {} }
  }

  let wakeLock: WakeLockSentinel | null = null
  let released = false
  let audioContext: AudioContext | null = null
  let oscillator: OscillatorNode | null = null
  let silentGain: GainNode | null = null
  let remoteSource: MediaStreamAudioSourceNode | null = null
  let remoteGain: GainNode | null = null
  let localSource: MediaStreamAudioSourceNode | null = null
  let localGain: GainNode | null = null
  let hiddenIntervalId = 0
  let remoteTrackListeners: (() => void) | null = null
  const preferWebAudioRemote = options.preferWebAudioRemote === true

  const ensureAudioContext = (): AudioContext | null => {
    const AudioContextCtor = getAudioContextCtor()
    if (!AudioContextCtor || released) {
      return null
    }

    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextCtor()
      oscillator = audioContext.createOscillator()
      silentGain = audioContext.createGain()
      silentGain.gain.value = 0.0001
      oscillator.connect(silentGain)
      silentGain.connect(audioContext.destination)
      oscillator.start()
    }

    return audioContext
  }

  const applyRemoteGain = () => {
    if (!remoteGain) {
      return
    }

    const level = options.speakerOn === false ? 0.55 : 1
    remoteGain.gain.value = level

    if (preferWebAudioRemote || document.visibilityState === "hidden") {
      pauseHtmlRemotePlayback()
      return
    }

    resumeUnityCallRemotePlayback()
  }

  const clearRemoteTrackListeners = () => {
    remoteTrackListeners?.()
    remoteTrackListeners = null
  }

  const watchRemoteStreamTracks = (stream: MediaStream) => {
    clearRemoteTrackListeners()

    const onTrackChange = () => {
      attachRemoteStream(stream)
    }

    stream.addEventListener("addtrack", onTrackChange)
    stream.addEventListener("removetrack", onTrackChange)
    remoteTrackListeners = () => {
      stream.removeEventListener("addtrack", onTrackChange)
      stream.removeEventListener("removetrack", onTrackChange)
    }
  }

  const attachRemoteStream = (stream: MediaStream | null | undefined) => {
    clearRemoteTrackListeners()
    remoteSource?.disconnect()
    remoteSource = null
    remoteGain?.disconnect()
    remoteGain = null

    if (!stream || stream.getAudioTracks().length === 0) {
      return
    }

    const context = ensureAudioContext()
    if (!context) {
      return
    }

    try {
      remoteSource = context.createMediaStreamSource(stream)
      remoteGain = context.createGain()
      applyRemoteGain()
      remoteSource.connect(remoteGain)
      remoteGain.connect(context.destination)
      watchRemoteStreamTracks(stream)
    } catch {
      // Fall back to HTMLAudioElement playback only.
    }
  }

  const attachLocalStream = (stream: MediaStream | null | undefined) => {
    localSource?.disconnect()
    localSource = null
    localGain?.disconnect()
    localGain = null

    if (!stream || stream.getAudioTracks().length === 0) {
      return
    }

    const context = ensureAudioContext()
    if (!context) {
      return
    }

    try {
      localSource = context.createMediaStreamSource(stream)
      localGain = context.createGain()
      localGain.gain.value = 0
      localSource.connect(localGain)
      localGain.connect(context.destination)
    } catch {
      // ignore — mic capture may still work without this loop
    }
  }

  const resumeCaptureTracks = () => {
    options.localStream?.getAudioTracks().forEach((track) => {
      if (track.readyState === "live" && track.enabled) {
        track.enabled = true
      }
    })

    options.remoteStream?.getAudioTracks().forEach((track) => {
      track.enabled = true
    })
  }

  const resumeAll = () => {
    if (released) {
      return
    }

    void ensureAudioContext()?.resume()
    applyRemoteGain()
    resumeCaptureTracks()
    if (!preferWebAudioRemote) {
      resumeUnityCallRemotePlayback()
    }
    options.onResume?.()
  }

  const acquireWakeLock = async () => {
    if (released || !("wakeLock" in navigator)) {
      return
    }

    try {
      wakeLock?.release().catch(() => {})
      wakeLock = await navigator.wakeLock.request("screen")
      wakeLock.addEventListener("release", () => {
        if (!released && document.visibilityState === "visible") {
          void acquireWakeLock()
        }
      })
    } catch {
      // Unavailable when screen is already off — audio keep-alive still runs.
    }
  }

  const configureMediaSession = () => {
    if (!("mediaSession" in navigator)) {
      return
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: options.title,
        artist: options.subtitle ?? "Believe In Unity voice call",
        album: "Voice call",
      })
      navigator.mediaSession.playbackState = "playing"

      navigator.mediaSession.setActionHandler("play", () => {
        resumeAll()
      })
      navigator.mediaSession.setActionHandler("pause", () => {
        resumeAll()
      })

      if (options.onHangUp) {
        navigator.mediaSession.setActionHandler("hangup", () => {
          options.onHangUp?.()
        })
      }
    } catch {
      // Some browsers reject certain action handlers.
    }
  }

  const onLifecycle = () => {
    if (released) {
      return
    }

    resumeAll()

    if (document.visibilityState === "visible") {
      void acquireWakeLock()
    }
  }

  const startHiddenKeepAlive = () => {
    if (hiddenIntervalId) {
      return
    }

    hiddenIntervalId = window.setInterval(() => {
      if (released) {
        return
      }

      resumeAll()
    }, document.visibilityState === "hidden" ? 900 : 2500)
  }

  const resetHiddenKeepAlive = () => {
    if (hiddenIntervalId) {
      window.clearInterval(hiddenIntervalId)
      hiddenIntervalId = 0
    }
    startHiddenKeepAlive()
  }

  const onVisibilityChange = () => {
    resetHiddenKeepAlive()
    onLifecycle()
  }

  attachRemoteStream(options.remoteStream)
  attachLocalStream(options.localStream)
  void acquireWakeLock()
  configureMediaSession()
  resumeAll()
  startHiddenKeepAlive()

  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("pageshow", onLifecycle)
  window.addEventListener("focus", onLifecycle)
  window.addEventListener("pagehide", resumeAll)

  return {
    resumePlayback: resumeAll,
    release: () => {
      if (released) {
        return
      }
      released = true

      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("pageshow", onLifecycle)
      window.removeEventListener("focus", onLifecycle)
      window.removeEventListener("pagehide", resumeAll)
      if (hiddenIntervalId) {
        window.clearInterval(hiddenIntervalId)
        hiddenIntervalId = 0
      }

      void wakeLock?.release().catch(() => {})
      wakeLock = null

      clearRemoteTrackListeners()
      remoteSource?.disconnect()
      remoteGain?.disconnect()
      localSource?.disconnect()
      localGain?.disconnect()
      remoteSource = null
      remoteGain = null
      localSource = null
      localGain = null

      try {
        oscillator?.stop()
      } catch {
        // ignore
      }
      oscillator = null
      silentGain = null
      void audioContext?.close()
      audioContext = null

      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.playbackState = "none"
          navigator.mediaSession.metadata = null
          navigator.mediaSession.setActionHandler("play", null)
          navigator.mediaSession.setActionHandler("pause", null)
          navigator.mediaSession.setActionHandler("hangup", null)
        } catch {
          // ignore
        }
      }
    },
  }
}
