"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/chat/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  src?: string
  alt?: string
  fallback: string
  className?: string
  status?: "online" | "offline" | "away"
}

export function UserAvatar({ src, alt, fallback, className, status }: UserAvatarProps) {
  const statusColorClass = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500",
  }

  return (
    <div className="relative">
      <Avatar className={cn("h-8 w-8", className)}>
        <AvatarImage src={src || "/placeholder.svg"} alt={alt} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background",
            statusColorClass[status],
          )}
        />
      )}
    </div>
  )
}
