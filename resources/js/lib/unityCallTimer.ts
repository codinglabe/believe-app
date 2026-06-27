let serverClockOffsetMs = 0

/** Align elapsed time with Laravel server clock (Reverb payloads include serverNow). */
export function syncUnityCallServerClock(serverNow?: string | null): void {
  if (!serverNow) {
    return
  }

  const serverMs = new Date(serverNow).getTime()
  if (!Number.isFinite(serverMs)) {
    return
  }

  serverClockOffsetMs = serverMs - Date.now()
}

export function unityCallNowMs(): number {
  return Date.now() + serverClockOffsetMs
}

export function resolveUnityCallTimerAnchor(options: {
  answeredAt?: string | null
  callStatus?: string
}): number | null {
  const { answeredAt, callStatus } = options
  if (callStatus !== "accepted" || !answeredAt) {
    return null
  }

  const parsed = new Date(answeredAt).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

const stickyTimerAnchorByCallId = new Map<number, number>()

/** Keep one timer anchor per call — survives minimize, mute, and brief state flicker. */
export function resolveStickyUnityCallTimerAnchor(
  callId: number,
  options: {
    answeredAt?: string | null
    callStatus?: string
  },
): number | null {
  if (callId <= 0) {
    return null
  }

  const status = options.callStatus ?? ""
  if (["ended", "cancelled", "declined", "missed"].includes(status)) {
    stickyTimerAnchorByCallId.delete(callId)
    return null
  }

  const resolved = resolveUnityCallTimerAnchor(options)
  if (resolved !== null) {
    const existing = stickyTimerAnchorByCallId.get(callId)
    if (existing === undefined || resolved < existing) {
      stickyTimerAnchorByCallId.set(callId, resolved)
    }
  }

  return stickyTimerAnchorByCallId.get(callId) ?? null
}

export function clearUnityCallTimerAnchor(callId: number): void {
  if (callId > 0) {
    stickyTimerAnchorByCallId.delete(callId)
  }
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
  return Math.max(0, Math.floor((unityCallNowMs() - anchor) / 1000))
}
