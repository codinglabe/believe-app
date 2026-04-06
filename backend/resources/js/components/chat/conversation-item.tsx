"use client"

import React from "react"
import { ChatRoom } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { cn } from "@/lib/utils"
import { formatDistanceToNowStrict } from "date-fns"
import { Badge } from "@/components/chat/ui/badge"

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

  const lastMessageText = truncateMessage(room.last_message?.message);

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
        "border border-transparent",
        isActive
          ? "bg-primary/10 border-primary/30 shadow-sm"
          : "hover:bg-muted/50 hover:border-border/50 hover:shadow-sm",
      )}
      onClick={onClick}
    >
      <UserAvatar user={{ name: displayName, avatar: displayAvatar || '/placeholder.svg?height=32&width=32' }} className="h-10 w-10 flex-shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-semibold truncate flex-1",
            isActive ? "text-primary font-semibold" : "text-foreground"
          )}>
            {displayName}
          </h3>
          {lastMessageTime && (
            <span className={cn(
              "text-xs whitespace-nowrap flex-shrink-0",
              isActive ? "text-primary/70 font-medium" : "text-muted-foreground"
            )}>
              {lastMessageTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={cn(
            "text-sm truncate flex-1 min-w-0",
            isActive ? "text-foreground/80" : "text-muted-foreground"
          )}>
            {lastMessageText}
          </p>
          {room.unread_count > 0 && (
            <Badge
              className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0",
                isActive ? "bg-primary text-primary-foreground" : "bg-blue-500 text-white",
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
