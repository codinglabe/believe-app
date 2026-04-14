"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, X } from "lucide-react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { chatGradientText } from "./chat-brand"

interface ChatSidebarHeaderProps {
  onClose?: () => void
}

export function ChatSidebarHeader({ onClose }: ChatSidebarHeaderProps) {
  return (
    <div className="relative flex min-h-14 shrink-0 min-w-0 items-center justify-between gap-2 overflow-hidden border-b border-border/50 bg-card/80 px-3 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-card/70 sm:h-16 sm:px-4">
      <div className="flex items-center gap-2 min-w-0 pt-0.5">
        <div className="flex flex-col min-w-0">
          <motion.h2
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`text-base sm:text-lg font-bold tracking-tight truncate ${chatGradientText}`}
          >
            Conversations
          </motion.h2>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Your messages</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* Navigation links — compact on very narrow sidebars */}
        <div className="hidden sm:flex items-center gap-0.5">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              title="Back to Home"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/service-hub">
            <Button
              variant="ghost"
              size="icon"
              title="Back to Services"
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Mobile close button */}
        <div className="sm:hidden">
          <Button variant="ghost" size="icon" onClick={onClose} title="Close sidebar" className="hover:bg-muted">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
