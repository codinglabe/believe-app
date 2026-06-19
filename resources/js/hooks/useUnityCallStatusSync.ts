"use client"

import { useEffect, useRef } from "react"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"
import { fetchUnityCallStatus } from "@/lib/unityCall"
import { dispatchUnityCallStatus } from "@/lib/unityCallEvents"

const POLL_MS = 1500

type Options = {
  callId: number
  enabled: boolean
  onStatus: (payload: UnityCallStatusEvent) => void
}

export function useUnityCallStatusSync({ callId, enabled, onStatus }: Options): void {
  const onStatusRef = useRef(onStatus)

  useEffect(() => {
    onStatusRef.current = onStatus
  }, [onStatus])

  useEffect(() => {
    if (!enabled || callId <= 0) {
      return
    }

    let cancelled = false

    const poll = async () => {
      const payload = await fetchUnityCallStatus(callId)
      if (cancelled || !payload) {
        return
      }

      onStatusRef.current(payload)
      dispatchUnityCallStatus(payload)
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [callId, enabled])
}
