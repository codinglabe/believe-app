import { useEffect, useRef } from "react"
import { parseChatTimestamp } from "@/lib/chat-timestamps"
import { expireUnityCallRinging, UNITY_CALL_RING_SECONDS } from "@/lib/unityCall"

type Options = {
  callId: number
  callStatus: string
  ringExpiresAt?: string | null
  enabled?: boolean
  onExpired?: () => void
}

function shouldDismissAfterExpire(result: {
  ok: boolean
  status?: string
  participant_status?: string
}): boolean {
  if (result.participant_status === "missed") {
    return true
  }

  return Boolean(result.ok && result.status && !["ringing", "accepted"].includes(result.status))
}

function shouldDismissAfterFailedExpire(result: {
  ok: boolean
  status?: string
  participant_status?: string
}): boolean {
  if (shouldDismissAfterExpire(result)) {
    return true
  }

  if (!result.ok) {
    return true
  }

  return false
}

export function useUnityCallRingTimeout({
  callId,
  callStatus,
  ringExpiresAt,
  enabled = true,
  onExpired,
}: Options): void {
  const firedRef = useRef(false)
  const onExpiredRef = useRef(onExpired)

  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    firedRef.current = false
  }, [callId, ringExpiresAt])

  useEffect(() => {
    if (!enabled || callStatus !== "ringing" || callId <= 0) {
      return
    }

    let expiresMs = Number.NaN
    if (ringExpiresAt) {
      expiresMs = parseChatTimestamp(ringExpiresAt).getTime()
    }

    if (Number.isNaN(expiresMs)) {
      expiresMs = Date.now() + UNITY_CALL_RING_SECONDS * 1000
    }

    const delay = Math.max(0, expiresMs - Date.now())
    const timer = window.setTimeout(() => {
      if (firedRef.current) {
        return
      }
      firedRef.current = true

      void (async () => {
        let result = await expireUnityCallRinging(callId)
        if (shouldDismissAfterFailedExpire(result)) {
          onExpiredRef.current?.()
          return
        }
        if (shouldDismissAfterExpire(result)) {
          onExpiredRef.current?.()
          return
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2000))
        result = await expireUnityCallRinging(callId)
        if (shouldDismissAfterFailedExpire(result) || shouldDismissAfterExpire(result)) {
          onExpiredRef.current?.()
        }
      })()
    }, delay)

    return () => window.clearTimeout(timer)
  }, [callId, callStatus, ringExpiresAt, enabled])
}
