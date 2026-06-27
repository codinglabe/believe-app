"use client"

import { useCallback, useEffect, useState } from "react"
import { router } from "@inertiajs/react"
import { echo } from "@laravel/echo-react"
import { stopCallRingtone } from "@/lib/callRingtone"
import { getUnityCallProviderLiveCallId } from "@/lib/unityCall"
import {
  dispatchUnityCallIncoming,
  dispatchUnityCallStatus,
  dispatchUnityCallTerminated,
  isUnityCallIncomingForUser,
  isUnityCallTerminated,
} from "@/lib/unityCallEvents"
import { rehydratePendingIncomingCall } from "@/lib/swIncomingCallBridge"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"
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
  const [liveCallId, setLiveCallId] = useState<number | null>(() => getUnityCallProviderLiveCallId())

  useEffect(() => {
    const syncLiveCallId = () => setLiveCallId(getUnityCallProviderLiveCallId())
    syncLiveCallId()

    const onLiveCallId = (event: Event) => {
      const next = (event as CustomEvent<number | null>).detail ?? null
      setLiveCallId(typeof next === "number" && next > 0 ? next : null)
    }

    window.addEventListener("unity-call-live-id", onLiveCallId)
    return () => window.removeEventListener("unity-call-live-id", onLiveCallId)
  }, [])

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

    refreshEchoAuthHeaders()

    const instance = echo()
    const userChannel = instance.private(`user.${userId}`)

    userChannel.listen(".call.status", handleStatusPayload)
    userChannel.error((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error("[UnityCall] user channel subscription failed:", error)
      }
    })

    const connection = instance.connector?.pusher?.connection
    const onReconnected = () => {
      refreshEchoAuthHeaders()
    }
    connection?.bind("connected", onReconnected)

    return () => {
      connection?.unbind("connected", onReconnected)
      userChannel.stopListening(".call.status")
    }
  }, [handleStatusPayload, userId])

  useEffect(() => {
    if (!liveCallId || liveCallId <= 0) {
      return
    }

    refreshEchoAuthHeaders()

    const instance = echo()
    const callChannel = instance.private(`unity-call.${liveCallId}`)

    callChannel.listen(".call.session.status", handleStatusPayload)

    return () => {
      callChannel.stopListening(".call.session.status")
    }
  }, [handleStatusPayload, liveCallId])

  return null
}
