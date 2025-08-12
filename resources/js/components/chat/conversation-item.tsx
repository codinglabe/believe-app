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

export function ConversationItem({ room, isActive, onClick, currentUser }: ConversationItemProps) {
  const displayAvatar = room.type === 'direct'
  ? room.members.find(member => member.id !== currentUser.id)?.avatar // Always find non-current user
  : room.image;

const displayName = room.type === 'direct'
  ? room.members.find(member => member.id !== currentUser.id)?.name || 'Direct Chat'
  : room.name;

  const lastMessageTime = room.last_message?.created_at
    ? formatDistanceToNowStrict(new Date(room.last_message.created_at), { addSuffix: true })
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent",
      )}
      onClick={onClick}
    >
      <UserAvatar user={{ name: displayName, avatar: displayAvatar || '/placeholder.svg?height=32&width=32' }} className="h-10 w-10" />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className={cn("font-medium truncate", isActive ? "text-primary-foreground" : "text-foreground")}>
            {displayName}
          </h3>
          {lastMessageTime && (
            <span className={cn("text-xs", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {lastMessageTime}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className={cn("text-sm truncate", isActive ? "text-primary-foreground/90" : "text-muted-foreground")}>
            {room.last_message?.message || "No messages yet."}
          </p>
          {room.unread_count > 0 && (
            <Badge
              className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs font-bold",
                isActive ? "bg-primary-foreground text-primary" : "bg-blue-500 text-white",
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
