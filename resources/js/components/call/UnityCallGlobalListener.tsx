"use client"

import { useCallback, useEffect, useState } from "react"
import { router } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { stopCallRingtone } from "@/lib/callRingtone"
import {
  dispatchUnityCallIncoming,
  dispatchUnityCallStatus,
  dispatchUnityCallTerminated,
  isUnityCallIncomingForUser,
  isUnityCallTerminated,
} from "@/lib/unityCallEvents"
import { rehydratePendingIncomingCall } from "@/lib/swIncomingCallBridge"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

type Props = {
  authUserId: number | null | undefined
}

function readAuthUserId(): number | null {
  if (typeof document === "undefined") {
    return null
  }
  const raw = document.querySelector('meta[name="user-id"]')?.getAttribute("content")
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) && id > 0 ? id : null
}

function useLiveAuthUserId(initial?: number | null | undefined): number | null {
  const [userId, setUserId] = useState<number | null>(() => initial ?? readAuthUserId())

  useEffect(() => {
    setUserId(initial ?? readAuthUserId())
  }, [initial])

  useEffect(() => {
    const refresh = () => setUserId(readAuthUserId())
    refresh()
    return router.on("success", refresh)
  }, [])

  return userId
}

export default function UnityCallGlobalListener({ authUserId }: Props) {
  const userId = useLiveAuthUserId(authUserId)

  useEffect(() => {
    if (!userId) {
      return
    }

    rehydratePendingIncomingCall()

    const retryDelays = [400, 1500, 3500]
    const timers = retryDelays.map((delay) => window.setTimeout(rehydratePendingIncomingCall, delay))

    const onPageShow = () => rehydratePendingIncomingCall()
    const onFocus = () => rehydratePendingIncomingCall()
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        rehydratePendingIncomingCall()
      }
    }

    window.addEventListener("pageshow", onPageShow)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("pageshow", onPageShow)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [userId])

  const onStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId) {
        return
      }

      dispatchUnityCallStatus(payload)

      if (isUnityCallIncomingForUser(payload, userId)) {
        dispatchUnityCallIncoming(payload)
        return
      }

      if (isUnityCallTerminated(payload)) {
        dispatchUnityCallTerminated(payload)
        stopCallRingtone()
      }
    },
    [userId],
  )

  useEcho<UnityCallStatusEvent>(
    userId ? `user.${userId}` : "user.disabled",
    ".call.status",
    onStatus,
    [userId, onStatus],
    "private",
  )

  return null
}
