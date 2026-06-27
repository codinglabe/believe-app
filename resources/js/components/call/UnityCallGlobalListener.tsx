"use client"

import { useCallback, useEffect, useState } from "react"
import { router } from "@inertiajs/react"
import { echo } from "@laravel/echo-react"
import { stopCallRingtone } from "@/lib/callRingtone"
import {
  getUnityCallLiveCallMeta,
  refreshUnityCallStatusFromServer,
  type UnityCallLiveMeta,
} from "@/lib/unityCall"
import {
  dispatchUnityCallIncoming,
  dispatchUnityCallStatus,
  dispatchUnityCallTerminated,
  isUnityCallIncomingForUser,
  isUnityCallTerminated,
  peekUnityCallStatus,
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

function useLiveCallMeta(): UnityCallLiveMeta | null {
  const [meta, setMeta] = useState<UnityCallLiveMeta | null>(() => getUnityCallLiveCallMeta())

  useEffect(() => {
    const sync = () => setMeta(getUnityCallLiveCallMeta())
    sync()

    const onMeta = (event: Event) => {
      setMeta((event as CustomEvent<UnityCallLiveMeta | null>).detail ?? null)
    }

    window.addEventListener("unity-call-live-meta", onMeta)
    return () => window.removeEventListener("unity-call-live-meta", onMeta)
  }, [])

  return meta
}

export default function UnityCallGlobalListener({ authUserId }: Props) {
  const userId = useLiveAuthUserId(authUserId)
  const liveMeta = useLiveCallMeta()

  const syncAcceptedFromServer = useCallback((callId: number) => {
    const cached = peekUnityCallStatus(callId)
    if (cached?.reason === "accepted" && cached.call.status === "accepted") {
      return
    }

    void refreshUnityCallStatusFromServer(callId)
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
      const callId = getUnityCallLiveCallMeta()?.callId
      if (callId) {
        syncAcceptedFromServer(callId)
      }
    }
    connection?.bind("connected", onReconnected)

    return () => {
      connection?.unbind("connected", onReconnected)
      userChannel.stopListening(".call.status")
    }
  }, [handleStatusPayload, syncAcceptedFromServer, userId])

  useEffect(() => {
    if (!liveMeta?.callId || liveMeta.callId <= 0) {
      return
    }

    refreshEchoAuthHeaders()

    const instance = echo()
    const callChannel = instance.private(`unity-call.${liveMeta.callId}`)

    callChannel.listen(".call.session.status", handleStatusPayload)

    const roomChannel =
      liveMeta.chatRoomId && !liveMeta.isGroupCall
        ? instance.private(`direct-chat.${liveMeta.chatRoomId}`)
        : null
    roomChannel?.listen(".call.status", handleStatusPayload)

    callChannel.subscribed(() => {
      syncAcceptedFromServer(liveMeta.callId)
    })

    roomChannel?.subscribed(() => {
      syncAcceptedFromServer(liveMeta.callId)
    })

    return () => {
      callChannel.stopListening(".call.session.status")
      roomChannel?.stopListening(".call.status")
    }
  }, [
    handleStatusPayload,
    liveMeta?.callId,
    liveMeta?.chatRoomId,
    liveMeta?.isGroupCall,
    syncAcceptedFromServer,
  ])

  return null
}
