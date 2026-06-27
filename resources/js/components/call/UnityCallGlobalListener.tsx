"use client"

import { useCallback, useEffect, useState } from "react"
import { router } from "@inertiajs/react"
import { echo } from "@laravel/echo-react"
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

function publishIncomingCall(payload: UnityCallStatusEvent): void {
  dispatchUnityCallStatus(payload)
  dispatchUnityCallIncoming(payload)
}

export default function UnityCallGlobalListener({ authUserId }: Props) {
  const userId = useLiveAuthUserId(authUserId)

  const handleStatusPayload = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId) {
        return
      }

      dispatchUnityCallStatus(payload)

      if (isUnityCallIncomingForUser(payload, userId)) {
        publishIncomingCall(payload)
        return
      }

      if (isUnityCallTerminated(payload)) {
        dispatchUnityCallTerminated(payload)
        stopCallRingtone()
      }
    },
    [userId],
  )

  useEffect(() => {
    if (!userId) {
      return
    }

    rehydratePendingIncomingCall()
  }, [userId])

  useEffect(() => {
    if (!userId) {
      return
    }

    const instance = echo()
    const userChannel = instance.private(`user.${userId}`)

    userChannel.listen(".call.status", handleStatusPayload)
    userChannel.error((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error("[UnityCall] user channel subscription failed:", error)
      }
    })

    return () => {
      userChannel.stopListening(".call.status")
    }
  }, [handleStatusPayload, userId])

  return null
}
