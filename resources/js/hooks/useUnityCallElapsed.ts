import { useEffect, useMemo, useRef, useState } from "react"
import {
  formatUnityCallElapsed,
  resolveStickyUnityCallTimerAnchor,
  tickUnityCallElapsed,
} from "@/lib/unityCallTimer"

type Options = {
  callId: number
  answeredAt?: string | null
  callStatus: string
}

export function useUnityCallElapsed({ callId, answeredAt, callStatus }: Options) {
  const anchor = useMemo(
    () => resolveStickyUnityCallTimerAnchor(callId, { answeredAt, callStatus }),
    [answeredAt, callId, callStatus],
  )

  const anchorRef = useRef(anchor)
  anchorRef.current = anchor

  const [elapsed, setElapsed] = useState(() => (anchor === null ? 0 : tickUnityCallElapsed(anchor)))

  useEffect(() => {
    if (anchor === null) {
      return
    }

    const tick = () => {
      const currentAnchor = anchorRef.current
      if (currentAnchor === null) {
        return
      }
      setElapsed(tickUnityCallElapsed(currentAnchor))
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [anchor])

  return {
    anchor,
    elapsed,
    formatted: formatUnityCallElapsed(elapsed),
    isRunning: anchor !== null,
  }
}
