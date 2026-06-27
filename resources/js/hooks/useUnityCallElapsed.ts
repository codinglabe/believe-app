import { useEffect, useMemo, useState } from "react"
import {
  formatUnityCallElapsed,
  resolveUnityCallTimerAnchor,
  tickUnityCallElapsed,
} from "@/lib/unityCallTimer"

type Options = {
  answeredAt?: string | null
  callStatus: string
}

export function useUnityCallElapsed({ answeredAt, callStatus }: Options) {
  const anchor = useMemo(
    () => resolveUnityCallTimerAnchor({ answeredAt, callStatus }),
    [answeredAt, callStatus],
  )

  const [elapsed, setElapsed] = useState(() => (anchor === null ? 0 : tickUnityCallElapsed(anchor)))

  useEffect(() => {
    if (anchor === null) {
      setElapsed(0)
      return
    }

    const tick = () => setElapsed(tickUnityCallElapsed(anchor))
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
