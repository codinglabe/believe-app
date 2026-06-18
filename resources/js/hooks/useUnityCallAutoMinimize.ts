"use client"

import { useEffect, useRef } from "react"
import { router } from "@inertiajs/react"
import type { UnityCallSessionSnapshot } from "@/contexts/unity-call-session-context"
import {
  isOnUnityCallShowPage,
  markUnityCallBackgrounded,
  toInternalAppPath,
  unityCallShowPath,
} from "@/lib/unityCall"
import { refreshEchoAuthHeaders } from "@/lib/reverb-config"

type Options = {
  session: UnityCallSessionSnapshot | null
  canBackgroundCall: boolean
  onBackgrounded?: () => void
}

function visitTargetPath(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname
  } catch {
    return toInternalAppPath(url).split("?")[0]?.split("#")[0] ?? "/"
  }
}

/** When the user leaves /unity-call/{id} without tapping Minimize, keep the call in the background. */
export function useUnityCallAutoMinimize({ session, canBackgroundCall, onBackgrounded }: Options): void {
  const canBackgroundRef = useRef(canBackgroundCall)
  const onBackgroundedRef = useRef(onBackgrounded)

  useEffect(() => {
    canBackgroundRef.current = canBackgroundCall
  }, [canBackgroundCall])

  useEffect(() => {
    onBackgroundedRef.current = onBackgrounded
  }, [onBackgrounded])

  useEffect(() => {
    if (!session) {
      return
    }

    const callId = session.call.id
    const callPath = unityCallShowPath(callId)

    const backgroundCall = () => {
      if (!canBackgroundRef.current) {
        return
      }

      markUnityCallBackgrounded(callId)
      refreshEchoAuthHeaders()
      onBackgroundedRef.current?.()
    }

    const unsubBefore = router.on("before", (event) => {
      if (!isOnUnityCallShowPage(callId)) {
        return
      }

      const targetPath = visitTargetPath(String(event.detail.visit.url ?? ""))
      if (targetPath === callPath) {
        return
      }

      backgroundCall()
    })

    return unsubBefore
  }, [session?.call.id])
}
