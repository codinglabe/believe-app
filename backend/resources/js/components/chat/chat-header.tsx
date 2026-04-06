"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, X, Bell } from "lucide-react"
import { useChat } from "@/providers/chat-provider"
import { Link } from "@inertiajs/react"

interface ChatHeaderProps {
  unreadCount?: number
  mobileMenuButton?: React.ReactNode
}

export function ChatHeader({ unreadCount = 0, mobileMenuButton }: ChatHeaderProps) {
  const { activeRoom } = useChat()

  return (
    <div className="flex items-center justify-between h-16 px-4 border-b border-border/50 bg-card">
      <div className="flex items-center gap-3">
        {mobileMenuButton}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground">Messages</h1>
          {activeRoom && <p className="text-xs text-muted-foreground">Connected</p>}
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
