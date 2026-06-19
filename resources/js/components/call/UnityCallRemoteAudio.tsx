"use client"

import { useEffect, useRef } from "react"
import { applyRemoteAudioOutput } from "@/lib/callAudioOutput"

type Props = {
  stream: MediaStream
  speakerOn: boolean
}

export function UnityCallRemoteAudio({ stream, speakerOn }: Props) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = ref.current
    if (!audio) {
      return
    }

    audio.srcObject = stream
    audio.autoplay = true
    audio.volume = 1
    ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
    audio.setAttribute("playsinline", "true")
    audio.muted = false

    const ensurePlayback = () => {
      audio.muted = false
      audio.volume = 1
      void applyRemoteAudioOutput(audio, speakerOn).finally(() => {
        void audio.play().catch(() => {})
      })
    }

    ensurePlayback()
    audio.addEventListener("loadedmetadata", ensurePlayback)
    audio.addEventListener("canplay", ensurePlayback)

    const onTrackChange = () => ensurePlayback()
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true
      track.addEventListener("unmute", onTrackChange)
      track.addEventListener("mute", onTrackChange)
      track.addEventListener("ended", onTrackChange)
    })
    stream.addEventListener("addtrack", onTrackChange)
    stream.addEventListener("removetrack", onTrackChange)

    const retryTimers = [0, 150, 500, 1500, 3000, 5000].map((delay) =>
      window.setTimeout(ensurePlayback, delay),
    )

    const onVisibility = () => {
      ensurePlayback()
    }

    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      retryTimers.forEach((timer) => window.clearTimeout(timer))
      audio.removeEventListener("loadedmetadata", ensurePlayback)
      audio.removeEventListener("canplay", ensurePlayback)
      stream.getAudioTracks().forEach((track) => {
        track.removeEventListener("unmute", onTrackChange)
        track.removeEventListener("mute", onTrackChange)
        track.removeEventListener("ended", onTrackChange)
      })
      stream.removeEventListener("addtrack", onTrackChange)
      stream.removeEventListener("removetrack", onTrackChange)
      audio.srcObject = null
    }
  }, [stream, speakerOn])

  return (
    <audio
      ref={ref}
      data-unity-call-remote="1"
      autoPlay
      playsInline
      preload="auto"
      className="hidden"
      {...({ "x-webkit-airplay": "allow" } as Record<string, string>)}
    />
  )
}
