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

async function postPresenceJson(url: string, body: Record<string, unknown>): Promise<boolean> {
  const token = getCsrfToken()
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
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
 * Uses fetch (not Inertia) — presence endpoints return JSON.
 */
export function useLivestreamMeetingPresence({
  roomName,
  displayName,
  email,
  active,
}: Options): void {
  const sessionIdRef = useRef<string | null>(null)
  const joinedRef = useRef(false)
  const displayNameRef = useRef(displayName)
  const emailRef = useRef(email)

  displayNameRef.current = displayName
  emailRef.current = email

  const registerJoin = useCallback(async () => {
    if (!roomName.trim() || joinedRef.current) {
      return
    }

    const sessionId = getOrCreateSessionId(roomName)
    sessionIdRef.current = sessionId

    const ok = await postPresenceJson(route("livestreams.presence.join", roomName), {
      sessionId,
      displayName: displayNameRef.current.trim() || "Guest",
      email: emailRef.current?.trim() || null,
    })

    if (ok) {
      joinedRef.current = true
    }
  }, [roomName])

  useEffect(() => {
    if (!active || !roomName.trim()) {
      return
    }

    void registerJoin()
  }, [active, roomName, registerJoin])

  useEffect(() => {
    if (!active || !roomName.trim()) {
      return
    }

    const sessionId = sessionIdRef.current ?? getOrCreateSessionId(roomName)
    sessionIdRef.current = sessionId

    const heartbeatId = window.setInterval(() => {
      if (!joinedRef.current || !sessionIdRef.current) {
        return
      }
      void postPresenceJson(route("livestreams.presence.heartbeat", roomName), {
        sessionId: sessionIdRef.current,
      })
    }, HEARTBEAT_MS)

    const onPageHide = () => {
      const sid = sessionIdRef.current
      if (!joinedRef.current || !sid) {
        return
      }
      joinedRef.current = false
      postPresenceBeacon(roomName, sid)
    }

    window.addEventListener("pagehide", onPageHide)

    return () => {
      window.clearInterval(heartbeatId)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [active, roomName])
}
