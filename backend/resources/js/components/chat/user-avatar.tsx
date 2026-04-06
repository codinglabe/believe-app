"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/chat/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  user: {
    name?: string | null
    avatar?: string | null
  }
  className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "UN" // Unknown User

  return (
    <Avatar className={cn("relative", className)}>
      <AvatarImage src={user.avatar || undefined} alt={user.name || "User Avatar"} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
