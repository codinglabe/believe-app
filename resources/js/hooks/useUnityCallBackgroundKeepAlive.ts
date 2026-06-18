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
  onHangUp?: () => void
}

export function useUnityCallBackgroundKeepAlive({ enabled, title, subtitle, onHangUp }: Options): void {
  const onHangUpRef = useRef(onHangUp)
  const handleRef = useRef<UnityCallBackgroundKeepAliveHandle | null>(null)

  useEffect(() => {
    onHangUpRef.current = onHangUp
  }, [onHangUp])

  useEffect(() => {
    if (!enabled) {
      handleRef.current?.release()
      handleRef.current = null
      return
    }

    handleRef.current?.release()
    handleRef.current = startUnityCallBackgroundKeepAlive({
      title,
      subtitle,
      onHangUp: () => onHangUpRef.current?.(),
    })

    return () => {
      handleRef.current?.release()
      handleRef.current = null
    }
  }, [enabled, title, subtitle])
}
