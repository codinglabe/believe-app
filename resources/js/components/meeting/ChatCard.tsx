"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/frontend/ui/popover"
import { Send, Smile, MessageCircle, Users, ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import EmojiPicker from "./EmojiPicker"
import type { ChatMessage } from "@/types"
import { echo } from "@/lib/echo"
import { usePage } from "@inertiajs/react"
import ScrollArea from "./ScrollArea"

interface ChatCardProps {
  messages: ChatMessage[]
  meetingId: number
  onSendMessage: (message: string) => void
  onSendEmoji: (emoji: string) => void
  newMessageCount?: number
  isLoading?: boolean
  className?: string
}

export default function ChatCard({
  messages: initialMessages,
  meetingId,
  onSendMessage,
  onSendEmoji,
  newMessageCount = 0,
  isLoading = false,
  className = "",
}: ChatCardProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [message, setMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = usePage().props

  // Smooth scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      setIsAutoScrolling(true)
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      })
      // Reset auto-scrolling flag after animation completes
      setTimeout(() => setIsAutoScrolling(false), 1000)
    }
  }, [])

  // Check if user is near bottom of chat
  const checkScrollPosition = useCallback(() => {
    if (scrollRef.current && !isAutoScrolling) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom && messages.length > 0)
    }
  }, [isAutoScrolling, messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim())
      setMessage("")
      setIsTyping(false)
      // Auto scroll to bottom when user sends message
      setTimeout(() => scrollToBottom(), 100)
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    onSendEmoji(emoji.native)
    setShowEmojiPicker(false)
    // Auto scroll to bottom when emoji is sent
    setTimeout(() => scrollToBottom(), 100)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value)
    setIsTyping(e.target.value.length > 0)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > initialMessages.length) {
      // Only auto-scroll if user is near bottom or if it's their own message
      const lastMessage = messages[messages.length - 1]
      const isOwnMessage = lastMessage && lastMessage.user.id === user.id

      if (isOwnMessage || !showScrollButton) {
        setTimeout(() => scrollToBottom(), 100)
      }
    }
  }, [messages.length, initialMessages.length, scrollToBottom, showScrollButton, user.id, messages])

  // Listen to chat messages via Echo
  useEffect(() => {
    if (!meetingId) return

    // Public chat channel
    const chatChannel = echo.channel(`meeting.${meetingId}.chat`)

    const handleMessage = (e: any) => {
      setMessages((prev) => [...prev, e])
    }

    chatChannel.listen(".message.sent", handleMessage)

    // Private messages for this user
    const privateChannel = echo.channel(`meeting.${meetingId}.user.${user.id}`)
    privateChannel.listen(".message.sent", handleMessage)

    return () => {
      chatChannel.stopListening(".message.sent", handleMessage)
      privateChannel.stopListening(".message.sent", handleMessage)
    }
  }, [meetingId, user.id])

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Add scroll event listener to detect scroll position
  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScrollPosition)
      // Initial check
      checkScrollPosition()

      return () => scrollElement.removeEventListener("scroll", checkScrollPosition)
    }
  }, [checkScrollPosition])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const isCurrentUser = (msgUser: any) => msgUser.id === user.id

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg backdrop-blur-sm flex flex-col overflow-hidden ${className}`}
    >
      {/* Chat Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Chat</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {newMessageCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {newMessageCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No messages yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isOwn = isCurrentUser(msg.user)
                const showAvatar = index === 0 || !isCurrentUser(messages[index - 1]?.user)
                const isNewMessage = index >= initialMessages.length

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"} space-x-2 ${
                      isNewMessage ? "animate-fade-in-up" : ""
                    }`}
                  >
                    {!isOwn && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="w-8 h-8 transition-transform duration-200 hover:scale-110">
                            <AvatarImage
                              src={
                                msg.user.avatar || `/placeholder.svg?height=32&width=32&text=${msg.user.name.charAt(0)}`
                              }
                            />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {msg.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col max-w-xs lg:max-w-md ${isOwn ? "items-end" : "items-start"}`}>
                      {showAvatar && !isOwn && (
                        <div className="flex items-center space-x-2 mb-1 px-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{msg.user.name}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTime(msg.timestamp || msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`relative px-4 py-2 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                          msg.type === "highlight"
                            ? "bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 text-orange-900 dark:text-orange-100 font-medium"
                            : msg.type === "emoji"
                              ? "text-3xl bg-transparent shadow-none p-1"
                              : msg.type === "system"
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 italic text-sm"
                                : isOwn
                                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        <p className={`text-sm ${msg.type === "emoji" ? "text-center" : ""}`}>{msg.content}</p>

                        {isOwn && msg.type !== "emoji" && (
                          <div className="absolute -bottom-1 -right-1">
                            <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
                          </div>
                        )}
                      </div>

                      {isOwn && showAvatar && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
                          {formatTime(msg.timestamp || msg.created_at)}
                        </span>
                      )}
                    </div>

                    {isOwn && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="w-8 h-8 transition-transform duration-200 hover:scale-110">
                            <AvatarImage
                              src={user.avatar || `/placeholder.svg?height=32&width=32&text=${user.name.charAt(0)}`}
                            />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-green-500 to-blue-600 text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8" />
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Enhanced Scroll to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <Button
              variant="secondary"
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-full px-3 py-1 text-xs animate-bounce transition-all duration-200 hover:scale-105"
              onClick={() => scrollToBottom()}
            >
              <ArrowDown className="w-3 h-3 mr-1" />
              {newMessageCount > 0 ? `${newMessageCount} new` : "Scroll to bottom"}
            </Button>
          </div>
        )}
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-fade-in">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">You are typing...</span>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pr-12 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />

              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      disabled={isLoading}
                    >
                      <Smile className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0 shadow-xl" side="top">
                    <EmojiPicker onEmojiSelect={handleEmojiSelect} theme="auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || isLoading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl w-10 h-10 p-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
          <span>Press Enter to send</span>
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>
              {messages.filter((m, i, arr) => arr.findIndex((msg) => msg.user.id === m.user.id) === i).length}{" "}
              participants
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
