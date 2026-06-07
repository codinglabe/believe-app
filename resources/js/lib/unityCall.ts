import type { UnityCallPayload, UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"
import { router } from "@inertiajs/react"

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

export type UnityCallInitResponse = {
  call_id: number
  status: string
  join_url: string
}

export function unityCallShowPath(callId: number): string {
  return `/unity-call/${callId}`
}

/** Inertia visits must use same-origin paths — not absolute APP_URL from the server. */
export function toInternalAppPath(urlOrPath: string): string {
  if (!urlOrPath) {
    return "/"
  }
  try {
    const parsed = new URL(urlOrPath, window.location.origin)
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`
  }
}

export type UnityCallAcceptResponse = {
  call_id: number
  status: string
  join_url: string
  call: UnityCallPayload
  caller: {
    id: number
    name: string
    avatar?: string | null
  }
  participants: UnityCallParticipantRow[]
}

type UnityCallErrorResponse = {
  message?: string
  errors?: Record<string, string[]>
}

const acceptInFlight = new Set<number>()
const leavingCallIds = new Set<number>()

export function unityCallChatUrl(chatRoomId: number | null | undefined): string {
  if (!chatRoomId) {
    return route("chat.index")
  }
  return `${route("chat.index")}?room=${chatRoomId}`
}

export function markLeavingUnityCall(callId: number): void {
  leavingCallIds.add(callId)
  clearUnityCallAcceptedLocally(callId)
}

export function clearLeavingUnityCall(callId: number): void {
  leavingCallIds.delete(callId)
}

export function isLeavingUnityCall(callId: number): boolean {
  return leavingCallIds.has(callId)
}

export function navigateAfterUnityCall(callId: number, chatRoomId: number | null | undefined): void {
  if (isLeavingUnityCall(callId)) {
    return
  }

  markLeavingUnityCall(callId)
  router.visit(unityCallChatUrl(chatRoomId), {
    preserveScroll: true,
    onFinish: () => clearLeavingUnityCall(callId),
  })
}

export function markUnityCallAcceptedLocally(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }
  try {
    sessionStorage.setItem(`unity_call_accepted_${callId}`, String(Date.now()))
  } catch {
    // ignore
  }
}

export function hasUnityCallAcceptedLocally(callId: number): boolean {
  if (typeof sessionStorage === "undefined") {
    return false
  }
  try {
    return sessionStorage.getItem(`unity_call_accepted_${callId}`) !== null
  } catch {
    return false
  }
}

export function clearUnityCallAcceptedLocally(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }
  try {
    sessionStorage.removeItem(`unity_call_accepted_${callId}`)
  } catch {
    // ignore
  }
}

export async function postUnityCallJson<T = unknown>(
  url: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; data: T | null; message?: string }> {
  const token = getCsrfToken()
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = (await res.json().catch(() => null)) as T | UnityCallErrorResponse | null
    if (!res.ok && data && typeof data === "object") {
      const err = data as UnityCallErrorResponse
      const firstFieldError = err.errors ? Object.values(err.errors).flat()[0] : undefined
      return { ok: false, data: null, message: firstFieldError ?? err.message }
    }
    return { ok: res.ok, data: data as T | null }
  } catch {
    return { ok: false, data: null, message: "Network error" }
  }
}

export async function startAudioCall(chatRoomId: number): Promise<UnityCallInitResponse | null> {
  const { ok, data, message } = await postUnityCallJson<UnityCallInitResponse>(route("unity-calls.store"), {
    chat_room_id: chatRoomId,
  })
  if (!ok && message) {
    throw new Error(message)
  }
  return ok && data ? data : null
}

export async function acceptUnityCall(callId: number): Promise<{ ok: boolean; data: UnityCallAcceptResponse | null; message?: string }> {
  if (acceptInFlight.has(callId)) {
    return { ok: false, data: null, message: "Accept already in progress" }
  }

  acceptInFlight.add(callId)
  try {
    const { ok, data, message } = await postUnityCallJson<UnityCallAcceptResponse>(route("unity-calls.accept", callId))
    if (ok && data) {
      markUnityCallAcceptedLocally(callId)
    }
    return { ok, data: ok && data ? data : null, message }
  } finally {
    acceptInFlight.delete(callId)
  }
}

export async function declineUnityCall(callId: number): Promise<boolean> {
  const { ok } = await postUnityCallJson(route("unity-calls.decline", callId))
  return ok
}

export async function endUnityCall(callId: number): Promise<boolean> {
  const { ok } = await postUnityCallJson(route("unity-calls.end", callId))
  return ok
}

export async function cancelUnityCall(callId: number): Promise<boolean> {
  const { ok } = await postUnityCallJson(route("unity-calls.cancel", callId))
  return ok
}
