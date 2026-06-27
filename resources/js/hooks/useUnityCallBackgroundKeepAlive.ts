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
  preferWebAudioRemote?: boolean
  onResume?: () => void
}

export function useUnityCallBackgroundKeepAlive({
  enabled,
  title,
  subtitle,
  localStream,
  remoteStream,
  speakerOn = true,
  preferWebAudioRemote = false,
  onHangUp,
  onResume,
}: Options): void {
  const onHangUpRef = useRef(onHangUp)
  const onResumeRef = useRef(onResume)
  const handleRef = useRef<UnityCallBackgroundKeepAliveHandle | null>(null)

  useEffect(() => {
    onHangUpRef.current = onHangUp
  }, [onHangUp])

  useEffect(() => {
    onResumeRef.current = onResume
  }, [onResume])

  useEffect(() => {
    if (!enabled) {
      handleRef.current?.release()
      handleRef.current = null
      return
    }

    const handle = startUnityCallBackgroundKeepAlive({
      title,
      subtitle,
      localStream,
      remoteStream,
      speakerOn,
      preferWebAudioRemote,
      onHangUp: () => onHangUpRef.current?.(),
      onResume: () => onResumeRef.current?.(),
    })
    handleRef.current = handle

    return () => {
      handle.release()
      if (handleRef.current === handle) {
        handleRef.current = null
      }
    }
  }, [enabled, preferWebAudioRemote, subtitle, title])

  useEffect(() => {
    handleRef.current?.updateStreams(localStream, remoteStream)
  }, [localStream, remoteStream])

  useEffect(() => {
    handleRef.current?.setSpeakerOn(speakerOn)
  }, [speakerOn])
}
