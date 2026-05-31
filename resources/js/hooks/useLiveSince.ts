import { useEffect, useMemo, useState } from "react"
import { formatLiveSince } from "@/lib/unity-live-display"

/** Recompute "Live for …" on an interval so the label stays current while viewing. */
export function useLiveSince(startedAt: string | null, tickMs = 30_000): string | null {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt) {
      return
    }

    setNowMs(Date.now())
    const id = window.setInterval(() => setNowMs(Date.now()), tickMs)
    return () => window.clearInterval(id)
  }, [startedAt, tickMs])

  return useMemo(() => formatLiveSince(startedAt, nowMs), [startedAt, nowMs])
}
