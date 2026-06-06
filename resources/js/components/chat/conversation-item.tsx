"use client"

import React from "react"
import { ChatRoom } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { cn } from "@/lib/utils"
import { chatTimestampMs, parseChatTimestamp } from "@/lib/chat-timestamps"
import { formatDistanceToNowStrict } from "date-fns"
import { chatAccentText, chatGradientBg, chatGradientText, chatListDivider, chatUnreadBadge } from "./chat-brand"

function compactRelativeTime(iso: string): string {
  const then = chatTimestampMs(iso)
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (sec < 45) return "now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 52) return `${w}w`
  return parseChatTimestamp(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

interface ConversationItemProps {
  room: ChatRoom
  isActive: boolean
  onClick: () => void
  currentUser: any
  mobileList?: boolean
}

export function ConversationItem({ room, isActive, onClick, currentUser, mobileList = false }: ConversationItemProps) {
  const otherMember = room.type === "direct" ? room.members?.find((m) => m.id !== currentUser?.id) : null
  const displayAvatar = room.type === "direct"
    ? (otherMember?.avatar ?? (otherMember as { avatar_url?: string })?.avatar_url)
    : room.image

  const displayName = room.type === "direct"
    ? (otherMember?.name || "Direct Chat")
    : room.name
  const lastMessageTime = room.last_message?.created_at
    ? formatDistanceToNowStrict(parseChatTimestamp(room.last_message.created_at), { addSuffix: true })
    : null

  const truncateMessage = (message: string | null | undefined, maxLength: number = 50): string => {
    if (!message) return "No messages yet."

    const lastMessage = room.last_message as any
    if (lastMessage?.attachments && Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0) {
      const attachmentType = lastMessage.attachments[0]?.type?.startsWith("image/") ? "Photo" : "Attachment"
      return `${attachmentType}`
    }

    if (message.length > maxLength) {
      return message.substring(0, maxLength).trim() + "..."
    }

    return message
  }

  const lastMessageText = truncateMessage(room.last_message?.message)
  const shortTime = room.last_message?.created_at ? compactRelativeTime(room.last_message.created_at) : null

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full cursor-pointer items-center gap-3 transition-colors active:bg-muted/60",
        mobileList
          ? cn("px-3 py-3.5", chatListDivider, isActive && "bg-muted/50")
          : cn(
              "items-start gap-2.5 rounded-xl border p-2.5 sm:gap-3 sm:p-3",
              "box-border",
              isActive
                ? "border-purple-500/35 bg-gradient-to-r from-purple-600/10 to-blue-600/10 shadow-md ring-1 ring-purple-500/15"
                : "border-transparent hover:border-border/50 hover:bg-muted/50 hover:shadow-sm",
            ),
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <UserAvatar
        user={{ name: displayName, avatar: displayAvatar || "/placeholder.svg?height=32&width=32" }}
        className={cn("shrink-0", mobileList ? "h-[3.25rem] w-[3.25rem]" : "h-10 w-10")}
      />
      <div className="min-w-0 flex-1">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
          <h3
            title={displayName}
            className={cn(
              "min-w-0 truncate text-left font-semibold leading-snug",
              mobileList ? "text-[17px]" : "text-sm sm:text-base",
              isActive && !mobileList ? `font-bold ${chatGradientText}` : "text-foreground",
            )}
          >
            {displayName}
          </h3>
          {lastMessageTime && shortTime && (
            <span
              title={lastMessageTime}
              className={cn(
                "whitespace-nowrap text-right text-xs tabular-nums leading-snug",
                room.unread_count > 0 ? cn("font-medium", chatAccentText) : "text-muted-foreground",
              )}
            >
              {shortTime}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          <p
            title={lastMessageText}
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              mobileList ? "text-[15px] text-muted-foreground" : "text-xs sm:text-sm",
              isActive && !mobileList ? "text-foreground/80" : "text-muted-foreground",
              room.unread_count > 0 && mobileList && "font-medium text-foreground/90",
            )}
          >
            {lastMessageText}
          </p>
          {room.unread_count > 0 && (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none text-white",
                mobileList
                  ? cn("h-5 min-w-5 px-1.5", chatUnreadBadge)
                  : cn("px-2 py-0.5 text-[10px] sm:text-xs", isActive ? chatGradientBg : chatUnreadBadge),
              )}
            >
              {room.unread_count > 99 ? "99+" : room.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
