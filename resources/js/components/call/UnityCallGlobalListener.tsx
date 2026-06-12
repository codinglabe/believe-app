"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import { fetchIncomingUnityCall, fetchUnityCallChatRooms, type UnityCallChatRoomChannel } from "@/lib/unityCall"
import { rehydratePendingIncomingCall } from "@/lib/swIncomingCallBridge"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

type Props = {
  authUserId: number | null | undefined
}

const INCOMING_POLL_MS = 2500

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

function chatRoomChannelName(room: UnityCallChatRoomChannel): string {
  if (room.type === "public") {
    return `public-chat.${room.id}`
  }
  if (room.type === "private") {
    return `private-chat.${room.id}`
  }
  return `direct-chat.${room.id}`
}

function normalizeRoomIncomingPayload(
  payload: UnityCallStatusEvent,
  userId: number,
): UnityCallStatusEvent {
  const hasSelf = payload.participants.some((participant) => participant.userId === userId)
  if (hasSelf) {
    return payload
  }

  return {
    ...payload,
    participants: [
      ...payload.participants,
      {
        userId,
        name: "You",
        role: "callee",
        status: "ringing",
      },
    ],
  }
}

export default function UnityCallGlobalListener({ authUserId }: Props) {
  const userId = useLiveAuthUserId(authUserId)
  const pollingRef = useRef(false)

  const handleIncomingPayload = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId || !isUnityCallIncomingForUser(payload, userId)) {
        return
      }

      dispatchUnityCallStatus(payload)
      dispatchUnityCallIncoming(normalizeRoomIncomingPayload(payload, userId))
    },
    [userId],
  )

  const handleStatusPayload = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId) {
        return
      }

      dispatchUnityCallStatus(payload)

      if (isUnityCallIncomingForUser(payload, userId)) {
        dispatchUnityCallIncoming(normalizeRoomIncomingPayload(payload, userId))
        return
      }

      if (isUnityCallTerminated(payload)) {
        dispatchUnityCallTerminated(payload)
        stopCallRingtone()
      }
    },
    [userId],
  )

  const pollIncomingCall = useCallback(async () => {
    if (!userId || pollingRef.current || document.visibilityState === "hidden") {
      return
    }

    pollingRef.current = true
    try {
      const payload = await fetchIncomingUnityCall()
      if (payload) {
        handleIncomingPayload(payload)
      }
    } finally {
      pollingRef.current = false
    }
  }, [handleIncomingPayload, userId])

  useEffect(() => {
    if (!userId) {
      return
    }

    rehydratePendingIncomingCall()
    void pollIncomingCall()

    const retryDelays = [400, 1200, 3000]
    const timers = retryDelays.map((delay) =>
      window.setTimeout(() => {
        rehydratePendingIncomingCall()
        void pollIncomingCall()
      }, delay),
    )

    const onPageShow = () => {
      rehydratePendingIncomingCall()
      void pollIncomingCall()
    }
    const onFocus = () => {
      rehydratePendingIncomingCall()
      void pollIncomingCall()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        rehydratePendingIncomingCall()
        void pollIncomingCall()
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
  }, [pollIncomingCall, userId])

  useEffect(() => {
    if (!userId) {
      return
    }

    const intervalId = window.setInterval(() => {
      void pollIncomingCall()
    }, INCOMING_POLL_MS)

    return () => window.clearInterval(intervalId)
  }, [pollIncomingCall, userId])

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

  useEffect(() => {
    if (!userId) {
      return
    }

    let cancelled = false
    const roomChannels: Array<{ stop: () => void }> = []

    const subscribeRooms = async () => {
      const rooms = await fetchUnityCallChatRooms()
      if (cancelled) {
        return
      }

      const instance = echo()

      for (const room of rooms) {
        const channelName = chatRoomChannelName(room)
        const channel =
          room.type === "public" ? instance.channel(channelName) : instance.private(channelName)

        const onRoomIncoming = (payload: UnityCallStatusEvent) => {
          if (payload.caller?.id === userId || payload.call.status !== "ringing") {
            return
          }
          handleIncomingPayload(normalizeRoomIncomingPayload(payload, userId))
        }

        channel.listen(".call.incoming", onRoomIncoming)
        channel.error((error: unknown) => {
          if (import.meta.env.DEV) {
            console.error(`[UnityCall] room channel failed (${channelName}):`, error)
          }
        })

        roomChannels.push({
          stop: () => channel.stopListening(".call.incoming"),
        })
      }
    }

    void subscribeRooms()

    const resubscribe = () => {
      roomChannels.forEach((entry) => entry.stop())
      roomChannels.length = 0
      void subscribeRooms()
    }

    const unsubscribeRouter = router.on("success", resubscribe)

    return () => {
      cancelled = true
      unsubscribeRouter()
      roomChannels.forEach((entry) => entry.stop())
    }
  }, [handleIncomingPayload, userId])

  return null
}
