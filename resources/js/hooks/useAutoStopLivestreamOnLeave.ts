import { useCallback, useEffect, useRef } from "react"
import { router } from "@inertiajs/react"

const ACTIVE_HOST_STATUSES = new Set(["live", "meeting_live", "starting"])

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

function postAbandon(stopUrl: string): void {
  const token = getCsrfToken()
  const body = new FormData()
  body.append("_token", token)

  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(stopUrl, body)
    return
  }

  void fetch(stopUrl, {
    method: "POST",
    headers: {
      "X-CSRF-TOKEN": token,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
    credentials: "same-origin",
    keepalive: true,
    body,
  })
}

type Options = {
  livestreamId: number
  status: string
  stopUrl: string
  enabled?: boolean
}

/**
 * When the host leaves the meeting page (Inertia navigation) or closes the tab,
 * automatically stop Unity Live / YouTube relay — same as End stream, fire-and-forget.
 */
export function useAutoStopLivestreamOnLeave({
  livestreamId,
  status,
  stopUrl,
  enabled = true,
}: Options): void {
  const stoppedRef = useRef(false)
  const active = enabled && ACTIVE_HOST_STATUSES.has(status)

  const sendStop = useCallback(() => {
    if (!active || stoppedRef.current) {
      return
    }
    stoppedRef.current = true
    postAbandon(stopUrl)
  }, [active, stopUrl])

  useEffect(() => {
    stoppedRef.current = false
  }, [livestreamId, status])

  useEffect(() => {
    if (!active) {
      return
    }

    const onPageHide = () => sendStop()
    window.addEventListener("pagehide", onPageHide)

    const removeBefore = router.on("before", () => {
      sendStop()
    })

    return () => {
      window.removeEventListener("pagehide", onPageHide)
      removeBefore()
    }
  }, [active, sendStop])
}
