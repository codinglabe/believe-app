import { useEcho } from "@laravel/echo-react"
import { router } from "@inertiajs/react"
import { useCallback, useState } from "react"

export type UnityLiveViewerPayload = {
  kind: "user" | "organization"
  livestreamId: number
  roomName: string
  status: string
  isPublic: boolean
  reason: "meeting_started" | "live" | "unity_live_ended" | "stream_ended" | string
  message: string
  hostName?: string
  title?: string
}

export type UnityLiveViewerPhase = "waiting" | "starting" | "going_live" | "live" | "ended"

function isWatchableLive(payload: UnityLiveViewerPayload): boolean {
  return payload.status === "live" && payload.isPublic
}

function isEndedPayload(payload: UnityLiveViewerPayload): boolean {
  if (payload.reason === "meeting_started" || payload.reason === "live") {
    return false
  }

  return (
    payload.reason === "unity_live_ended" ||
    payload.reason === "stream_ended" ||
    (payload.status !== "live" && payload.reason !== "live")
  )
}

function phaseFromPayload(payload: UnityLiveViewerPayload): UnityLiveViewerPhase {
  if (isEndedPayload(payload)) {
    return "ended"
  }

  if (isWatchableLive(payload) || payload.reason === "live") {
    return payload.reason === "live" ? "going_live" : "live"
  }

  if (payload.reason === "meeting_started" || payload.status === "meeting_live") {
    return "starting"
  }

  return "waiting"
}

function labelForPhase(phase: UnityLiveViewerPhase): string {
  switch (phase) {
    case "starting":
      return "Meeting started"
    case "going_live":
      return "Going live"
    case "ended":
      return "Stream ended"
    default:
      return "Not live yet"
  }
}

export function useUnityLiveViewerStatus(
  broadcastChannel: string | null | undefined,
  options?: {
    initialStatus?: string
    watchPage?: boolean
  },
) {
  const initialPhase: UnityLiveViewerPhase =
    options?.watchPage && options?.initialStatus === "live"
      ? "live"
      : options?.initialStatus === "meeting_live"
        ? "starting"
        : "waiting"

  const [phase, setPhase] = useState<UnityLiveViewerPhase>(initialPhase)
  const [statusMessage, setStatusMessage] = useState(
    initialPhase === "starting"
      ? "Meeting in progress — waiting for Unity Live"
      : "Not live yet",
  )
  const [statusHint, setStatusHint] = useState<string | null>(
    initialPhase === "starting"
      ? "The stream will appear here when the host clicks Go Unity Live."
      : "Check back when the host goes live on Unity Live.",
  )
  const [endedMessage, setEndedMessage] = useState("This stream has ended. Thanks for watching.")
  const [playerRevision, setPlayerRevision] = useState(0)

  const handlePayload = useCallback(
    (payload: UnityLiveViewerPayload) => {
      if (isWatchableLive(payload)) {
        setPhase("going_live")
        setStatusMessage(payload.message || "Going live now — the player will start automatically.")
        setStatusHint(null)

        if (options?.watchPage) {
          setPhase("live")
          setPlayerRevision((n) => n + 1)
        } else {
          router.visit(window.location.pathname, {
            preserveScroll: true,
            onFinish: () => setPhase("live"),
          })
        }
        return
      }

      if (payload.reason === "meeting_started" || payload.status === "meeting_live") {
        setPhase("starting")
        setStatusMessage(payload.message || "The meeting has started.")
        setStatusHint(
          "The stream will appear here automatically when the host goes live on Unity Live.",
        )
        return
      }

      if (isEndedPayload(payload)) {
        setPhase("ended")
        setEndedMessage(payload.message || "This stream has ended. Thanks for watching.")
        if (options?.watchPage) {
          setStatusMessage(payload.message || "This stream has ended. Thanks for watching.")
        }
      }
    },
    [options?.watchPage],
  )

  useEcho<UnityLiveViewerPayload>(
    broadcastChannel ?? "unity-live.disabled",
    ".viewer.status",
    handlePayload,
    [broadcastChannel, handlePayload],
    "public",
  )

  return {
    phase,
    phaseLabel: labelForPhase(phase),
    statusMessage,
    statusHint,
    endedMessage,
    streamEnded: phase === "ended",
    isGoingLive: phase === "going_live",
    playerRevision,
  }
}
