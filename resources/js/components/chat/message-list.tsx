"use client"

import React, { useEffect, useRef, useCallback } from "react"
import { useChat } from "@/providers/chat-provider"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ChatMessage } from "@/components/chat/chat-message"
import { Loader2Icon } from 'lucide-react'

export function MessageList() {
  const { messages, loadingMessages, hasMoreMessages, loadMoreMessages, currentUser } = useChat()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const initialScrollDone = useRef(false)

  // Scroll to bottom on initial load or when new messages arrive and user is at bottom
  useEffect(() => {
    if (scrollAreaRef.current && !initialScrollDone.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'auto' });
      initialScrollDone.current = true;
    } else if (scrollAreaRef.current && scrollAreaRef.current.scrollHeight - scrollAreaRef.current.scrollTop <= scrollAreaRef.current.clientHeight + 50) {
      // Only auto-scroll if already near the bottom
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (scrollAreaRef.current && scrollAreaRef.current.scrollTop === 0 && hasMoreMessages && !loadingMessages) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, loadingMessages, loadMoreMessages]);

  useEffect(() => {
    const currentRef = scrollAreaRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
      return () => currentRef.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaRef}>
      {loadingMessages && (
        <div className="flex justify-center py-2">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isOwnMessage={message.user.id === currentUser.id}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
