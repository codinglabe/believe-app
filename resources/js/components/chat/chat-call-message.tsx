"use client"

import { useEffect, useState } from "react"
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing } from "lucide-react"
import type { ChatMessage, UnityCallChatMetadata } from "@/providers/chat-provider"
import { cn } from "@/lib/utils"
import { navigateToUnityCall, toInternalAppPath, clearUnityCallEndedLocally, isUnityCallEndedLocally } from "@/lib/unityCall"
import { chatReceivedBubble, chatSentBubble } from "./chat-brand"
import { formatChatTime, parseChatTimestamp } from "@/lib/chat-timestamps"

type Props = {
  message: ChatMessage
  currentUserId: number
}

const ACTIVE_CALL_STATUSES = new Set(["ringing", "accepted"])

function formatDurationHuman(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))

  if (total < 60) {
    return total === 1 ? "1 second" : `${total} seconds`
  }

  const minutes = Math.floor(total / 60)
  if (minutes < 60) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`
  }

  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`
  const minutePart = remainingMinutes === 1 ? "1 minute" : `${remainingMinutes} minutes`

  return `${hourPart} ${minutePart}`
}

function durationSubtext(metadata: UnityCallChatMetadata, liveSeconds: number | null): string | null {
  if (metadata.duration_label?.trim()) {
    return metadata.duration_label.trim()
  }

  if (metadata.call_status === "accepted" && liveSeconds != null) {
    return formatDurationHuman(liveSeconds)
  }

  if (metadata.call_status === "ended" && metadata.duration_seconds != null && metadata.duration_seconds > 0) {
    return formatDurationHuman(metadata.duration_seconds)
  }

  if (metadata.call_status === "ringing") {
    return "Tap to join"
  }

  if (metadata.call_status === "accepted") {
    return "Tap to rejoin"
  }

  if (metadata.call_status === "missed" || metadata.call_status === "cancelled") {
    return "Missed"
  }

  if (metadata.call_status === "declined") {
    return "Declined"
  }

  return null
}

function CallDirectionIcon({
  status,
  outgoing,
}: {
  status: string
  outgoing: boolean
}) {
  if (status === "missed" || status === "cancelled") {
    return <PhoneMissed className={cn("h-4 w-4", outgoing ? "text-white/90" : "text-rose-500")} />
  }

  if (status === "declined") {
    return <PhoneOff className={cn("h-4 w-4", outgoing ? "text-white/80" : "text-muted-foreground")} />
  }

  if (outgoing) {
    return <PhoneOutgoing className="h-4 w-4 text-white/90" />
  }

  if (status === "ringing") {
    return <PhoneIncoming className="h-4 w-4 text-purple-600 dark:text-purple-400" />
  }

  return <Phone className={cn("h-4 w-4", outgoing ? "text-white/90" : "text-purple-600 dark:text-purple-400")} />
}

export function ChatCallMessage({ message, currentUserId }: Props) {
  const metadata = message.metadata
  const [liveSeconds, setLiveSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!metadata || metadata.call_status !== "accepted" || !metadata.answered_at) {
      setLiveSeconds(null)
      return
    }

    const started = parseChatTimestamp(metadata.answered_at).getTime()
    if (Number.isNaN(started)) {
      return
    }

    const tick = () => setLiveSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)

    return () => window.clearInterval(id)
  }, [metadata])

  if (!metadata) {
    return null
  }

  const isOutgoing = metadata.caller_id === currentUserId
  const isActive = ACTIVE_CALL_STATUSES.has(metadata.call_status) && !isUnityCallEndedLocally(metadata.unity_call_id)
  const joinPath = toInternalAppPath(metadata.join_url)
  const subtext = durationSubtext(metadata, liveSeconds)

  const handleOpen = () => {
    if (!isActive || !joinPath) {
      return
    }

    clearUnityCallEndedLocally(metadata.unity_call_id)

    const path =
      !isOutgoing && metadata.call_status === "ringing"
        ? `${joinPath}${joinPath.includes("?") ? "&" : "?"}ring=1`
        : joinPath

    navigateToUnityCall(path)
  }

  return (
    <div className={cn("mb-2 flex px-2 sm:mb-3", isOutgoing ? "justify-end" : "justify-start")}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={!isActive}
        className={cn(
          "flex max-w-[min(85%,20rem)] items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left sm:max-w-[min(75%,18rem)]",
          isOutgoing
            ? cn(chatSentBubble, "rounded-br-sm", isActive && "cursor-pointer active:opacity-95")
            : cn(chatReceivedBubble, "rounded-bl-sm", isActive && "cursor-pointer active:opacity-95"),
          !isActive && "cursor-default",
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            isOutgoing ? "bg-white/15" : "bg-purple-500/10 dark:bg-purple-500/15",
          )}
        >
          <CallDirectionIcon status={metadata.call_status} outgoing={isOutgoing} />
        </span>

        <span className="min-w-0 flex-1 pr-1">
          <span className="block text-sm font-semibold leading-tight">Voice call</span>
          {subtext ? (
            <span
              className={cn(
                "mt-0.5 block text-xs leading-tight",
                isOutgoing ? "text-white/75" : "text-muted-foreground",
              )}
            >
              {subtext}
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            "shrink-0 self-end text-[10px] tabular-nums leading-none",
            isOutgoing ? "text-white/60" : "text-muted-foreground/80",
          )}
        >
          {formatChatTime(message.created_at)}
        </span>
      </button>
    </div>
  )
}
