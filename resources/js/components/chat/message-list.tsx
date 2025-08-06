"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { useChat } from "@/providers/chat-provider"
import { AnimatePresence } from "framer-motion"
import { TypingIndicator } from "./typing-indicator"
import { Button } from "@/components/chat/ui/button"
import { Loader2 } from "lucide-react"

export function MessageList() {
  const {
    selectedRoomId,
    messages,
    loadingMessages,
    hasMoreMessages,
    loadMoreMessages,
    currentUser,
    deleteMessage,
    setReplyingToMessage,
    typingUsers,
  } = useChat()

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
    }
  }, [messages?.length, typingUsers.length])

  // Load more messages when scrolling to top
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget
    if (scrollTop === 0 && hasMoreMessages && !loadingMessages) {
      loadMoreMessages()
    }
  }

  if (!selectedRoomId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Welcome to Chat!</h3>
          <p>Select a room to start chatting.</p>
        </div>
      </div>
    )
  }

  if (!messages) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <ScrollArea
      className="flex-1 p-4 bg-background h-full min-h-0"
      viewportRef={scrollAreaRef}
      onScrollCapture={handleScroll}
    >
      <div className="flex flex-col gap-2">
        {/* Load more button */}
        {hasMoreMessages && (
          <div className="flex justify-center py-2" ref={topRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMoreMessages}
              disabled={loadingMessages}
              className="text-muted-foreground"
            >
              {loadingMessages ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                "Load more messages"
              )}
            </Button>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <div key={message.id} ref={index === messages.length - 1 ? lastMessageRef : null}>
              <ChatMessage
                message={message}
                isCurrentUser={message.user.id === currentUser?.id}
                onDelete={deleteMessage}
                onReply={setReplyingToMessage}
              />
            </div>
          ))}

          {/* Typing indicators */}
          {typingUsers.map((user) => (
            <TypingIndicator key={user.id} senderName={user.name} senderAvatar={user.avatar} />
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {messages.length === 0 && !loadingMessages && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground py-8">
            <div className="text-center">
              <p className="text-lg mb-2">No messages yet</p>
              <p className="text-sm">Be the first to send a message!</p>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
