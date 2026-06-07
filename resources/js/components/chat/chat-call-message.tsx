"use client"

import { router } from "@inertiajs/react"
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ChatMessage, UnityCallChatMetadata } from "@/providers/chat-provider"
import { cn } from "@/lib/utils"
import { toInternalAppPath } from "@/lib/unityCall"

type Props = {
  message: ChatMessage
  currentUserId: number
}

const ACTIVE_CALL_STATUSES = new Set(["ringing", "accepted"])

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remaining = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
  }

  return `${minutes}:${String(remaining).padStart(2, "0")}`
}

function callTitle(metadata: UnityCallChatMetadata, fallback: string): string {
  const caller = metadata.caller_name?.trim() || "Someone"

  switch (metadata.call_status) {
    case "ringing":
      return metadata.is_group_call ? `${caller} is calling the group` : `${caller} is calling`
    case "accepted":
      return metadata.is_group_call ? "Group audio call" : "Audio call in progress"
    case "ended":
      if (metadata.duration_seconds != null) {
        return `Audio call · ${formatDuration(metadata.duration_seconds)}`
      }
      return "Audio call ended"
    case "missed":
    case "cancelled":
      return "Missed audio call"
    case "declined":
      return "Audio call declined"
    default:
      return fallback
  }
}

function callSubtitle(metadata: UnityCallChatMetadata): string | null {
  if (metadata.call_status === "ringing") {
    return "Tap join to answer"
  }
  if (metadata.call_status === "accepted") {
    if (metadata.is_group_call && metadata.accepted_count > 0) {
      return `${metadata.accepted_count} in call · Tap to join`
    }
    return "Tap to join"
  }
  if (metadata.call_status === "ended" && metadata.duration_seconds != null) {
    return `Call duration ${formatDuration(metadata.duration_seconds)}`
  }
  return null
}

function CallIcon({ status }: { status: string }) {
  if (status === "missed" || status === "cancelled") {
    return <PhoneMissed className="h-5 w-5 text-rose-400" />
  }
  if (status === "declined") {
    return <PhoneOff className="h-5 w-5 text-muted-foreground" />
  }
  if (status === "ringing") {
    return <PhoneIncoming className="h-5 w-5 text-emerald-400" />
  }
  return <Phone className="h-5 w-5 text-purple-400" />
}

export function ChatCallMessage({ message, currentUserId }: Props) {
  const metadata = message.metadata
  if (!metadata) {
    return null
  }

  const isActive = ACTIVE_CALL_STATUSES.has(metadata.call_status)
  const isCaller = metadata.caller_id === currentUserId
  const title = callTitle(metadata, message.message)
  const subtitle = callSubtitle(metadata)
  const joinPath = toInternalAppPath(metadata.join_url)

  const handleJoin = () => {
    if (!joinPath) {
      return
    }
    const path =
      !isCaller && metadata.call_status === "ringing" ? `${joinPath}${joinPath.includes("?") ? "&" : "?"}ring=1` : joinPath
    router.visit(path)
  }

  return (
    <div className="my-3 flex justify-center px-2 sm:my-4">
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl border px-4 py-3 text-center shadow-sm",
          isActive
            ? "border-purple-500/30 bg-gradient-to-br from-purple-950/50 to-blue-950/40"
            : "border-border/60 bg-muted/40",
        )}
      >
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/20">
          <CallIcon status={metadata.call_status} />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        {isActive ? (
          <Button
            type="button"
            size="sm"
            className="mt-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
            onClick={handleJoin}
          >
            {metadata.call_status === "ringing" && !isCaller ? "Join call" : "Open call"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
