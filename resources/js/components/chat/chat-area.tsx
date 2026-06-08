"use client"

import React from "react"
import { callNotificationsEnabled, requestCallPermissionsPrompt } from "@/lib/call-permissions"
import { useChat } from "@/providers/chat-provider"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { UserAvatar } from "@/components/chat/user-avatar"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { Button } from "@/components/chat/ui/button"
import { ChevronLeft, InfoIcon, Phone, SettingsIcon } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/chat/ui/sheet"
import { ChatDetailsPanel } from "@/components/chat/chat-details-panel"
import { Link, router } from "@inertiajs/react"
import { motion } from "framer-motion"
import { chatAccentText, chatGradientBg, chatGradientBgHover, chatGradientText, chatInputBarBg, chatMobileDivider } from "./chat-brand"
import { cn } from "@/lib/utils"

type ChatAreaProps = {
  mobileMenuButton?: React.ReactNode
  isMobile?: boolean
  onBack?: () => void
}

export function ChatArea({ mobileMenuButton, isMobile = false, onBack }: ChatAreaProps = {}) {
  const { activeRoom, currentUser, typingUsers, joinRoom, startAudioCall } = useChat()
  const otherTypingUsers = typingUsers.filter((u) => u.id !== currentUser?.id)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = React.useState(false)
  const [startingCall, setStartingCall] = React.useState(false)

  const isMember = activeRoom?.is_member || activeRoom?.members?.some((member) => member.id === currentUser?.id)

  if (!activeRoom) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a chat to start messaging
      </div>
    )
  }

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

  const subtitle =
    activeRoom.type === "direct"
      ? "tap here for contact info"
      : activeRoom.type === "public"
        ? `${activeRoom.members.length} ${activeRoom.members.length === 1 ? "member" : "members"}`
        : `Private · ${activeRoom.members.length} ${activeRoom.members.length === 1 ? "member" : "members"}`

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className={cn(
          "relative flex shrink-0 items-center gap-1 border-b bg-card/95 backdrop-blur-md",
          isMobile
            ? cn("min-h-[3.25rem] px-1 safe-area-inset-top", chatMobileDivider)
            : "gap-2 border-border/50 p-3 shadow-sm sm:p-4",
        )}
      >
        {/* Back button — WhatsApp / Messenger style on mobile */}
        {isMobile && onBack ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full hover:bg-muted/80"
            onClick={onBack}
            aria-label="Back to chats"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </Button>
        ) : mobileMenuButton ? (
          <div className="shrink-0 md:hidden">{mobileMenuButton}</div>
        ) : null}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/40 sm:gap-3"
          onClick={() => setIsDetailsPanelOpen(true)}
        >
          <UserAvatar
            user={{ name: chatHeaderName, avatar: chatHeaderAvatar || "/placeholder.svg?height=32&width=32" }}
            className={cn(
              "shrink-0 shadow-sm",
              isMobile ? "h-9 w-9" : "h-9 w-9 ring-2 ring-purple-500/20 sm:h-10 sm:w-10",
            )}
          />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-tight sm:text-base">{chatHeaderName}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {otherTypingUsers.length > 0 ? (
                <span className={chatAccentText}>typing…</span>
              ) : (
                subtitle
              )}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 pr-1 sm:gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/80"
            aria-label="Start audio call"
            disabled={startingCall}
            onClick={() => {
              if (!activeRoom) {
                return
              }
              if (!callNotificationsEnabled()) {
                requestCallPermissionsPrompt()
              }
              setStartingCall(true)
              void startAudioCall(activeRoom.id).then((joinUrl) => {
                setStartingCall(false)
                if (joinUrl) {
                  router.visit(joinUrl)
                }
              })
            }}
          >
            <Phone className="h-5 w-5" />
          </Button>
          {activeRoom.type !== "direct" && !isMobile && (
            <Link href={getManageGroupsLink()}>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-9 items-center gap-1.5 rounded-lg hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-300 sm:gap-2"
                title="Manage Groups"
              >
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden text-sm sm:inline">Manage</span>
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-muted/80"
            onClick={() => setIsDetailsPanelOpen(true)}
            aria-label="Chat details"
          >
            <InfoIcon className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MessageList isMobile={isMobile} isGroupChat={activeRoom.type !== "direct"} />
      </div>

      <div
        className={cn(
          "shrink-0 border-t safe-area-inset-bottom",
          isMobile
            ? cn("px-2 py-2", chatMobileDivider, chatInputBarBg)
            : "border-border/50 bg-card/60 p-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md dark:shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.35)] sm:p-4",
        )}
      >
        {otherTypingUsers.length > 0 && !isMobile && (
          <div className="mb-3 px-2">
            <TypingIndicator users={otherTypingUsers} />
          </div>
        )}
        {!isMember && activeRoom.type === "public" ? (
          <div className="flex justify-center px-1">
            <Button
              onClick={() => joinRoom(activeRoom.id)}
              className={`min-h-11 w-full rounded-xl text-white shadow-md sm:w-auto ${chatGradientBg} ${chatGradientBgHover}`}
            >
              Join Public Room
            </Button>
          </div>
        ) : (
          <MessageInput isMobile={isMobile} />
        )}
      </div>

      <Sheet open={isDetailsPanelOpen} onOpenChange={setIsDetailsPanelOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex min-h-0 min-w-0 flex-col gap-0 border-l border-purple-500/15 bg-background p-0",
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
