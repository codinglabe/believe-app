"use client"

import { useCallback } from "react"
import { router } from "@inertiajs/react"
import { useEcho } from "@laravel/echo-react"
import { stopCallRingtone } from "@/lib/callRingtone"
import {
  dispatchUnityCallTerminated,
  isUnityCallTerminated,
} from "@/lib/unityCallEvents"
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

function activeUnityCallIdFromPath(): number | null {
  if (typeof window === "undefined") {
    return null
  }
  const match = window.location.pathname.match(/\/unity-call\/(\d+)\/?$/)
  if (!match) {
    return null
  }
  const id = Number(match[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

export default function UnityCallGlobalListener({ authUserId }: Props) {
  const userId = authUserId ?? readAuthUserId()

  const onStatus = useCallback(
    (payload: UnityCallStatusEvent) => {
      if (!userId) {
        return
      }

      const isParticipant = payload.participants.some((p) => p.userId === userId)
      if (!isParticipant || !isUnityCallTerminated(payload)) {
        return
      }

      dispatchUnityCallTerminated(payload)
      stopCallRingtone()

      const activeCallId = activeUnityCallIdFromPath()
      if (activeCallId === payload.call.id) {
        router.visit(route("chat.index"))
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
