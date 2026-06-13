"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { useChat } from "@/providers/chat-context"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatCallMessage } from "@/components/chat/chat-call-message"
import { Loader2Icon, ChevronUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { chatAmbientBg, chatGradientBg, chatGradientBgHover, chatSendButtonActive, chatWallpaperBg } from "./chat-brand"
import { cn } from "@/lib/utils"

type MessageListProps = {
  isMobile?: boolean
  isGroupChat?: boolean
}

export function MessageList({ isMobile = false, isGroupChat = false }: MessageListProps) {
  const { messages, loadingMessages, hasMoreMessages, loadMoreMessages, currentUser } = useChat()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showLoadButton, setShowLoadButton] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const prevMessagesLength = useRef(messages.length)

  const normalizeMessage = useCallback((message: any) => {
    const u = message.user || { id: 0, name: "Unknown" }
    return {
      ...message,
      message: message.content || message.message,
      user: {
        ...u,
        avatar_url: u.avatar || u.avatar_url,
      },
    }
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const messageIds = messages.map((m) => m.id)
      const uniqueIds = new Set(messageIds)
      if (messageIds.length !== uniqueIds.size) {
        console.warn("Duplicate message IDs detected. Please ensure all messages have unique IDs.")
      }
    }
  }, [messages])

  const getMessageKey = (message: { id: string | number }, index: number) => {
    return `${message.id}-${index}`
  }

  const checkIfNearBottom = useCallback(() => {
    if (!scrollAreaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    const threshold = 100
    return scrollHeight - (scrollTop + clientHeight) < threshold
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return

    const nearBottom = checkIfNearBottom()
    setIsNearBottom(nearBottom)
    setShowLoadButton(!nearBottom && hasMoreMessages)
  }, [hasMoreMessages, checkIfNearBottom])

  const handleLoadMore = useCallback(async () => {
    if (!scrollAreaRef.current || loadingMessages) return

    const scrollHeightBefore = scrollAreaRef.current.scrollHeight

    try {
      await loadMoreMessages()
      requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight - scrollHeightBefore
        }
      })
    } catch (error) {
      console.error("Failed to load more messages:", error)
    }
  }, [loadingMessages, loadMoreMessages])

  useEffect(() => {
    if (!scrollAreaRef.current) return

    const newMessagesAdded = messages.length > prevMessagesLength.current
    prevMessagesLength.current = messages.length

    if (newMessagesAdded && (isNearBottom || isInitialLoad)) {
      const behavior = isInitialLoad ? "auto" : "smooth"
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior,
      })
      setIsInitialLoad(false)
    }
  }, [messages.length, isNearBottom, isInitialLoad])

  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "auto",
      })
    }
  }, [])

  useEffect(() => {
    const currentRef = scrollAreaRef.current
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll)
      return () => currentRef.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  const normalizedMessages = messages.map(normalizeMessage)

  const shouldShowAvatar = (index: number) => {
    if (!isGroupChat) return false
    const current = normalizedMessages[index]
    const prev = normalizedMessages[index - 1]
    if (!prev) return true
    return prev.user?.id !== current.user?.id
  }

  return (
    <>
      <ScrollArea
        className={cn(
          "h-full overflow-y-auto",
          isMobile ? cn("px-2 py-2", chatWallpaperBg) : cn("p-3 sm:p-5 md:p-6", chatAmbientBg),
        )}
        viewportRef={scrollAreaRef}
      >
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMessages}
              className={cn(
                "flex items-center gap-2 rounded-full border bg-card/90 shadow-sm transition-colors",
                isMobile
                  ? "border-black/10 text-xs hover:bg-black/5 dark:border-white/10"
                  : "border-purple-500/20 hover:border-purple-500/30 hover:bg-purple-500/10",
              )}
            >
              {loadingMessages ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronUpIcon className="h-4 w-4" />
                  Load older messages
                </>
              )}
            </Button>
          </div>
        )}

        {loadingMessages && messages.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col">
            {normalizedMessages.map((normalizedMessage, index) => {
              if (normalizedMessage.message_type === "unity_call") {
                return (
                  <ChatCallMessage
                    key={getMessageKey(messages[index], index)}
                    message={normalizedMessage}
                    currentUserId={currentUser.id}
                  />
                )
              }

              return (
                <ChatMessage
                  key={getMessageKey(messages[index], index)}
                  message={normalizedMessage}
                  isOwnMessage={normalizedMessage.user?.id === currentUser.id}
                  isMobile={isMobile}
                  isGroupChat={isGroupChat}
                  showAvatar={shouldShowAvatar(index)}
                />
              )
            })}
          </div>
        )}
      </ScrollArea>

      {showLoadButton && (
        <div className="absolute bottom-3 left-1/2 z-10 max-w-[calc(100%-1rem)] -translate-x-1/2 px-2 sm:bottom-4">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({
                  top: scrollAreaRef.current.scrollHeight,
                  behavior: "smooth",
                })
              }
            }}
            className={cn(
              "border-0 shadow-lg text-white",
              isMobile ? chatSendButtonActive : cn(chatGradientBg, chatGradientBgHover),
            )}
          >
            <ChevronUpIcon className="mr-2 h-4 w-4 rotate-180" />
            New messages
          </Button>
        </div>
      )}
    </>
  )
}
