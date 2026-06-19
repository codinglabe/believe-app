export type UnityCallBackgroundKeepAliveOptions = {
  title: string
  subtitle?: string
  onHangUp?: () => void
}

export type UnityCallBackgroundKeepAliveHandle = {
  release: () => void
  resumePlayback: () => void
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
  let gainNode: GainNode | null = null

  const acquireWakeLock = async () => {
    if (released || !("wakeLock" in navigator)) {
      return
    }

    try {
      wakeLock?.release().catch(() => {})
      wakeLock = await navigator.wakeLock.request("screen")
    } catch {
      // Screen wake lock may be unavailable when screen is already off.
    }
  }

  const startSilentAudioContext = () => {
    if (released) {
      return
    }

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) {
        return
      }

      if (!audioContext || audioContext.state === "closed") {
        audioContext = new AudioContextCtor()
        oscillator = audioContext.createOscillator()
        gainNode = audioContext.createGain()
        gainNode.gain.value = 0.0001
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.start()
      }

      void audioContext.resume()
    } catch {
      // ignore — best-effort keep-alive for mobile background audio
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

      if (options.onHangUp) {
        navigator.mediaSession.setActionHandler("hangup", () => {
          options.onHangUp?.()
        })
      }
    } catch {
      // Some browsers reject certain action handlers.
    }
  }

  const onVisibilityChange = () => {
    if (released) {
      return
    }

    resumeUnityCallRemotePlayback()
    startSilentAudioContext()

    if (document.visibilityState === "visible") {
      void acquireWakeLock()
    }
  }

  void acquireWakeLock()
  startSilentAudioContext()
  configureMediaSession()
  resumeUnityCallRemotePlayback()

  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("pageshow", onVisibilityChange)
  window.addEventListener("focus", onVisibilityChange)

  const intervalId = window.setInterval(() => {
    if (released) {
      return
    }

    resumeUnityCallRemotePlayback()
    startSilentAudioContext()
  }, 2500)

  return {
    resumePlayback: resumeUnityCallRemotePlayback,
    release: () => {
      if (released) {
        return
      }
      released = true

      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("pageshow", onVisibilityChange)
      window.removeEventListener("focus", onVisibilityChange)
      window.clearInterval(intervalId)

      void wakeLock?.release().catch(() => {})
      wakeLock = null

      try {
        oscillator?.stop()
      } catch {
        // ignore
      }
      oscillator = null
      gainNode = null
      void audioContext?.close()
      audioContext = null

      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.playbackState = "none"
          navigator.mediaSession.metadata = null
          navigator.mediaSession.setActionHandler("hangup", null)
        } catch {
          // ignore
        }
      }
    },
  }
}
