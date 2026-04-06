"use client"

import React from "react"
import { User } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { cn } from "@/lib/utils"

interface TypingIndicatorProps {
  users: User[]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const names = users.map((user) => user.name).join(", ")

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex -space-x-2 overflow-hidden">
        {users.slice(0, 3).map((user) => (
          <UserAvatar key={user.id} user={user} className="h-6 w-6 border-2 border-background" />
        ))}
        {users.length > 3 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground border-2 border-background">
            +{users.length - 3}
          </div>
        )}
      </div>
      <span>
        {users.length === 1
          ? `${names} is typing...`
          : `${names} are typing...`}
      </span>
    </div>
  )
}
