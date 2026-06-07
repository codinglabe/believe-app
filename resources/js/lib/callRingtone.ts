import { getCallRingtoneMode, loadCustomCallRingtoneBlob } from "@/lib/callRingtoneSettings"

type RingtoneController = {
  stop: () => void
}

let activeController: RingtoneController | null = null

function stopActiveRingtone(): void {
  activeController?.stop()
  activeController = null
}

function playDefaultRingtone(): RingtoneController {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) {
    return { stop: () => {} }
  }

  const ctx = new AudioContextClass()
  let intervalId = 0
  let stopped = false

  const playBurst = () => {
    if (stopped) {
      return
    }
    const now = ctx.currentTime
    const duration = 1.2
    ;[440, 480].forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + duration)
    })
  }

  void ctx.resume().then(() => {
    playBurst()
    intervalId = window.setInterval(playBurst, 3000)
  })

  return {
    stop: () => {
      stopped = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      void ctx.close().catch(() => {})
    },
  }
}

async function playCustomRingtone(): Promise<RingtoneController | null> {
  const blob = await loadCustomCallRingtoneBlob()
  if (!blob) {
    return null
  }

  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.loop = true
  void audio.play().catch(() => {})

  return {
    stop: () => {
      audio.pause()
      audio.currentTime = 0
      URL.revokeObjectURL(url)
    },
  }
}

export async function startCallRingtone(): Promise<void> {
  stopActiveRingtone()

  let controller: RingtoneController | null = null

  if (getCallRingtoneMode() === "custom") {
    controller = await playCustomRingtone()
  }

  if (!controller) {
    controller = playDefaultRingtone()
  }

  activeController = controller

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate([500, 250, 500, 250, 500])
  }
}

export function stopCallRingtone(): void {
  stopActiveRingtone()
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(0)
  }
}
