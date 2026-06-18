import type { UnityCallPayload, UnityCallParticipantRow, UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
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

/** Full page load — avoids Inertia XHR JSON errors on /unity-call/* (Reverb/WebRTC need a clean page). */
export function navigateToUnityCall(pathOrUrl: string, options?: { replace?: boolean }): void {
  if (typeof window === "undefined") {
    return
  }
  const path = toInternalAppPath(pathOrUrl)
  if (options?.replace) {
    window.location.replace(path)
  } else {
    window.location.assign(path)
  }
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

/** Must match `UnityCallService::RING_SECONDS`. */
export const UNITY_CALL_RING_SECONDS = 60

const acceptInFlight = new Set<number>()
const leavingCallIds = new Set<number>()

function endedCallStorageKey(callId: number): string {
  return `unity_call_ended_${callId}`
}

/** User explicitly left/ended — do not re-enter via back button or stale session flags. */
export function markUnityCallEndedLocally(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.setItem(endedCallStorageKey(callId), String(Date.now()))
    clearUnityCallAcceptedLocally(callId)
    clearUnityCallLiveOnPage(callId)
    clearUnityCallSessionActive(callId)
  } catch {
    // ignore
  }
}

export function clearUnityCallEndedLocally(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.removeItem(endedCallStorageKey(callId))
  } catch {
    // ignore
  }
}

export function isUnityCallEndedLocally(callId: number): boolean {
  if (typeof sessionStorage === "undefined") {
    return false
  }

  try {
    return sessionStorage.getItem(endedCallStorageKey(callId)) !== null
  } catch {
    return false
  }
}

export function unityCallChatUrl(chatRoomId: number | null | undefined): string {
  if (!chatRoomId) {
    return route("chat.index")
  }
  return `${route("chat.index")}?room=${chatRoomId}`
}

export function unityCallChatChannelName(
  chatRoomId: number,
  isGroupCall: boolean,
  roomType?: "direct" | "private" | "public" | null,
): string {
  if (roomType === "public") {
    return `public-chat.${chatRoomId}`
  }
  if (roomType === "private") {
    return `private-chat.${chatRoomId}`
  }
  if (roomType === "direct") {
    return `direct-chat.${chatRoomId}`
  }
  return isGroupCall ? `private-chat.${chatRoomId}` : `direct-chat.${chatRoomId}`
}

export function markLeavingUnityCall(callId: number): void {
  leavingCallIds.add(callId)
  markUnityCallEndedLocally(callId)
}

export function clearLeavingUnityCall(callId: number): void {
  leavingCallIds.delete(callId)
}

export function isLeavingUnityCall(callId: number): boolean {
  return leavingCallIds.has(callId)
}

export function getActiveUnityCallIdFromPage(): number | null {
  if (typeof window === "undefined") {
    return null
  }

  const match = window.location.pathname.match(/^\/unity-call\/(\d+)$/)
  if (!match) {
    return null
  }

  const callId = Number(match[1])
  return Number.isFinite(callId) && callId > 0 ? callId : null
}

export function markUnityCallLiveOnPage(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.setItem(`unity_call_live_${callId}`, "1")
    markUnityCallSessionActive(callId)
  } catch {
    // ignore
  }
}

export function markUnityCallSessionActive(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.setItem(`unity_call_active_${callId}`, "1")
  } catch {
    // ignore
  }
}

export function clearUnityCallSessionActive(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.removeItem(`unity_call_active_${callId}`)
  } catch {
    // ignore
  }
}

export function clearUnityCallLiveOnPage(callId: number): void {
  if (typeof sessionStorage === "undefined") {
    return
  }

  try {
    sessionStorage.removeItem(`unity_call_live_${callId}`)
    clearUnityCallSessionActive(callId)
  } catch {
    // ignore
  }
}

export function isUserBusyWithUnityCall(excludeCallId?: number): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const pageCallId = getActiveUnityCallIdFromPage()
  if (
    pageCallId &&
    pageCallId !== excludeCallId &&
    !isLeavingUnityCall(pageCallId) &&
    !isUnityCallEndedLocally(pageCallId)
  ) {
    return true
  }

  return isUserOnLiveUnityCall(excludeCallId)
}

export function isUserAlreadyOnUnityCall(callId: number): boolean {
  if (typeof window === "undefined") {
    return false
  }

  if (isUnityCallEndedLocally(callId)) {
    return false
  }

  if (getActiveUnityCallIdFromPage() === callId) {
    return true
  }

  if (hasUnityCallAcceptedLocally(callId)) {
    return true
  }

  try {
    if (sessionStorage.getItem(`unity_call_live_${callId}`) === "1") {
      return true
    }
  } catch {
    // ignore
  }

  return false
}

export function isUserOnLiveUnityCall(excludeCallId?: number): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const pageCallId = getActiveUnityCallIdFromPage()
  if (
    pageCallId &&
    pageCallId !== excludeCallId &&
    !isLeavingUnityCall(pageCallId) &&
    !isUnityCallEndedLocally(pageCallId)
  ) {
    try {
      if (sessionStorage.getItem(`unity_call_live_${pageCallId}`) === "1") {
        return true
      }
    } catch {
      // ignore
    }
  }

  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index)
      if (!key?.startsWith("unity_call_live_")) {
        continue
      }

      const callId = Number(key.replace("unity_call_live_", ""))
      if (!Number.isFinite(callId) || callId <= 0 || callId === excludeCallId) {
        continue
      }

      if (isLeavingUnityCall(callId) || isUnityCallEndedLocally(callId)) {
        continue
      }

      if (sessionStorage.getItem(key) === "1") {
        return true
      }
    }
  } catch {
    // ignore
  }

  return false
}

