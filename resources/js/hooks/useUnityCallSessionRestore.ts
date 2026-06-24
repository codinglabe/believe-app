"use client"

import { useEffect, useRef } from "react"
import type { UnityCallSessionSnapshot } from "@/contexts/unity-call-session-context"
import {
  fetchActiveUnityCallSession,
  isLeavingUnityCall,
  isOnUnityCallShowPage,
  isUnityCallEndedLocally,
  markUnityCallBackgrounded,
} from "@/lib/unityCall"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"

type Options = {
  session: UnityCallSessionSnapshot | null
  registerSession: (snapshot: UnityCallSessionSnapshot) => void
  onRestored?: () => void
}

function readAuthUserId(): number | null {
  if (typeof document === "undefined") {
    return null
  }

  const raw = document.querySelector('meta[name="user-id"]')?.getAttribute("content")
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) && id > 0 ? id : null
}

/** Reconnect to a live call after the app was closed, refreshed, or killed in the background. */
export function useUnityCallSessionRestore({ session, registerSession, onRestored }: Options): void {
  const sessionRef = useRef(session)
  const registerSessionRef = useRef(registerSession)
  const onRestoredRef = useRef(onRestored)
  const restoringRef = useRef(false)
  const lastRestoreAtRef = useRef(0)

  const RESTORE_MIN_GAP_MS = 15_000

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    registerSessionRef.current = registerSession
  }, [registerSession])

  useEffect(() => {
    onRestoredRef.current = onRestored
  }, [onRestored])

  useEffect(() => {
    const restore = async (force = false) => {
      if (sessionRef.current || restoringRef.current || !readAuthUserId()) {
        return
      }

      const now = Date.now()
      if (!force && now - lastRestoreAtRef.current < RESTORE_MIN_GAP_MS) {
        return
      }

      restoringRef.current = true
      lastRestoreAtRef.current = now
      try {
        const active = await fetchActiveUnityCallSession()
        if (!active || sessionRef.current) {
          return
        }

        if (isUnityCallEndedLocally(active.call.id) || isLeavingUnityCall(active.call.id)) {
          return
        }

        if (isOnUnityCallShowPage(active.call.id)) {
          return
        }

        registerSessionRef.current(active)
        markUnityCallBackgrounded(active.call.id)
        refreshEchoAuthHeaders()
        onRestoredRef.current?.()
      } finally {
        restoringRef.current = false
      }
    }

    void restore(true)

    const onResume = () => {
      void restore()
    }

    window.addEventListener("pageshow", onResume)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        onResume()
      }
    })

    return () => {
      window.removeEventListener("pageshow", onResume)
    }
  }, [])
}
