import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

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

  if (payload.caller?.id === userId) {
    return false
  }

  const self = payload.participants.find((participant) => participant.userId === userId)
  return !self || (self.role === "callee" && self.status === "ringing")
}

export function dispatchUnityCallIncoming(payload: UnityCallStatusEvent): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(UNITY_CALL_INCOMING_EVENT, { detail: payload }))
}

export function dispatchUnityCallStatus(payload: UnityCallStatusEvent): void {
  if (typeof window === "undefined") {
    return
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
