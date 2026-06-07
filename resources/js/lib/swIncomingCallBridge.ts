import { router } from "@inertiajs/react"
import { buildIncomingCallFromPush, dispatchUnityCallIncoming } from "@/lib/unityCallEvents"

export const SW_INCOMING_CALL_MESSAGE = "unity-call-incoming-push"

type SwIncomingCallMessage = {
  type: typeof SW_INCOMING_CALL_MESSAGE
  data: Record<string, string | undefined>
}

function readAuthUserId(): number | null {
  if (typeof document === "undefined") {
    return null
  }
  const raw = document.querySelector('meta[name="user-id"]')?.getAttribute("content")
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) && id > 0 ? id : null
}

function resolveRingVisitPath(data: Record<string, string | undefined>): string | null {
  const ringUrl = data.ring_url || data.join_url || data.click_action || data.url
  if (!ringUrl || typeof window === "undefined") {
    return null
  }

  try {
    const target = new URL(ringUrl, window.location.origin)
    return `${target.pathname}${target.search}`
  } catch {
    return null
  }
}

function isOnIncomingCallRingScreen(data: Record<string, string | undefined>): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const visitPath = resolveRingVisitPath(data)
  if (!visitPath) {
    return false
  }

  const currentPath = `${window.location.pathname}${window.location.search}`
  return currentPath === visitPath
}

function navigateToIncomingCallRingScreen(data: Record<string, string | undefined>): void {
  const visitPath = resolveRingVisitPath(data)
  if (!visitPath || isOnIncomingCallRingScreen(data)) {
    return
  }

  router.visit(visitPath)
}

export function handleSwIncomingCallPayload(data: Record<string, string | undefined>): void {
  const userId = readAuthUserId()
  if (!userId || data.type !== "incoming_call") {
    return
  }

  storePendingIncomingCall(data)

  const incoming = buildIncomingCallFromPush(data, userId)
  if (!incoming) {
    return
  }

  dispatchUnityCallIncoming(incoming)

  if (document.visibilityState !== "visible") {
    navigateToIncomingCallRingScreen(data)
  }
}

export function setupSwIncomingCallBridge(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => {}
  }

  const onMessage = (event: MessageEvent<SwIncomingCallMessage>) => {
    if (event.data?.type !== SW_INCOMING_CALL_MESSAGE) {
      return
    }
    handleSwIncomingCallPayload(event.data.data ?? {})
  }

  navigator.serviceWorker.addEventListener("message", onMessage)

  return () => navigator.serviceWorker.removeEventListener("message", onMessage)
}

export function storePendingIncomingCall(data: Record<string, string | undefined>): void {
  if (typeof sessionStorage === "undefined") {
    return
  }
  try {
    sessionStorage.setItem("unity_pending_incoming_call", JSON.stringify(data))
  } catch {
    // ignore quota errors
  }
}

export function consumePendingIncomingCall(): Record<string, string | undefined> | null {
  if (typeof sessionStorage === "undefined") {
    return null
  }
  try {
    const raw = sessionStorage.getItem("unity_pending_incoming_call")
    if (!raw) {
      return null
    }
    sessionStorage.removeItem("unity_pending_incoming_call")
    return JSON.parse(raw) as Record<string, string | undefined>
  } catch {
    return null
  }
}
