"use client"

import React from "react"
import { useChat } from "@/providers/chat-provider"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { UserAvatar } from "@/components/chat/user-avatar"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { Button } from "@/components/chat/ui/button"
import { InfoIcon, SettingsIcon } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/chat/ui/sheet"
import { ChatDetailsPanel } from "@/components/chat/chat-details-panel"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import { chatGradientBg, chatGradientBgHover, chatGradientText } from "./chat-brand"
import { cn } from "@/lib/utils"

type ChatAreaProps = {
  mobileMenuButton?: React.ReactNode
}

export function ChatArea({ mobileMenuButton }: ChatAreaProps = {}) {
  const { activeRoom, currentUser, typingUsers, joinRoom } = useChat()
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = React.useState(false)

  // Calculate membership status reactively
  const isMember = activeRoom?.is_member || activeRoom?.members?.some((member) => member.id === currentUser?.id)

  if (!activeRoom) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a chat to start messaging
      </div>
    )
  }

  // Determine chat header name for direct chats (other participant's name)
  const otherMember = activeRoom.type === "direct" ? activeRoom.members?.find((m) => m.id !== currentUser?.id) : null
  const chatHeaderName =
    activeRoom.type === "direct"
      ? (otherMember?.name ?? "Direct Chat")
      : activeRoom.name

  const chatHeaderAvatar =
    activeRoom.type === "direct"
      ? (otherMember?.avatar ?? (otherMember as { avatar_url?: string })?.avatar_url)
      : activeRoom.image

  const getManageGroupsLink = () => {
    if (currentUser?.role === "admin" || currentUser?.role === "organization") {
      return route("auth.topics.select")
    } else if (currentUser?.role === "user") {
      return route("user.topics.select")
    }
    return "#"
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="relative flex items-center justify-between gap-2 border-b border-border/50 bg-card/60 p-3 backdrop-blur-md flex-shrink-0 shadow-sm sm:p-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {mobileMenuButton ? <div className="shrink-0 md:hidden">{mobileMenuButton}</div> : null}
          <UserAvatar
            user={{ name: chatHeaderName, avatar: chatHeaderAvatar || "/placeholder.svg?height=32&width=32" }}
            className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-purple-500/20 shadow-md shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{chatHeaderName}</h3>
            {activeRoom.type === "public" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeRoom.members.length} {activeRoom.members.length === 1 ? 'member' : 'members'}
              </p>
            )}
            {activeRoom.type === "private" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Private Group • {activeRoom.members.length} {activeRoom.members.length === 1 ? 'member' : 'members'}
              </p>
            )}
            {activeRoom.type === "direct" && (
              <p className="text-xs text-muted-foreground mt-0.5">Direct Message</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {activeRoom.type !== "direct" && (
            <Link href={getManageGroupsLink()}>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 sm:gap-2 h-9 rounded-lg hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-300"
                title="Manage Groups"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Manage</span>
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300"
            onClick={() => setIsDetailsPanelOpen(true)}
          >
            <InfoIcon className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <MessageList />
      </div>

      <div className="p-3 sm:p-4 border-t border-border/50 bg-card/60 backdrop-blur-md flex-shrink-0 safe-area-inset-bottom shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.35)]">
        {typingUsers.length > 0 && (
          <div className="mb-3 px-2">
            <TypingIndicator users={typingUsers} />
          </div>
        )}
        {!isMember && activeRoom.type === "public" ? (
          <div className="flex justify-center px-1">
            <Button
              onClick={() => joinRoom(activeRoom.id)}
              className={`rounded-xl shadow-md text-white ${chatGradientBg} ${chatGradientBgHover} w-full sm:w-auto min-h-11`}
            >
              Join Public Room
            </Button>
          </div>
        ) : (
          <MessageInput />
        )}
      </div>

      <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex min-h-0 min-w-0 flex-col gap-0 border-l border-purple-500/15 bg-background p-0",
            /* Override chat/ui/sheet defaults (w-3/4 + sm:max-w-sm) so content isn’t clipped on large screens */
            "!w-[min(28rem,calc(100vw-1rem))] !max-w-[min(28rem,calc(100vw-1rem))] sm:!max-w-md",
            "overflow-hidden",
          )}
        >
          <div className="relative shrink-0 border-b border-border/50 px-5 pb-4 pt-6 pr-14 sm:px-6 sm:pr-14">
            <SheetHeader className="space-y-1.5 text-left">
              <SheetTitle className={`text-xl font-bold ${chatGradientText}`}>Chat details</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                Room info, members, and actions for this conversation.
              </SheetDescription>
            </SheetHeader>
          </div>
          <ChatDetailsPanel room={activeRoom} onClose={() => setIsDetailsPanelOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
