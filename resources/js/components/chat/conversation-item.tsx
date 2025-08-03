"use client"
import { cn } from "@/lib/utils"
import { UserAvatar } from "./user-avatar"
import { motion } from "framer-motion"

interface ConversationItemProps {
  id: string
  name: string
  lastMessage: string
  lastMessageTime: string
  avatarSrc: string
  isSelected: boolean
  onClick: (id: string) => void
  status?: "online" | "offline" | "away"
  unreadCount?: number // Added for unread messages
}

export function ConversationItem({
  id,
  name,
  lastMessage,
  lastMessageTime,
  avatarSrc,
  isSelected,
  onClick,
  status,
  unreadCount = 0,
}: ConversationItemProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50 hover:text-foreground",
      )}
      onClick={() => onClick(id)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <UserAvatar src={avatarSrc} alt={name} fallback={name.charAt(0)} status={status} />
      <div className="flex-1 overflow-hidden">
        <h3 className="font-semibold text-sm truncate">{name}</h3>
        <p className="text-xs text-muted-foreground truncate">{lastMessage}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground flex-shrink-0">{lastMessageTime}</span>
        {unreadCount > 0 && (
          <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </motion.div>
  )
}
