"use client"

import React from "react"
import { ChatRoom } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { cn } from "@/lib/utils"
import { formatDistanceToNowStrict } from "date-fns"
import { Badge } from "@/components/chat/ui/badge"
import { chatGradientBg, chatGradientText } from "./chat-brand"

function compactRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
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
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

interface ConversationItemProps {
  room: ChatRoom
  isActive: boolean
    onClick: () => void
    currentUser: any;
}

export function ConversationItem({ room, isActive, onClick,  currentUser}: ConversationItemProps) {
  const otherMember = room.type === 'direct' ? room.members?.find((m) => m.id !== currentUser?.id) : null
  const displayAvatar = room.type === 'direct'
    ? (otherMember?.avatar ?? (otherMember as { avatar_url?: string })?.avatar_url)
    : room.image

  const displayName = room.type === 'direct'
    ? (otherMember?.name || 'Direct Chat')
    : room.name
  const lastMessageTime = room.last_message?.created_at
    ? formatDistanceToNowStrict(new Date(room.last_message.created_at), { addSuffix: true })
    : null;

  // Helper function to truncate message text
  const truncateMessage = (message: string | null | undefined, maxLength: number = 50): string => {
    if (!message) return "No messages yet.";

    // Check if message has attachments (safely check for attachments property)
    const lastMessage = room.last_message as any;
    if (lastMessage?.attachments && Array.isArray(lastMessage.attachments) && lastMessage.attachments.length > 0) {
      const attachmentType = lastMessage.attachments[0]?.type?.startsWith('image/') ? 'Image' : 'Attachment';
      return `[${attachmentType}]`;
    }

    // Truncate long messages
    if (message.length > maxLength) {
      return message.substring(0, maxLength).trim() + '...';
    }

    return message;
  };

  const lastMessageText = truncateMessage(room.last_message?.message)

  /** Short label for narrow panels; full phrase in tooltip. */
  const shortTime = room.last_message?.created_at ? compactRelativeTime(room.last_message.created_at) : null

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-start gap-2.5 sm:gap-3 rounded-xl p-2.5 sm:p-3 cursor-pointer transition-all duration-200",
        "border box-border",
        isActive
          ? "border-purple-500/35 bg-gradient-to-r from-purple-600/10 to-blue-600/10 shadow-md ring-1 ring-purple-500/15"
          : "border-transparent hover:bg-muted/50 hover:border-border/50 hover:shadow-sm",
      )}
      onClick={onClick}
    >
      <UserAvatar
        user={{ name: displayName, avatar: displayAvatar || "/placeholder.svg?height=32&width=32" }}
        className="h-10 w-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        {/* Grid keeps the timestamp column from being clipped by flex overflow */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0">
          <h3
            title={displayName}
            className={cn(
              "min-w-0 truncate text-left text-sm font-semibold leading-snug sm:text-base",
              isActive ? `font-bold ${chatGradientText}` : "text-foreground",
            )}
          >
            {displayName}
          </h3>
          {lastMessageTime && shortTime && (
            <span
              title={lastMessageTime}
              className={cn(
                "whitespace-nowrap text-right text-[10px] font-medium tabular-nums leading-snug sm:text-xs",
                isActive ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground",
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
              "min-w-0 flex-1 truncate text-left text-xs sm:text-sm",
              isActive ? "text-foreground/80" : "text-muted-foreground",
            )}
          >
            {lastMessageText}
          </p>
          {room.unread_count > 0 && (
            <Badge
              className={cn(
                "shrink-0 px-2 py-0.5 text-[10px] font-bold leading-none sm:text-xs",
                "rounded-full border-0 text-white shadow-sm",
                isActive ? chatGradientBg : "bg-blue-500",
              )}
            >
              {room.unread_count}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
