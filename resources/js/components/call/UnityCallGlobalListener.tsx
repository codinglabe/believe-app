"use client"

import { useCallback } from "react"
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
