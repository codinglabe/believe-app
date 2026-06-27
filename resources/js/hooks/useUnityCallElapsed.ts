import { useSyncExternalStore } from "react"
import {
  ensureUnityCallTimerAnchor,
  formatUnityCallElapsed,
  getUnityCallTimerAnchor,
  subscribeUnityCallElapsed,
  tickUnityCallElapsed,
} from "@/lib/unityCallTimer"

type Options = {
  callId: number
  answeredAt?: string | null
  callStatus: string
}

function readElapsed(callId: number): number {
  const anchor = getUnityCallTimerAnchor(callId)
  return anchor === null ? 0 : tickUnityCallElapsed(anchor)
}

export function useUnityCallElapsed({ callId, answeredAt, callStatus }: Options) {
  ensureUnityCallTimerAnchor(callId, { answeredAt, callStatus })

  const anchor = getUnityCallTimerAnchor(callId)

  const elapsed = useSyncExternalStore(
    (onStoreChange) => subscribeUnityCallElapsed(callId, onStoreChange),
    () => readElapsed(callId),
    () => 0,
  )

  return {
    anchor,
    elapsed,
    formatted: formatUnityCallElapsed(elapsed),
    isRunning: anchor !== null,
  }
}
