"use client"

import type React from "react"

import { useChat } from "@/providers/chat-context"
import { motion } from "framer-motion"
import { chatGradientText, chatMobileDivider } from "./chat-brand"
import { cn } from "@/lib/utils"
import { ChatNavActions } from "./chat-nav-actions"
import { NotificationBell } from "../notification-bell"
import { usePage } from "@inertiajs/react"

interface ChatHeaderProps {
  mobileMenuButton?: React.ReactNode
  /** Mobile conversation list header (WhatsApp-style "Chats" screen). */
  variant?: "default" | "mobile-list"
}

export function ChatHeader({ mobileMenuButton, variant = "default" }: ChatHeaderProps) {
  const { activeRoom } = useChat()
  const { auth } = usePage().props as { auth?: { user?: { id?: number; email_verified_at?: string | null } } }
  const isMobileList = variant === "mobile-list"

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/90",
        isMobileList
          ? cn("min-h-[3.25rem] px-3 safe-area-inset-top", chatMobileDivider)
          : "min-h-14 h-14 px-4 sm:h-16",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {mobileMenuButton}
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "truncate font-bold tracking-tight",
              isMobileList ? "text-xl text-foreground" : `text-lg sm:text-xl ${chatGradientText}`,
            )}
          >
            {isMobileList ? "Chats" : "Messages"}
          </motion.h1>
          {!isMobileList && activeRoom && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Connected
            </p>
          )}
          {!isMobileList && !activeRoom && (
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Select a conversation to start chatting
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {isMobileList && (
          <NotificationBell userId={auth?.user?.id} emailVerified={!!auth?.user?.email_verified_at} />
        )}
        <ChatNavActions iconClassName="h-5 w-5" />
      </div>
    </div>
  )
}
