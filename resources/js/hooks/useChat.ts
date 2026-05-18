"use client"

import { useState, useEffect, useCallback } from "react"

interface ChatMessage {
  id: number
  content: string
  user: {
    id: number
    name: string
    avatar?: string
    role: string
  }
  type: "text" | "emoji" | "system"
  timestamp: string
  created_at: string
  is_private?: boolean
  metadata?: any
}

interface UseChatReturn {
  messages: ChatMessage[]
  sendMessage: (content: string, messageType?: string) => Promise<void>
  sendEmoji: (emoji: string) => Promise<void>
  deleteMessage: (messageId: number) => Promise<void>
  isConnected: boolean
  isLoading: boolean
  connectionStatus: string
}

export function useChat(meetingId: number, userId: number): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState("Connecting...")

  // Load initial messages
  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/meetings/${meetingId}/chat/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
        setIsConnected(true)
        setConnectionStatus("Connected")
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      setIsConnected(false)
      setConnectionStatus("Connection failed")
    } finally {
      setIsLoading(false)
    }
  }, [meetingId])

  // Send text message
  const sendMessage = useCallback(
    async (content: string, messageType = "text") => {
      try {
        const response = await fetch(`/meetings/${meetingId}/chat/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
          body: JSON.stringify({
            message: content,
            message_type: messageType,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        const data = await response.json()

        // Message will be added via Laravel Echo listener
        return data
      } catch (error) {
        console.error("Failed to send message:", error)
        throw error
      }
    },
    [meetingId],
  )

  // Send emoji
  const sendEmoji = useCallback(
    async (emoji: string) => {
      try {
        const response = await fetch(`/meetings/${meetingId}/chat/emoji`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
          body: JSON.stringify({
            emoji,
            reaction_type: "message",
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to send emoji")
        }

        const data = await response.json()
        return data
      } catch (error) {
        console.error("Failed to send emoji:", error)
        throw error
      }
    },
    [meetingId],
  )

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: number) => {
      try {
        const response = await fetch(`/meetings/${meetingId}/chat/messages/${messageId}`, {
          method: "DELETE",
          headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })

        if (response.ok) {
          setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
        }
      } catch (error) {
        console.error("Failed to delete message:", error)
        throw error
      }
    },
    [meetingId],
  )

  // Initialize chat and set up Laravel Echo listeners
  useEffect(() => {
    loadMessages()

    // Set up Laravel Echo listeners for real-time updates
    const chatChannel = window.Echo.channel(`meeting.${meetingId}.chat`)
    const reactionChannel = window.Echo.channel(`meeting.${meetingId}.reactions`)

    // Listen for new messages
    chatChannel.listen("MessageSent", (e: any) => {
      const newMessage: ChatMessage = {
        id: e.message.id,
        content: e.message.message,
        user: e.message.user,
        type: e.message.message_type || "text",
        timestamp: new Date(e.message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        created_at: e.message.created_at,
        is_private: e.message.is_private,
        metadata: e.message.metadata,
      }

      setMessages((prev) => {
        // Avoid duplicates
        if (prev.find((msg) => msg.id === newMessage.id)) {
          return prev
        }
        return [...prev, newMessage]
      })
    })

    // Listen for emoji reactions
    reactionChannel.listen("EmojiReaction", (e: any) => {
      const emojiMessage: ChatMessage = {
        id: Date.now(), // Temporary ID for reactions
        content: e.emoji,
        user: e.user,
        type: "emoji",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        created_at: new Date().toISOString(),
        metadata: e.metadata,
      }

      setMessages((prev) => [...prev, emojiMessage])
    })

    // Listen for message deletions
    chatChannel.listen("MessageDeleted", (e: any) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== e.message_id))
    })

    // Connection status listeners
    chatChannel
      .subscribed(() => {
        setIsConnected(true)
        setConnectionStatus("Connected")
      })
      .error((error: any) => {
        console.error("Chat channel error:", error)
        setIsConnected(false)
        setConnectionStatus("Connection error")
      })

    // Cleanup
    return () => {
      window.Echo.leaveChannel(`meeting.${meetingId}.chat`)
      window.Echo.leaveChannel(`meeting.${meetingId}.reactions`)
    }
  }, [meetingId, loadMessages])

  return {
    messages,
    sendMessage,
    sendEmoji,
    deleteMessage,
    isConnected,
    isLoading,
    connectionStatus,
  }
}
