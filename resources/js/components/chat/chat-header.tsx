"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, X, Bell } from "lucide-react"
import { useChat } from "@/providers/chat-provider"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { chatGradientText } from "./chat-brand"

interface ChatHeaderProps {
  unreadCount?: number
  mobileMenuButton?: React.ReactNode
}

export function ChatHeader({ unreadCount = 0, mobileMenuButton }: ChatHeaderProps) {
  const { activeRoom } = useChat()

  return (
    <div className="relative flex items-center justify-between min-h-14 h-14 sm:h-16 px-3 sm:px-4 border-b border-border/50 bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/70">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {mobileMenuButton}
        <div className="flex flex-col min-w-0">
          <motion.h1
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-lg sm:text-xl font-bold tracking-tight truncate ${chatGradientText}`}
          >
            Messages
          </motion.h1>
          {activeRoom && (
            <p className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Connected
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Button variant="ghost" size="icon" className="relative" title="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>
        </div>

        {/* Exit/Back buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              title="Back to Home"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/service-hub">
            <Button
              variant="ghost"
              size="icon"
              title="Back to Services"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Mobile exit button */}
        <div className="sm:hidden">
          <Link href="/service-hub">
            <Button
              variant="ghost"
              size="icon"
              title="Exit Chat"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
