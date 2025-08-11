"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { useChat } from "@/providers/chat-provider"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ChatMessage } from "@/components/chat/chat-message"
import { Loader2Icon, ChevronUpIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"

export function MessageList() {
  const { messages, loadingMessages, hasMoreMessages, loadMoreMessages, currentUser } = useChat()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showLoadButton, setShowLoadButton] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const prevMessagesLength = useRef(messages.length)

  // Normalize message structure
  const normalizeMessage = useCallback((message: any) => {
    return {
      ...message,
      message: message.content || message.message,
      user: {
        ...message.user,
        avatar_url: message.user.avatar || message.user.avatar_url
      }
    }
  }, [])

  // Check for duplicate message IDs in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const messageIds = messages.map(m => m.id)
      const uniqueIds = new Set(messageIds)
      if (messageIds.length !== uniqueIds.size) {
        console.warn('Duplicate message IDs detected. Please ensure all messages have unique IDs.')
      }
    }
  }, [messages])

  // Ensure messages have unique keys by adding index as fallback
  const getMessageKey = (message: { id: string | number }, index: number) => {
    return `${message.id}-${index}`
  }

  // Determine if user is near the bottom of the scroll area
  const checkIfNearBottom = useCallback(() => {
    if (!scrollAreaRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    const threshold = 100 // pixels from bottom
    return scrollHeight - (scrollTop + clientHeight) < threshold
  }, [])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return

    const nearBottom = checkIfNearBottom()
    setIsNearBottom(nearBottom)
    setShowLoadButton(!nearBottom && hasMoreMessages)
  }, [hasMoreMessages, checkIfNearBottom])

  // Load more messages with smooth transition
  const handleLoadMore = useCallback(() => {
    if (!scrollAreaRef.current || loadingMessages) return

    const scrollHeightBefore = scrollAreaRef.current.scrollHeight

    loadMoreMessages().then(() => {
      requestAnimationFrame(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight - scrollHeightBefore
        }
      })
    })
  }, [loadingMessages, loadMoreMessages])

  // Scroll behavior for new messages
  useEffect(() => {
    if (!scrollAreaRef.current) return

    const newMessagesAdded = messages.length > prevMessagesLength.current
    prevMessagesLength.current = messages.length

    if (newMessagesAdded && (isNearBottom || isInitialLoad)) {
      const behavior = isInitialLoad ? 'auto' : 'smooth'
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior
      })
      setIsInitialLoad(false)
    }
  }, [messages.length, isNearBottom, isInitialLoad])

  // Initial scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'auto'
      })
    }
  }, [])

  // Set up scroll event listener
  useEffect(() => {
    const currentRef = scrollAreaRef.current
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll)
      return () => currentRef.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  return (
    <>
      <ScrollArea className="h-full p-4" viewportRef={scrollAreaRef}>
        {hasMoreMessages && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={loadingMessages}
              className="flex items-center gap-2"
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

        <div className="flex flex-col gap-4">
          {messages.map((message, index) => {
            const normalizedMessage = normalizeMessage(message)
            return (
              <ChatMessage
                key={getMessageKey(message, index)}
                message={normalizedMessage}
                isOwnMessage={message.user.id === currentUser.id}
              />
            )
          })}
        </div>

        {loadingMessages && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </ScrollArea>

      {/* Floating "New Messages" button */}
      {showLoadButton && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({
                  top: scrollAreaRef.current.scrollHeight,
                  behavior: 'smooth'
                })
              }
            }}
            className="shadow-lg"
          >
            <ChevronUpIcon className="h-4 w-4 mr-2 rotate-180" />
            New messages
          </Button>
        </div>
      )}
    </>
  )
}
