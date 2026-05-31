import { router } from "@inertiajs/react"
import { useCallback, useEffect, useRef } from "react"

const HEARTBEAT_MS = 45_000

function getCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? ""
}

function storageKey(roomName: string): string {
  return `unity-meet-presence:${roomName}`
}

function getOrCreateSessionId(roomName: string): string {
  const key = storageKey(roomName)
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

function postPresenceBeacon(roomName: string, sessionId: string): void {
  const token = getCsrfToken()
  const body = new FormData()
  body.append("_token", token)
  body.append("sessionId", sessionId)

  const url = route("livestreams.presence.leave", roomName)
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, body)
    return
  }

  void fetch(url, {
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
  roomName: string
  displayName: string
  email?: string | null
  active: boolean
}

/**
 * Register guest presence when they enter the VDO room so the host roster updates in real time.
 */
export function useLivestreamMeetingPresence({
  roomName,
  displayName,
  email,
  active,
}: Options): void {
  const sessionIdRef = useRef<string | null>(null)
  const joinedRef = useRef(false)

  const leave = useCallback(() => {
    const sessionId = sessionIdRef.current
    if (!sessionId || !joinedRef.current) {
      return
    }
    joinedRef.current = false
    postPresenceBeacon(roomName, sessionId)
  }, [roomName])

  useEffect(() => {
    if (!active || !roomName.trim()) {
      return
    }

    const sessionId = getOrCreateSessionId(roomName)
    sessionIdRef.current = sessionId
    const label = displayName.trim() || "Guest"

    router.post(
      route("livestreams.presence.join", roomName),
      {
        sessionId,
        displayName: label,
        email: email?.trim() || null,
      },
      {
        preserveState: true,
        preserveScroll: true,
        only: [],
        onSuccess: () => {
          joinedRef.current = true
        },
      },
    )

    const heartbeatId = window.setInterval(() => {
      if (!joinedRef.current) {
        return
      }
      router.post(
        route("livestreams.presence.heartbeat", roomName),
        { sessionId },
        { preserveState: true, preserveScroll: true, only: [] },
      )
    }, HEARTBEAT_MS)

    const onPageHide = () => leave()
    window.addEventListener("pagehide", onPageHide)

    return () => {
      window.clearInterval(heartbeatId)
      window.removeEventListener("pagehide", onPageHide)
      leave()
    }
  }, [active, roomName, displayName, email, leave])
}
