"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { router, usePage } from "@inertiajs/react"

interface User {
  id: number
  name: string
  avatar: string
  is_online: boolean
  role: string
  organization_id?: number
}

interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

export interface Message {
  id: number
  message: string
  attachments?: Attachment[]
  created_at: string
  is_edited: boolean
  user: User
  reply_to_message?: {
    id: number
    message: string
    user: {
      name: string
    }
  }
}

interface ChatRoom {
  id: number
  name: string
  type: "public" | "private" | "direct"
  image?: string
  description?: string
  created_at?: string
  last_message?: {
    message: string
    created_at: string
    user_name: string
  }
  unread_count: number
  members: User[]
  is_member?: boolean
}

interface ChatContextType {
  chatRooms: ChatRoom[]
  filteredRooms: ChatRoom[]
  selectedRoomId: number | null
  selectRoom: (id: number) => void
  messages: Message[]
  loadingMessages: boolean
  hasMoreMessages: boolean
  loadMoreMessages: () => void
  sendMessage: (message: string, attachments?: File[], replyToMessageId?: number) => Promise<void>
  deleteMessage: (messageId: number) => Promise<void>
  createRoom: (
    name: string,
    description: string,
    type: "public" | "private",
    members?: number[],
    image?: File,
  ) => Promise<void>
  joinRoom: (roomId: number) => Promise<void>
  leaveRoom: (roomId: number) => Promise<void>
  currentUser: User | null
  allUsers: User[]
  activeUsers: User[]
  typingUsers: User[]
  setTyping: (isTyping: boolean) => void
  replyingToMessage: Message | null
  setReplyingToMessage: (message: Message | null) => void
  isConnected: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  createDirectChat: (userId: number) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { props } = usePage()

  // Safely extract props with fallbacks
  const initialData = props as any
  const initialChatRooms = initialData?.chatRooms || initialData?.chat_rooms || []
  const initialAllUsers = initialData?.allUsers || initialData?.all_users || []
  const initialCurrentUser = initialData?.currentUser || initialData?.current_user || null

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(initialChatRooms)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [typingUsers, setTypingUsers] = useState<User[]>([])
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const currentChannelRef = useRef<string | null>(null)

