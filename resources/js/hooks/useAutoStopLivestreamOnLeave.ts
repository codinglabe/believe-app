import { useCallback, useEffect, useRef } from "react"

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
 * When the host closes the tab or browser (pagehide), stop Unity Live / YouTube relay.
 *
 * Does NOT run on Inertia navigation (sidebar links, tab switches) or same-page
 * router.reload() polling — those were incorrectly ending active meetings.
 * Use the explicit End meeting button when finishing a session.
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

    return () => {
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [active, sendStop])
}
