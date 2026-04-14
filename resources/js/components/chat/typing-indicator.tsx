"use client"

import React from "react"
import type { ChatMessage } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"

interface TypingIndicatorProps {
  users: ChatMessage["user"][]
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const names = users.map((user) => user.name).join(", ")

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-3 py-2 text-sm shadow-sm backdrop-blur-sm dark:from-purple-500/15 dark:to-blue-500/15">
      <div className="flex -space-x-2 overflow-hidden">
        {users.slice(0, 3).map((user) => (
          <UserAvatar key={user.id} user={user} className="h-6 w-6 border-2 border-background ring-1 ring-purple-500/30" />
        ))}
        {users.length > 3 && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-purple-500/20">
            +{users.length - 3}
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1 text-muted-foreground">
        <span className="font-medium text-foreground/90">
          {users.length === 1 ? `${names} is typing` : `${names} are typing`}
        </span>
        <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-purple-500 [animation-delay:0ms]" />
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-violet-500 [animation-delay:150ms]" />
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
        </span>
      </span>
    </div>
  )
}
