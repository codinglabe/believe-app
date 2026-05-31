import { useCallback, useEffect, useRef } from "react"
import {
  beaconMeetingPresenceLeave,
  postMeetingPresenceJson,
} from "@/lib/livestreamMeetingPresence"

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

function clearSessionId(roomName: string): void {
  try {
    sessionStorage.removeItem(storageKey(roomName))
  } catch {
    // ignore
  }
}

type Options = {
  roomName: string
  displayName: string
  email?: string | null
  active: boolean
}

/**
 * Register guest presence on join; leave pushes a Reverb roster update to the host (no polling).
 */
export function useLivestreamMeetingPresence({
  roomName,
  displayName,
  email,
  active,
}: Options): { leaveMeeting: () => Promise<void> } {
  const sessionIdRef = useRef<string | null>(null)
  const joinedRef = useRef(false)
  const displayNameRef = useRef(displayName)
  const emailRef = useRef(email)

  displayNameRef.current = displayName
  emailRef.current = email

  const leaveMeeting = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId || !joinedRef.current || !roomName.trim()) {
      return
    }

    joinedRef.current = false
    await postMeetingPresenceJson(route("livestreams.presence.leave", roomName), {
      sessionId,
    })
    clearSessionId(roomName)
    sessionIdRef.current = null
  }, [roomName])

  const registerJoin = useCallback(async () => {
    if (!roomName.trim() || joinedRef.current) {
      return
    }

    const sessionId = getOrCreateSessionId(roomName)
    sessionIdRef.current = sessionId

    const ok = await postMeetingPresenceJson(route("livestreams.presence.join", roomName), {
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

    const onPageHide = () => {
      const sessionId = sessionIdRef.current
      if (!joinedRef.current || !sessionId) {
        return
      }
      joinedRef.current = false
      beaconMeetingPresenceLeave(roomName, sessionId)
      clearSessionId(roomName)
      sessionIdRef.current = null
    }

    window.addEventListener("pagehide", onPageHide)

    return () => {
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [active, roomName])

  return { leaveMeeting }
}
