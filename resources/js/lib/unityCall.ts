import type { UnityCallPayload, UnityCallParticipantRow } from "@/hooks/useUnityCallNotifications"

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

export type UnityCallInitResponse = {
  call_id: number
  status: string
  join_url: string
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

export async function acceptUnityCall(callId: number): Promise<{ ok: boolean; data: UnityCallAcceptResponse | null }> {
  const { ok, data } = await postUnityCallJson<UnityCallAcceptResponse>(route("unity-calls.accept", callId))
  return { ok, data: ok && data ? data : null }
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