export function returnToUnityCall(callId: number): void {
  router.visit(unityCallShowPath(callId), { preserveScroll: true })
}

export function minimizeUnityCall(chatRoomId: number | null | undefined): void {
  router.visit(unityCallChatUrl(chatRoomId), { preserveScroll: true })
}

export function navigateAfterUnityCall(
  callId: number,
  chatRoomId: number | null | undefined,
  options?: { onFinish?: () => void },
): void {
  markLeavingUnityCall(callId)

  const chatPath = unityCallChatUrl(chatRoomId)
  if (typeof window !== "undefined") {
    window.history.replaceState(window.history.state, "", chatPath)
  }

  router.visit(chatPath, {
    preserveScroll: true,
    replace: true,
    onFinish: () => {
      clearLeavingUnityCall(callId)
      options?.onFinish?.()
    },
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
  if (isUserBusyWithUnityCall()) {
    throw new Error("You are already on a call. End it before starting another.")
  }

  const { ok, data, message } = await postUnityCallJson<UnityCallInitResponse>(route("unity-calls.store"), {
    chat_room_id: chatRoomId,
  })
  if (!ok && message) {
    throw new Error(message)
  }
  return ok && data ? data : null
}

async function getUnityCallJson<T>(url: string): Promise<{ ok: boolean; data: T | null }> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": getCsrfToken(),
      },
      credentials: "same-origin",
    })

    const data = (await res.json().catch(() => null)) as T | null
    return { ok: res.ok, data: res.ok ? data : null }
  } catch {
    return { ok: false, data: null }
  }
}

export async function fetchIncomingUnityCall(): Promise<UnityCallStatusEvent | null> {
  const { ok, data } = await getUnityCallJson<{ incoming?: UnityCallStatusEvent | null }>(
    route("unity-calls.incoming"),
  )

  return ok && data?.incoming ? data.incoming : null
}

export type UnityCallChatRoomChannel = {
  id: number
  type: "direct" | "private" | "public" | string
}

export async function fetchUnityCallChatRooms(): Promise<UnityCallChatRoomChannel[]> {
  const { ok, data } = await getUnityCallJson<{ rooms?: UnityCallChatRoomChannel[] }>(
    route("unity-calls.chat-rooms"),
  )

  return ok && data?.rooms ? data.rooms : []
}

export async function expireUnityCallRinging(
  callId: number,
): Promise<{ ok: boolean; status?: string; participant_status?: string; message?: string }> {
  const { ok, data, message } = await postUnityCallJson<{
    call_id: number
    status: string
    participant_status?: string
  }>(route("unity-calls.expire-ringing", callId))

  return {
    ok,
    status: data?.status,
    participant_status: data?.participant_status,
    message,
  }
}

export async function acceptUnityCall(callId: number): Promise<{ ok: boolean; data: UnityCallAcceptResponse | null; message?: string }> {
  if (hasUnityCallAcceptedLocally(callId)) {
    return { ok: true, data: null, message: "Already accepted" }
  }

  if (acceptInFlight.has(callId)) {
    return { ok: false, data: null, message: "Accept already in progress" }
  }

  acceptInFlight.add(callId)
  try {
    clearUnityCallEndedLocally(callId)
    const { ok, data, message } = await postUnityCallJson<UnityCallAcceptResponse>(route("unity-calls.accept", callId))
    if (ok) {
      markUnityCallAcceptedLocally(callId)
      return { ok: true, data, message }
    }

    return { ok: false, data: null, message }
  } finally {
    acceptInFlight.delete(callId)
  }
}

function isRecoverableTerminateMessage(message?: string): boolean {
  if (!message) {
    return false
  }
  const normalized = message.toLowerCase()
  return (
    normalized.includes("no longer") ||
    normalized.includes("not part of this call") ||
    normalized.includes("already") ||
    normalized.includes("can only leave an active call") ||
    normalized.includes("only the caller can cancel") ||
    normalized.includes("only callees can decline") ||
    normalized.includes("cannot be cancelled") ||
    normalized.includes("cannot be declined")
  )
}

export type TerminateUnityCallOptions = {
  callId: number
  isCaller: boolean
  callStatus: string
  selfStatus: string | null
}

/** Decline, cancel, or end — picks the correct action for caller vs callee vs ringing. */
export async function terminateUnityCall({
  callId,
  isCaller,
  callStatus,
  selfStatus,
}: TerminateUnityCallOptions): Promise<{ ok: boolean; message?: string }> {
  if (isCaller) {
    const cancel = await postUnityCallJson(route("unity-calls.cancel", callId))
    if (cancel.ok || isRecoverableTerminateMessage(cancel.message)) {
      return { ok: true }
    }

    const end = await postUnityCallJson(route("unity-calls.end", callId))
    if (end.ok || isRecoverableTerminateMessage(end.message)) {
      return { ok: true }
    }

    return { ok: false, message: end.message ?? cancel.message }
  }

  if (selfStatus === "ringing") {
    const decline = await postUnityCallJson(route("unity-calls.decline", callId))
    if (decline.ok || isRecoverableTerminateMessage(decline.message)) {
      return { ok: true }
    }

    return { ok: false, message: decline.message }
  }

  const end = await postUnityCallJson(route("unity-calls.end", callId))
  if (end.ok || isRecoverableTerminateMessage(end.message)) {
    return { ok: true }
  }

  return { ok: false, message: end.message }
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

/** Caller hang-up: cancel while ringing, end once the call is live. */
export async function hangUpUnityCall(callId: number): Promise<boolean> {
  const cancelled = await cancelUnityCall(callId)
  if (cancelled) {
    return true
  }
  const { ok } = await postUnityCallJson(route("unity-calls.end", callId))
  return ok
}
