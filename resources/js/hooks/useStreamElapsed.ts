import { useEffect, useMemo, useState } from "react"
import { formatStreamElapsed } from "@/lib/unity-live-display"

export function useStreamElapsed(startedAt: string | null, tickMs = 1000): string | null {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt) {
      return
    }

    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), tickMs)
    return () => window.clearInterval(id)
  }, [startedAt, tickMs])

  return useMemo(() => formatStreamElapsed(startedAt, nowMs), [startedAt, nowMs])
}
