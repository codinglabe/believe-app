"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { useChat } from "@/providers/chat-provider"
import { AnimatePresence } from "framer-motion"
import { TypingIndicator } from "./typing-indicator"

export function MessageList() {
  const {
    conversations,
    selectedConversationId,
    currentUser,
    allUsers,
    isTyping,
    deleteMessage,
    setReplyingToMessage,
  } = useChat()
  const scrollAreaRef = useRef<HTMLDivElement>(null) // Ref for the ScrollArea viewport
  const lastMessageRef = useRef<HTMLDivElement>(null) // Ref for the last message element

  const selectedConversation = conversations.find((conv) => conv.id === selectedConversationId)

  useEffect(() => {
    // Scroll to the last message when messages change or typing status changes
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
    }
  }, [selectedConversationId, selectedConversation?.messages.length, isTyping]) // Scroll when messages or typing status changes

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
        Select a conversation to start chatting.
      </div>
    )
  }

  // Find a mock sender for the typing indicator (e.g., the first participant who isn't the current user)
  const typingSender = selectedConversation.participants.find((p) => p.id !== currentUser.id)

  return (
    <ScrollArea className="flex-1 p-4 bg-background h-full min-h-0" viewportRef={scrollAreaRef}>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {selectedConversation.messages.map((message, index) => {
            const sender = allUsers.find((user) => user.id === message.senderId)
            const repliedToMessage = message.repliedToMessageId
              ? selectedConversation.messages.find((msg) => msg.id === message.repliedToMessageId)
              : undefined

            return (
              <div key={message.id} ref={index === selectedConversation.messages.length - 1 ? lastMessageRef : null}>
                <ChatMessage
                  messageId={message.id}
                  senderName={sender?.name || "Unknown"}
                  senderAvatar={sender?.avatar || "/placeholder.svg?height=40&width=40"}
                  content={message.content}
                  timestamp={message.timestamp}
                  isCurrentUser={message.senderId === currentUser.id}
                  attachments={message.attachments}
                  onDelete={() => deleteMessage(selectedConversation.id, message.id)}
                  onReply={(msg) => setReplyingToMessage(msg)}
                  repliedToMessage={repliedToMessage}
                />
              </div>
            )
          })}
          {isTyping && typingSender && (
            <TypingIndicator senderName={typingSender.name} senderAvatar={typingSender.avatar} />
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  )
}
