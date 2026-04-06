"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Home, X } from "lucide-react"
import { Link } from "@inertiajs/react"

interface ChatSidebarHeaderProps {
  onClose?: () => void
}

export function ChatSidebarHeader({ onClose }: ChatSidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between h-16 px-4 border-b border-border/50 bg-card">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <h2 className="text-base font-semibold text-foreground">Conversations</h2>
          <p className="text-xs text-muted-foreground">Your messages</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Navigation links - hidden on mobile */}
        <div className="hidden sm:flex items-center gap-1">
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
