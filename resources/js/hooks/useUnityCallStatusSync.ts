import { useEffect } from "react"
import { fetchUnityCallSync } from "@/lib/unityCall"
import type { UnityCallStatusEvent } from "@/hooks/useUnityCallNotifications"

type Options = {
  callId: number
  enabled: boolean
  onStatus: (payload: UnityCallStatusEvent) => void
}

/** Poll call status when realtime (Echo) may be delayed — keeps caller UI in sync after accept. */
export function useUnityCallStatusSync({ callId, enabled, onStatus }: Options): void {
  useEffect(() => {
    if (!enabled || callId <= 0) {
      return
    }

    let cancelled = false

    const poll = async () => {
      if (cancelled) {
        return
      }

      const payload = await fetchUnityCallSync(callId)
      if (!payload || cancelled || payload.call.id !== callId) {
        return
      }

      onStatus(payload)
    }

    void poll()

    const intervalId = window.setInterval(() => {
      void poll()
    }, 2000)

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [callId, enabled, onStatus])
}