  // Filter rooms based on search query
  const filteredRooms = chatRooms.filter((room) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true

    return (
      room.name.toLowerCase().includes(query) ||
      room.last_message?.message.toLowerCase().includes(query) ||
      room.members.some(member => member.name.toLowerCase().includes(query))
    )
  })

  // Get active users (online users from other organizations)
  const activeUsers = initialAllUsers.filter((user: User) =>
    user.is_online &&
    user.id !== initialCurrentUser?.id &&
    user.organization_id !== initialCurrentUser?.organization_id
  )

  // WebSocket connection setup for Laravel Reverb
  const connectWebSocket = useCallback(() => {
    if (!initialCurrentUser) return

    // Use Laravel Reverb's default configuration
    const reverbHost = import.meta.env.VITE_REVERB_HOST || "127.0.0.1"
    const reverbPort = import.meta.env.VITE_REVERB_PORT || "8080"
    const reverbAppKey = import.meta.env.VITE_REVERB_APP_KEY || "local"
    const reverbScheme = import.meta.env.VITE_REVERB_SCHEME || "http"

    const protocol = reverbScheme === "https" ? "wss" : "ws"
    const wsUrl = `${protocol}://${reverbHost}:${reverbPort}/app/${reverbAppKey}?protocol=7&client=js&version=8.4.0-rc2&flash=false`

    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log("WebSocket connected to Laravel Reverb")
        setIsConnected(true)
        reconnectAttempts.current = 0

        // Subscribe to user's private channel for global notifications
        const globalSubscribe = {
          event: "pusher:subscribe",
          data: {
            auth: "",
            channel: `private-user.${initialCurrentUser.id}`,
          },
        }
        wsRef.current?.send(JSON.stringify(globalSubscribe))
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle connection established
          if (data.event === "pusher:connection_established") {
            console.log("Laravel Reverb connection established")
            return
          }

          // Handle subscription succeeded
          if (data.event === "pusher:subscription_succeeded") {
            console.log("Subscription succeeded for channel:", data.channel)
            return
          }

          // Handle new message
          if (data.event === "MessageSent") {
            const messageData = JSON.parse(data.data)
            const newMessage = messageData.message

            console.log("New message received:", newMessage)

            // Add message to current room if it matches
            if (newMessage.chat_room_id === selectedRoomId) {
              setMessages((prev) => [...prev, newMessage])
            }

            // Update room list - move room to top and update last message
            setChatRooms((prev) => {
              const updatedRooms = prev.map((room) => {
                if (room.id === newMessage.chat_room_id) {
                  return {
                    ...room,
                    last_message: {
                      message: newMessage.message || "[Attachment]",
                      created_at: newMessage.created_at,
                      user_name: newMessage.user.name,
                    },
                    unread_count: newMessage.user.id === initialCurrentUser.id ? 0 : room.unread_count + 1,
                  }
                }
                return room
              })

              // Sort rooms - move updated room to top
              return updatedRooms.sort((a, b) => {
                if (a.id === newMessage.chat_room_id) return -1
                if (b.id === newMessage.chat_room_id) return 1
                return new Date(b.last_message?.created_at || '').getTime() - new Date(a.last_message?.created_at || '').getTime()
              })
            })
          }

          // Handle user typing
          if (data.event === "UserTyping") {
            const typingData = JSON.parse(data.data)
            if (typingData.user.id === initialCurrentUser.id) return

            console.log("User typing event:", typingData)

            setTypingUsers((prev) => {
              if (typingData.is_typing) {
                return prev.find((u) => u.id === typingData.user.id) ? prev : [...prev, typingData.user]
              } else {
                return prev.filter((u) => u.id !== typingData.user.id)
              }
            })
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected")
        setIsConnected(false)

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.pow(2, reconnectAttempts.current) * 1000

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`)
            connectWebSocket()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        setIsConnected(false)
      }
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error)
    }
  }, [initialCurrentUser, selectedRoomId])

  // Subscribe to room channel
  const subscribeToRoomChannel = useCallback((roomId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Unsubscribe from previous channel
    if (currentChannelRef.current) {
      const unsubscribe = {
        event: "pusher:unsubscribe",
        data: {
          channel: currentChannelRef.current,
        },
      }
      wsRef.current.send(JSON.stringify(unsubscribe))
    }

    // Subscribe to new room channel
    const channelName = `presence-chat-room.${roomId}`
    const subscribe = {
      event: "pusher:subscribe",
      data: {
        auth: "",
        channel: channelName,
      },
    }

    wsRef.current.send(JSON.stringify(subscribe))
    currentChannelRef.current = channelName
    console.log(`Subscribed to ${channelName}`)
  }, [])

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setTypingUsers([])
    currentChannelRef.current = null
  }, [])

  // Load messages for selected room
  const loadMessages = useCallback(async (roomId: number, page = 1, append = false) => {
    if (!roomId) return

    setLoadingMessages(true)
    try {
      const response = await fetch(`/chat/rooms/${roomId}/messages?page=${page}`, {
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (append) {
        setMessages((prev) => [...data.messages.reverse(), ...prev])
      } else {
        setMessages(data.messages.reverse())
      }

      setHasMoreMessages(data.has_more)
      setCurrentPage(data.current_page)
    } catch (error) {
      console.error("Failed to load messages:", error)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const selectRoom = useCallback(
    async (id: number) => {
      // Don't reload if same room is selected
      if (id === selectedRoomId) return

      setSelectedRoomId(id)
      setMessages([])
      setCurrentPage(1)
      setReplyingToMessage(null)
      setTypingUsers([])

      await loadMessages(id, 1, false)

      // Subscribe to room channel
      subscribeToRoomChannel(id)

      // Mark room as read
      try {
        await fetch(`/chat/rooms/${id}/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })
        setChatRooms((prev) => prev.map((room) => (room.id === id ? { ...room, unread_count: 0 } : room)))
      } catch (error) {
        console.error("Failed to mark room as read:", error)
      }
    },
    [loadMessages, selectedRoomId, subscribeToRoomChannel],
  )

  const loadMoreMessages = useCallback(async () => {
    if (!selectedRoomId || !hasMoreMessages || loadingMessages) return
    await loadMessages(selectedRoomId, currentPage + 1, true)
  }, [selectedRoomId, hasMoreMessages, loadingMessages, currentPage, loadMessages])

  const sendMessage = useCallback(
    async (message: string, attachments?: File[], replyToMessageId?: number) => {
      if (!selectedRoomId || (!message.trim() && !attachments?.length)) return

      const formData = new FormData()
      if (message.trim()) formData.append("message", message)
      if (replyToMessageId) formData.append("reply_to_message_id", replyToMessageId.toString())

      attachments?.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file)
      })

      try {
        const response = await fetch(`/chat/rooms/${selectedRoomId}/messages`, {
          method: "POST",
          body: formData,
          headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })

        if (!response.ok) throw new Error("Failed to send message")

        const data = await response.json()

        // Add message to local state immediately
        setMessages((prev) => [...prev, data.message])

        setReplyingToMessage(null)
      } catch (error) {
        console.error("Failed to send message:", error)
        throw error
      }
    },
    [selectedRoomId],
  )

  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      const response = await fetch(`/chat/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
      })

      if (!response.ok) throw new Error("Failed to delete message")

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    } catch (error) {
      console.error("Failed to delete message:", error)
      throw error
    }
  }, [])

  const createRoom = useCallback(
    async (name: string, description: string, type: "public" | "private", members?: number[], image?: File) => {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("type", type)
      if (image) formData.append("image", image)

      members?.forEach((memberId, index) => {
        formData.append(`members[${index}]`, memberId.toString())
      })

      try {
        const response = await fetch("/chat/rooms", {
          method: "POST",
          body: formData,
          headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
        })

        if (!response.ok) throw new Error("Failed to create room")

        const data = await response.json()

        // Add room to state immediately and select it
        setChatRooms((prev) => [data.room, ...prev])
        setSelectedRoomId(data.room.id)

        return data.room
      } catch (error) {
        console.error("Failed to create room:", error)
        throw error
      }
    },
    [],
  )

  const createDirectChat = useCallback(async (userId: number) => {
    try {
      const response = await fetch("/chat/direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!response.ok) throw new Error("Failed to create direct chat")

      const data = await response.json()

      // Check if room already exists in state
      const existingRoom = chatRooms.find(room => room.id === data.room.id)

      if (!existingRoom) {
        setChatRooms((prev) => [data.room, ...prev])
      }

      setSelectedRoomId(data.room.id)
      return data.room
    } catch (error) {
      console.error("Failed to create direct chat:", error)
      throw error
    }
  }, [chatRooms])

  const joinRoom = useCallback(async (roomId: number) => {
    try {
      const response = await fetch(`/chat/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
      })

      if (!response.ok) throw new Error("Failed to join room")

      // Update room membership in state
      setChatRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? { ...room, is_member: true, members: [...room.members, initialCurrentUser].filter(Boolean) }
            : room
        )
      )
    } catch (error) {
      console.error("Failed to join room:", error)
      throw error
    }
  }, [initialCurrentUser])

  const leaveRoom = useCallback(async (roomId: number) => {
    try {
      const response = await fetch(`/chat/rooms/${roomId}/leave`, {
        method: "POST",
        headers: {
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
      })

      if (!response.ok) throw new Error("Failed to leave room")

      // Remove room from state or update membership
      setChatRooms((prev) => prev.filter((room) => room.id !== roomId))

      if (selectedRoomId === roomId) {
        setSelectedRoomId(null)
        setMessages([])
      }
    } catch (error) {
      console.error("Failed to leave room:", error)
      throw error
    }
  }, [selectedRoomId])

  const setTyping = useCallback(
    async (isTyping: boolean) => {
      if (!selectedRoomId) return

      try {
        await fetch(`/chat/rooms/${selectedRoomId}/typing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          },
          body: JSON.stringify({ is_typing: isTyping }),
        })
      } catch (error) {
        console.error("Failed to send typing status:", error)
      }
    },
    [selectedRoomId],
  )

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket()
    return () => {
      disconnectWebSocket()
    }
  }, [connectWebSocket, disconnectWebSocket])

  return (
    <ChatContext.Provider
      value={{
        chatRooms,
        filteredRooms,
        selectedRoomId,
        selectRoom,
        messages,
        loadingMessages,
        hasMoreMessages,
        loadMoreMessages,
        sendMessage,
        deleteMessage,
        createRoom,
        joinRoom,
        leaveRoom,
        currentUser: initialCurrentUser,
        allUsers: initialAllUsers,
        activeUsers,
        typingUsers,
        setTyping,
        replyingToMessage,
        setReplyingToMessage,
        isConnected,
        searchQuery,
        setSearchQuery,
        createDirectChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
