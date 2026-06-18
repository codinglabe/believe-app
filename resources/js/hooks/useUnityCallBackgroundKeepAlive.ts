"use client"

import { useEffect, useRef } from "react"
import {
  startUnityCallBackgroundKeepAlive,
  type UnityCallBackgroundKeepAliveHandle,
} from "@/lib/unityCallBackgroundKeepAlive"

type Options = {
  enabled: boolean
  title: string
  subtitle?: string
  localStream?: MediaStream | null
  remoteStream?: MediaStream | null
  speakerOn?: boolean
  onHangUp?: () => void
  onResume?: () => void
}

export function useUnityCallBackgroundKeepAlive({
  enabled,
  title,
  subtitle,
  localStream,
  remoteStream,
  speakerOn = true,
  onHangUp,
  onResume,
}: Options): void {
  const onHangUpRef = useRef(onHangUp)
  const onResumeRef = useRef(onResume)

  useEffect(() => {
    onHangUpRef.current = onHangUp
  }, [onHangUp])

  useEffect(() => {
    onResumeRef.current = onResume
  }, [onResume])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handle = startUnityCallBackgroundKeepAlive({
      title,
      subtitle,
      localStream,
      remoteStream,
      speakerOn,
      onHangUp: () => onHangUpRef.current?.(),
      onResume: () => onResumeRef.current?.(),
    })

    return () => {
      handle.release()
    }
  }, [enabled, title, subtitle, localStream, remoteStream, speakerOn])
}
