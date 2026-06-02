import { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"

function getOrCreateSessionId(slug: string): string {
  const key = `unity-live-viewer:${slug}`
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) {
      return existing
    }
    const id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export function useUnityLiveViewerPresence(slug: string, initialCount = 0) {
  const [viewerCount, setViewerCount] = useState(initialCount)
  const sessionIdRef = useRef<string>("")

  useEffect(() => {
    if (!slug) {
      return
    }

    const sessionId = getOrCreateSessionId(slug)
    sessionIdRef.current = sessionId
    let active = true

    const join = async () => {
      try {
        const res = await axios.post(`/unity-live/${slug}/viewer/join`, { sessionId })
        if (active && typeof res.data?.viewerCount === "number") {
          setViewerCount(res.data.viewerCount)
        }
      } catch {
        // Presence is best-effort.
      }
    }

    const heartbeat = async () => {
      try {
        const res = await axios.post(`/unity-live/${slug}/viewer/heartbeat`, { sessionId })
        if (active && typeof res.data?.viewerCount === "number") {
          setViewerCount(res.data.viewerCount)
        }
      } catch {
        // Ignore transient failures.
      }
    }

    void join()
    const intervalId = window.setInterval(() => {
      void heartbeat()
    }, 30_000)

    const leave = () => {
      const payload = JSON.stringify({ sessionId })
      navigator.sendBeacon(`/unity-live/${slug}/viewer/leave`, new Blob([payload], { type: "application/json" }))
    }

    window.addEventListener("beforeunload", leave)

    return () => {
      active = false
      window.clearInterval(intervalId)
      window.removeEventListener("beforeunload", leave)
      void axios.post(`/unity-live/${slug}/viewer/leave`, { sessionId }).catch(() => {})
    }
  }, [slug])

  const refreshCount = useCallback(async () => {
    try {
      const res = await axios.get(`/unity-live/${slug}/stats`)
      if (typeof res.data?.viewerCount === "number") {
        setViewerCount(res.data.viewerCount)
      }
    } catch {
      // Ignore.
    }
  }, [slug])

  return { viewerCount, refreshCount, setViewerCount }
}
