"use client"

import type React from "react"
import { motion } from "framer-motion"
import { chatGradientText } from "./chat-brand"

interface ChatSidebarHeaderProps {
  actions?: React.ReactNode
}

export function ChatSidebarHeader({ actions }: ChatSidebarHeaderProps) {
  return (
    <div className="relative flex min-h-14 shrink-0 min-w-0 items-center justify-between gap-2 border-b border-border/50 bg-card/80 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/70 sm:h-16">
      <div className="min-w-0 flex-1">
        <motion.h2
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`truncate text-base font-bold tracking-tight sm:text-lg ${chatGradientText}`}
        >
          Conversations
        </motion.h2>
        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">Groups &amp; direct messages</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
      ) : null}
    </div>
  )
}
