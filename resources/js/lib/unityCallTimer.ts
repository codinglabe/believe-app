let serverClockOffsetMs = 0

/** Align elapsed time with Laravel server clock — only from fresh payloads. */
export function syncUnityCallServerClock(serverNow?: string | null): void {
  if (!serverNow) {
    return
  }

  const serverMs = new Date(serverNow).getTime()
  if (!Number.isFinite(serverMs)) {
    return
  }

  const driftMs = Math.abs(serverMs - Date.now())
  if (driftMs > 15_000) {
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

const lockedTimerAnchorByCallId = new Map<number, number>()
const elapsedListenersByCallId = new Map<number, Set<() => void>>()
let globalTimerIntervalId = 0

function isTerminalCallStatus(status: string): boolean {
  return ["ended", "cancelled", "declined", "missed"].includes(status)
}

function ensureGlobalTimerTicker(): void {
  if (globalTimerIntervalId || typeof window === "undefined") {
    return
  }

  globalTimerIntervalId = window.setInterval(() => {
    lockedTimerAnchorByCallId.forEach((_anchor, callId) => {
      const listeners = elapsedListenersByCallId.get(callId)
      listeners?.forEach((listener) => listener())
    })
  }, 1000)
}

function stopGlobalTimerTickerIfIdle(): void {
  if (elapsedListenersByCallId.size > 0 || lockedTimerAnchorByCallId.size > 0) {
    return
  }

  if (globalTimerIntervalId) {
    window.clearInterval(globalTimerIntervalId)
    globalTimerIntervalId = 0
  }
}

/** Lock timer start once per call — never moves forward on later state updates. */
export function ensureUnityCallTimerAnchor(
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
  if (isTerminalCallStatus(status)) {
    clearUnityCallTimerAnchor(callId)
    return null
  }

  if (!lockedTimerAnchorByCallId.has(callId)) {
    const resolved = resolveUnityCallTimerAnchor(options)
    if (resolved !== null) {
      lockedTimerAnchorByCallId.set(callId, resolved)
    }
  }

  return lockedTimerAnchorByCallId.get(callId) ?? null
}

export function getUnityCallTimerAnchor(callId: number): number | null {
  if (callId <= 0) {
    return null
  }

  return lockedTimerAnchorByCallId.get(callId) ?? null
}

export function clearUnityCallTimerAnchor(callId: number): void {
  if (callId <= 0) {
    return
  }

  lockedTimerAnchorByCallId.delete(callId)
  elapsedListenersByCallId.delete(callId)
  stopGlobalTimerTickerIfIdle()
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

export function subscribeUnityCallElapsed(callId: number, listener: () => void): () => void {
  if (callId <= 0 || typeof window === "undefined") {
    return () => {}
  }

  let listeners = elapsedListenersByCallId.get(callId)
  if (!listeners) {
    listeners = new Set()
    elapsedListenersByCallId.set(callId, listeners)
  }

  listeners.add(listener)
  ensureGlobalTimerTicker()

  return () => {
    const current = elapsedListenersByCallId.get(callId)
    current?.delete(listener)
    if (current && current.size === 0) {
      elapsedListenersByCallId.delete(callId)
    }
    stopGlobalTimerTickerIfIdle()
  }
}

/** @deprecated Use ensureUnityCallTimerAnchor */
export function resolveStickyUnityCallTimerAnchor(
  callId: number,
  options: {
    answeredAt?: string | null
    callStatus?: string
  },
): number | null {
  return ensureUnityCallTimerAnchor(callId, options)
}
