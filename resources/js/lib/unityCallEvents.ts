import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { syncUnityCallServerClock } from "@/lib/unityCallTimer"

export const UNITY_CALL_INCOMING_EVENT = "unity-call-incoming"
export const UNITY_CALL_STATUS_EVENT = "unity-call-status"
export const UNITY_CALL_TERMINATED_EVENT = "unity-call-terminated"

export const TERMINAL_UNITY_CALL_REASONS = new Set(["cancelled", "ended", "missed", "declined"])
export const TERMINAL_UNITY_CALL_STATUSES = new Set(["cancelled", "ended", "missed", "declined"])

export function isUnityCallTerminated(payload: UnityCallStatusEvent): boolean {
  return (
    TERMINAL_UNITY_CALL_REASONS.has(payload.reason) ||
    TERMINAL_UNITY_CALL_STATUSES.has(payload.call.status)
  )
}

export function buildIncomingCallFromPush(data: Record<string, string | undefined>, userId: number): UnityCallStatusEvent | null {
  const callId = Number(data.call_id)
  if (!Number.isFinite(callId) || callId <= 0) {
    return null
  }

  const callerId = Number(data.caller_id)
  if (Number.isFinite(callerId) && callerId === userId) {
    return null
  }
  const callerName = data.caller_name?.trim() || "Someone"
  const joinUrl = data.join_url || data.click_action || data.url || `/unity-call/${callId}`

  return {
    reason: "incoming",
    call: {
      id: callId,
      status: "ringing",
      type: "audio",
      chatRoomId: data.chat_room_id ? Number(data.chat_room_id) : null,
      chatRoomName: data.chat_room_name || null,
      isGroupCall: data.is_group_call === "1" || data.is_group_call === "true",
      joinUrl,
    },
    caller: {
      id: Number.isFinite(callerId) ? callerId : 0,
      name: callerName,
      avatar: data.caller_avatar || null,
    },
    participants: [
      {
        userId: Number.isFinite(callerId) ? callerId : 0,
        name: callerName,
        avatar: data.caller_avatar || null,
        role: "caller",
        status: "accepted",
      },
      {
        userId,
        name: "You",
        role: "callee",
        status: "ringing",
      },
    ],
  }
}

export function isUnityCallIncomingForUser(payload: UnityCallStatusEvent, userId: number): boolean {
  if (payload.reason !== "incoming" || payload.call.status !== "ringing") {
    return false
  }

  if (payload.call.isGroupCall) {
    return false
  }

  if (payload.call.chatRoomType && payload.call.chatRoomType !== "direct") {
    return false
  }

  if (payload.caller?.id === userId) {
    return false
  }

  const self = payload.participants.find((participant) => participant.userId === userId)
  if (!self || self.role !== "callee" || self.status !== "ringing") {
    return false
  }

  const ringingCallees = payload.participants.filter(
    (participant) => participant.role === "callee" && participant.status === "ringing",
  )

  return ringingCallees.length === 1 && ringingCallees[0]?.userId === userId
}

export function dispatchUnityCallIncoming(payload: UnityCallStatusEvent): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(UNITY_CALL_INCOMING_EVENT, { detail: payload }))
}

const latestStatusByCallId = new Map<number, UnityCallStatusEvent>()

/** Latest Reverb status for a call — replays when UI mounts after accept (events are not buffered by Echo). */
export function peekUnityCallStatus(callId: number): UnityCallStatusEvent | null {
  return latestStatusByCallId.get(callId) ?? null
}

export function clearUnityCallStatusCache(callId: number): void {
  latestStatusByCallId.delete(callId)
}

export function dispatchUnityCallStatus(payload: UnityCallStatusEvent): void {
  if (typeof window === "undefined") {
    return
  }

  syncUnityCallServerClock(payload.serverNow)

  latestStatusByCallId.set(payload.call.id, payload)

  if (isUnityCallTerminated(payload)) {
    latestStatusByCallId.delete(payload.call.id)
  }

  window.dispatchEvent(new CustomEvent(UNITY_CALL_STATUS_EVENT, { detail: payload }))
}

export function subscribeUnityCallStatus(handler: (payload: UnityCallStatusEvent) => void): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<UnityCallStatusEvent>).detail
    if (detail) {
      handler(detail)
    }
  }

  window.addEventListener(UNITY_CALL_STATUS_EVENT, listener)
  return () => window.removeEventListener(UNITY_CALL_STATUS_EVENT, listener)
}

/** Apply the newest cached status when a screen subscribes after Reverb already fired. */
export function replayUnityCallStatus(callId: number, handler: (payload: UnityCallStatusEvent) => void): void {
  const cached = peekUnityCallStatus(callId)
  if (cached && cached.call.id === callId) {
    handler(cached)
  }
}

export function subscribeUnityCallIncoming(handler: (payload: UnityCallStatusEvent) => void): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<UnityCallStatusEvent>).detail
    if (detail) {
      handler(detail)
    }
  }

  window.addEventListener(UNITY_CALL_INCOMING_EVENT, listener)
  return () => window.removeEventListener(UNITY_CALL_INCOMING_EVENT, listener)
}

export function dispatchUnityCallTerminated(payload: UnityCallStatusEvent): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(UNITY_CALL_TERMINATED_EVENT, { detail: payload }))
}

export function subscribeUnityCallTerminated(handler: (payload: UnityCallStatusEvent) => void): () => void {
  if (typeof window === "undefined") {
    return () => {}
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<UnityCallStatusEvent>).detail
    if (detail) {
      handler(detail)
    }
  }

  window.addEventListener(UNITY_CALL_TERMINATED_EVENT, listener)
  return () => window.removeEventListener(UNITY_CALL_TERMINATED_EVENT, listener)
}
