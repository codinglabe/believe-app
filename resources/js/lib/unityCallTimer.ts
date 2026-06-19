export function resolveUnityCallTimerAnchor(options: {
  answeredAt?: string | null
  callConnected: boolean
  mediaConnected: boolean
}): number | null {
  const { answeredAt, callConnected, mediaConnected } = options
  if (!callConnected || !mediaConnected || !answeredAt) {
    return null
  }

  const parsed = new Date(answeredAt).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

export function formatUnityCallElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

export function tickUnityCallElapsed(anchor: number): number {
  return Math.max(0, Math.floor((Date.now() - anchor) / 1000))
}
