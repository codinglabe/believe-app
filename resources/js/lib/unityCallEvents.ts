import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

export const UNITY_CALL_INCOMING_EVENT = "unity-call-incoming"

export function buildIncomingCallFromPush(data: Record<string, string | undefined>, userId: number): UnityCallStatusEvent | null {
  const callId = Number(data.call_id)
  if (!Number.isFinite(callId) || callId <= 0) {
    return null
  }

  const callerId = Number(data.caller_id)
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

export function dispatchUnityCallIncoming(payload: UnityCallStatusEvent): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(UNITY_CALL_INCOMING_EVENT, { detail: payload }))
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
