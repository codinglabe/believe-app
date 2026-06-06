"use client"
import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import axios from "axios"
import { usePage } from "@inertiajs/react"
import toast from "react-hot-toast"
import echo from "@/lib/echo"
import { chatTimestampMs } from "@/lib/chat-timestamps"
import { attachCsrfToAxios } from "@/lib/csrf"
import { startAudioCall as initiateAudioCall } from "@/lib/unityCall"
import { getBrowserTimezone } from "@/lib/timezone-detection"

// Dedicated axios for chat — must send CSRF on every POST (chat page has no AppLayout).
const api = axios.create({
  baseURL: "/",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Timezone": getBrowserTimezone(),
  },
})

attachCsrfToAxios(api)

api.interceptors.request.use((config) => {
  config.headers.set("X-Timezone", getBrowserTimezone())
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || "An error occurred"
      if (status !== 419 && status !== 401) {
        toast.error(message)
      }
    } else {
      toast.error("Network error - please check your connection")
    }
    return Promise.reject(error)
  },
)

// Type declarations
declare global {
  interface Window {
    Echo: any
  }
}

interface Organization {
  id: number
  name: string
}

interface User {
  id: number
  name: string
  avatar_url: string
  is_online: boolean
  role: string
  organization?: Organization | null
  interestedTopics?: any[]
  /** Primary action category IDs from profile (causes) — for filtering group chats */
  myCauseCategoryIds?: number[]
}

interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

export interface ChatMessage {
  id: number
  message: string
  attachments: Attachment[]
  created_at: string
  is_edited: boolean
  user: User
  reply_to_message?: {
    id: number
    message: string
    user: { name: string }
  }
  chat_room_id: number
  room_update: RoomUpdate
}

export interface LastMessage {
  message: string
  created_at: string
  user_name: string
}

export interface RoomUpdate {
  room_id: number
  last_message: LastMessage
}

export interface ChatRoom {
  id: number
  name: string
  type: "public" | "private" | "direct"
  image_url?: string
  description?: string
  last_message?: {
    message: string
    created_at: string
    user_name: string
  }
  unread_count: number
  members: User[]
  is_member: boolean
  created_by: number
  created_at: string
  topics?: ChatTopic[]
}

const sortMessagesByTime = (messages: ChatMessage[]): ChatMessage[] =>
  [...messages].sort((a, b) => chatTimestampMs(a.created_at) - chatTimestampMs(b.created_at))

interface ChatContextType {
  chatRooms: ChatRoom[]
  setChatRooms: React.Dispatch<React.SetStateAction<ChatRoom[]>>
  activeRoom: ChatRoom | null
  setActiveRoom: (room: ChatRoom | null) => void
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  hasMoreMessages: boolean
  loadMoreMessages: () => void
  sendMessage: (message: string, attachments: File[], replyToMessageId?: number) => Promise<void>
  deleteMessage: (messageId: number) => Promise<void>
  createRoom: (
    name: string,
    type: "public" | "private",
    description?: string,
    image?: File,
    members?: number[],
    topic_id: string,
  ) => Promise<void>
  createDirectChat: (userId: number) => Promise<void>
  joinRoom: (roomId: number) => Promise<void>
  leaveRoom: (roomId: number) => Promise<void>
  setTypingStatus: (isTyping: boolean) => void
  typingUsers: User[]
  markRoomAsRead: (roomId: number) => Promise<void>
  allUsers: User[]
  currentUser: User
  activeUsers: User[]
  replyingToMessage: ChatMessage | null
  setReplyingToMessage: React.Dispatch<React.SetStateAction<ChatMessage | null>>
  addMembers: (roomId: number, memberIds: number[]) => Promise<void>
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
  allTopics: ChatTopic[]
  loadingMessages: boolean
  startAudioCall: (roomId: number) => Promise<string | null>
}

export interface ChatTopic {
  id: number
  name: string
  description?: string
  primary_action_category_id?: number | null
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { props, url } = usePage()
  const p = props as { chatRooms?: ChatRoom[] }
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(p.chatRooms || [])
  const fromServer = p.chatRooms
  const roomsSyncKey = `${(fromServer?.length ?? 0)}:${(fromServer ?? []).map((r) => r.id).join(",")}`

  useEffect(() => {
    const next = p.chatRooms
    if (Array.isArray(next)) {
      setChatRooms(next)
    }
    // Intentional: re-sync on navigation (url) or when the server’s room list set changes; avoid depending on the whole Inertia `props` object.
  }, [url, roomsSyncKey])
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [typingUsers, setTypingUsers] = useState<User[]>([])
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [allTopics, setAllTopics] = useState<ChatTopic[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const allUsers = (props.allUsers as User[]) || []
  const currentUser = props.currentUser as User

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const isScrolledToBottomRef = useRef(true)
  const typingActiveRef = useRef(false)
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteTypingTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const echoInstance = echo()
    const connection = echoInstance.connector?.pusher?.connection
    if (!connection) return

    const logState = (states: { current?: string; previous?: string }) => {
      console.log("[Chat] Reverb connection:", states.previous, "→", states.current)
    }

    connection.bind("state_change", logState)
    connection.bind("error", (error: unknown) => {
      console.error("[Chat] Reverb connection error:", error)
    })

    return () => {
      connection.unbind("state_change", logState)
    }
  }, [])
  /** Only apply HTTP-fetched messages if they belong to the room currently being viewed (avoids race when switching chats). */
  const messagesRoomIdRef = useRef<number | null>(null)
  const activeRoomRef = useRef<ChatRoom | null>(null)
  activeRoomRef.current = activeRoom

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await axios.get("/chat/topics")
        setAllTopics(response.data.topics)
      } catch (error) {
        console.error("Error fetching topics:", error)
      }
    }

    fetchTopics()
  }, [])

  const addMembers = useCallback(
    async (roomId: number, memberIds: number[]) => {
      try {
        const { data } = await api.post(`/chat/rooms/${roomId}/members`, { members: memberIds })

        setChatRooms((prev) =>
          prev.map((room) => {
            if (room.id === roomId) {
              const newMembers = allUsers.filter(
                (user) => memberIds.includes(user.id) && !room.members.some((m) => m.id === user.id),
              )
              return { ...room, members: [...room.members, ...newMembers] }
            }
            return room
          }),
        )

        if (activeRoom?.id === roomId) {
          setActiveRoom((prev) => {
            if (!prev) return null
            const newMembers = allUsers.filter(
              (user) => memberIds.includes(user.id) && !prev.members.some((m) => m.id === user.id),
            )
            return { ...prev, members: [...prev.members, ...newMembers] }
          })
        }

        return data
      } catch (error) {
        console.error("Error adding members:", error)
        toast.error("Failed to add members")
        throw error
      }
    },
    [allUsers, activeRoom?.id],
  )

  // Initialize active users
  useEffect(() => {
    setActiveUsers(allUsers.filter((u) => u.is_online))
  }, [allUsers])

  const markRoomAsRead = useCallback(async (roomId: number) => {
    try {
      await api.post(`/chat/rooms/${roomId}/mark-as-read`)
      setChatRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unread_count: 0 } : room)))
    } catch (error) {
      console.error("Error marking room as read:", error)
    }
  }, [])

  const startAudioCall = useCallback(async (roomId: number) => {
    try {
      const result = await initiateAudioCall(roomId)
      if (!result?.join_url) {
        toast.error("Could not start audio call")
        return null
      }
      return result.join_url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start audio call")
      return null
    }
  }, [])

  const fetchMessages = useCallback(async (roomId: number, page = 1, append = false) => {
    try {
      const { data } = await api.get<{
        messages: ChatMessage[]
        has_more: boolean
        current_page: number
      }>(`/chat/rooms/${roomId}/messages`, { params: { page } })

      if (messagesRoomIdRef.current !== roomId) return

      setMessages((prev) => {
        const newMessages = data.messages.filter((msg) => !prev.some((pMsg) => pMsg.id === msg.id))
        return sortMessagesByTime(append ? [...newMessages.reverse(), ...prev] : newMessages.reverse())
      })

      setHasMoreMessages(data.has_more)
      setCurrentPage(data.current_page)
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast.error("Failed to load messages")
    }
  }, [])

  const deduplicateMessages = useCallback((messages: ChatMessage[]) => {
    const seen = new Set()
    const unique = messages.filter((msg) => {
      const duplicate = seen.has(msg.id)
      seen.add(msg.id)
      return !duplicate
    })
    return sortMessagesByTime(unique)
  }, [])

  /** Load thread over HTTP whenever the selected room changes — works with Reverb off. */
  useEffect(() => {
    if (!activeRoom?.id) {
      messagesRoomIdRef.current = null
      setMessages([])
      setHasMoreMessages(false)
      setCurrentPage(1)
      setLoadingMessages(false)
      return
    }

    const roomId = activeRoom.id
    messagesRoomIdRef.current = roomId
    setMessages([])
    setCurrentPage(1)
    setTypingUsers([])
    setReplyingToMessage(null)
    setLoadingMessages(true)

    let cancelled = false

    ;(async () => {
      try {
        await fetchMessages(roomId, 1, false)
        if (!cancelled && messagesRoomIdRef.current === roomId) {
          await markRoomAsRead(roomId)
        }
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeRoom?.id, fetchMessages, markRoomAsRead])

  useEffect(() => {
    if (!currentUser?.id) return

    const echoInstance = echo()
    const privateChannel = echoInstance.private(`user.${currentUser.id}`)

    privateChannel.listen(".MessageSent", (e: any) => {
      const ar = activeRoomRef.current
      // Handle room updates
      if (e.room_update) {
        setChatRooms((prev) => {
          const updatedRooms = prev.map((room) =>
            room.id === e.room_update.room_id
              ? {
                  ...room,
                  last_message: e.room_update.last_message,
                  unread_count: ar?.id === e.room_update.room_id ? 0 : room.unread_count + 1,
                }
              : room,
          )

          // Sort rooms by last message time
          return [...updatedRooms].sort((a, b) => {
            const timeA = a.last_message?.created_at || a.created_at
            const timeB = b.last_message?.created_at || b.created_at
            return chatTimestampMs(timeB) - chatTimestampMs(timeA)
          })
        })
      }

      if (e.message && ar?.id === e.message?.chat_room_id && (ar?.type === "direct" || ar?.type === "private")) {
        setMessages((prev) => {
          const existingMessage = prev.find((msg) => msg.id === e.message.id)
          if (existingMessage) return prev

          return deduplicateMessages([...prev, e.message])
        })

        // Mark as read if message is from another user
        if (e.message.user.id !== currentUser.id) {
          markRoomAsRead(ar.id)
        }
      }
    })

    privateChannel.error((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error("[Chat] user channel subscription failed:", error)
      }
    })

    return () => {
      privateChannel.stopListening(".MessageSent")
      echoInstance.leave(`user.${currentUser.id}`)
    }
  }, [currentUser?.id, markRoomAsRead, deduplicateMessages])

  // Real-time event handling (subscriptions only — messages load via HTTP above)
  useEffect(() => {
    if (!activeRoom) return

    const echoInstance = echo()
    const roomId = activeRoom.id
    const roomType = activeRoom.type

    let channelName: string
    let channel: any

    switch (roomType) {
      case "public":
        channelName = `public-chat.${roomId}`
        channel = echoInstance.channel(channelName)
        break
      case "private":
        channelName = `private-chat.${roomId}`
        channel = echoInstance.private(channelName)
        break
      case "direct":
        channelName = `direct-chat.${roomId}`
        channel = echoInstance.private(channelName)
        break
      default:
        return
    }

    channel.error((error: unknown) => {
      if (import.meta.env.DEV) {
        console.error(`[Chat] room channel subscription failed (${channelName}):`, error)
      }
    })

    // Message listener (merge with optimistic sends)
    channel.listen(".MessageSent", (e: { message: ChatMessage }) => {
        setMessages((prev) => {
          const existingMessage = prev.find((msg) => msg.id === e.message.id)
          if (existingMessage) return prev

          const optimisticMatch = prev.find(
            (msg) =>
              typeof msg.id === "number" &&
              msg.id > 1_000_000_000_000 &&
              msg.user?.id === e.message.user.id &&
              msg.message === e.message.message,
          )

          if (optimisticMatch) {
            return deduplicateMessages([...prev.filter((msg) => msg.id !== optimisticMatch.id), e.message])
          }

          return deduplicateMessages([...prev, e.message])
        })

        if (e.message.user.id !== currentUser.id) {
          markRoomAsRead(roomId)
        }
      })

    const normalizeTypingUser = (payload: {
      id: number
      name: string
      avatar?: string
      avatar_url?: string
    }): User => {
      const avatar = payload.avatar ?? payload.avatar_url ?? "/placeholder.svg?height=32&width=32"

      return {
        id: payload.id,
        name: payload.name,
        avatar_url: avatar,
        is_online: true,
        role: "",
      }
    }

    const clearRemoteTypingTimer = (userId: number) => {
      const existing = remoteTypingTimersRef.current.get(userId)
      if (existing) {
        clearTimeout(existing)
        remoteTypingTimersRef.current.delete(userId)
      }
    }

    // Typing indicator listener
    channel.listen(
      ".user.typing",
      (e: { user: { id: number; name: string; avatar?: string; avatar_url?: string }; is_typing: boolean }) => {
        if (e.user.id === currentUser.id) return

        if (e.is_typing) {
          const user = normalizeTypingUser(e.user)
          setTypingUsers((prev) => [...prev.filter((u) => u.id !== user.id), user])

          clearRemoteTypingTimer(user.id)
          remoteTypingTimersRef.current.set(
            user.id,
            setTimeout(() => {
              setTypingUsers((prev) => prev.filter((u) => u.id !== user.id))
              remoteTypingTimersRef.current.delete(user.id)
            }, 4000),
          )
        } else {
          clearRemoteTypingTimer(e.user.id)
          setTypingUsers((prev) => prev.filter((u) => u.id !== e.user.id))
        }
      },
    )

    // Add membership event listeners
    channel.listen(".member.joined", (e: { user: User }) => {
      setChatRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                members: [...room.members, e.user],
                is_member: room.id === roomId ? true : room.is_member,
              }
            : room,
        ),
      )

      setActiveRoom((prev) =>
        prev && prev.id === roomId
          ? {
              ...prev,
              members: [...prev.members, e.user],
              is_member: true,
            }
          : prev,
      )
    })

    channel.listen(".member.left", (e: { user_id: number }) => {
      setChatRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                members: room.members.filter((m) => m.id !== e.user_id),
                is_member:
                  room.id === roomId
                    ? room.members.some((m) => m.id === currentUser.id && m.id !== e.user_id)
                    : room.is_member,
              }
            : room,
        ),
      )

      setActiveRoom((prev) =>
        prev && prev.id === roomId
          ? {
              ...prev,
              members: prev.members.filter((m) => m.id !== e.user_id),
              is_member: prev.members.some((m) => m.id === currentUser.id && m.id !== e.user_id),
            }
          : prev,
      )
    })

    // Presence channel for private/direct chats
    if (roomType !== "public") {
      const presenceChannel = echoInstance.join(`presence-chat.${roomId}`)

      presenceChannel
        .here((users: User[]) => setActiveUsers(users))
        .joining((user: User) => setActiveUsers((prev) => [...prev, user]))
        .leaving((user: User) => setActiveUsers((prev) => prev.filter((u) => u.id !== user.id)))
    }

    return () => {
      channel.stopListening(".MessageSent")
      channel.stopListening(".user.typing")
      channel.stopListening(".member.joined")
      channel.stopListening(".member.left")
      remoteTypingTimersRef.current.forEach((timer) => clearTimeout(timer))
      remoteTypingTimersRef.current.clear()
      echoInstance.leave(channelName)
      if (roomType !== "public") {
        echoInstance.leave(`presence-chat.${roomId}`)
      }
    }
  }, [activeRoom?.id, activeRoom?.type, currentUser.id, deduplicateMessages, markRoomAsRead])

  const createRoom = useCallback(
    async (
      name: string,
      type: "public" | "private",
      description?: string,
      image?: File,
      members?: number[],
      topic_id: string,
    ) => {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("type", type)
      formData.append("topic_id", topic_id)
      if (description) formData.append("description", description)
      if (image) formData.append("image", image)
      if (type === "private" && members) {
        members.forEach((id) => formData.append("members[]", id.toString()))
      }

      try {
        const { data } = await api.post<{ room: ChatRoom }>("/chat/rooms", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        console.log("Room created:", data.room)
        //   setActiveRoom(data.room)
        setActiveRoom({
          ...data.room,
          topics: data.room.topics || [], // Ensure topics exists
        })

        // if (type === 'public' ||
        //     (type === 'private' && members?.includes(currentUser.id))) {
        // setChatRooms(prev => [data.room, ...prev]);
        // }
        toast.success("Room created successfully")
      } catch (error) {
        console.error("Error creating room:", error)
        toast.error("Failed to create room")
      }
    },
    [],
  )

  const leaveRoom = useCallback(
    async (roomId: number) => {
      try {
        await api.post(`/chat/rooms/${roomId}/leave`)
        setChatRooms((prev) => prev.filter((room) => room.id !== roomId))
        if (activeRoom?.id === roomId) {
          setActiveRoom(null)
          setMessages([])
        }
        toast.success("Left room successfully")
      } catch (error) {
        console.error("Error leaving room:", error)
        toast.error("Failed to leave room")
      }
    },
    [activeRoom?.id],
  )

  // Global room updates listener
  useEffect(() => {
    if (!currentUser?.id) return

    const echoInstance = echo()

    if (import.meta.env.DEV) {
      console.log("[Chat] Setting up room listeners for user:", currentUser.id)
    }

    // Public room listener
    const publicChannel = echoInstance.channel("chat-rooms")
    publicChannel.listen(".RoomCreated", (e: any) => {
      console.log("Public room created:", e.room)

      if (e.room?.type === "public") {
        const isAdmin = currentUser?.role === "admin"
        const userTopics = currentUser?.interestedTopics || []
        const roomTopics = e.room?.topics || []

        const isInterested = userTopics.some((topic) => roomTopics.some((roomTopic) => roomTopic?.id === topic?.id))

        if (isAdmin || isInterested) {
          setChatRooms((prev) => {
            const exists = prev.some((r) => r?.id === e.room?.id)
            return exists ? prev : [e.room, ...prev]
          })
        }
      }
    })

    // Private room listener
    const privateChannel = echoInstance.private(`user.${currentUser.id}`)
    privateChannel.listen(".RoomCreated", (e: any) => {
      setChatRooms((prev) => {
        const exists = prev.some((r) => r.id === e.room.id)
        if (!exists) {
          console.log("Adding private room to list")
          return [e.room, ...prev]
        }
        return prev
      })
    })

    return () => {
      publicChannel.stopListening(".RoomCreated")
      privateChannel.stopListening(".RoomCreated")
      echoInstance.leave("chat-rooms")
      // Do not leave user.* here — the MessageSent effect owns that subscription.
    }
  }, [currentUser.id, addMembers, leaveRoom])

  const loadMoreMessages = useCallback(() => {
    if (activeRoom && hasMoreMessages) {
      fetchMessages(activeRoom.id, currentPage + 1, true)
    }
  }, [activeRoom, hasMoreMessages, currentPage, fetchMessages])

  const updateRoomPreview = useCallback((roomId: number, messageText: string, createdAt: string, senderName: string) => {
    const patchRoom = (room: ChatRoom) =>
      room.id === roomId
        ? {
            ...room,
            last_message: {
              message: messageText,
              created_at: createdAt,
              user_name: senderName,
            },
          }
        : room

    setChatRooms((prev) => {
      const updated = prev.map(patchRoom)
      return [...updated].sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at
        const timeB = b.last_message?.created_at || b.created_at
        return chatTimestampMs(timeB) - chatTimestampMs(timeA)
      })
    })

    setActiveRoom((prev) => (prev && prev.id === roomId ? patchRoom(prev) : prev))
  }, [])

  const createDirectChat = useCallback(async (userId: number) => {
    try {
      const { data } = await api.post<{ room: ChatRoom }>("/chat/direct-chat", { user_id: userId })
      const room = data.room
      if (!room) return
      setChatRooms((prev) => {
        const exists = prev.some((r) => r.id === room.id)
        if (exists) return prev.map((r) => (r.id === room.id ? room : r))
        return [room, ...prev]
      })
      setActiveRoom(room)
      toast.success("Direct chat started")
      return room
    } catch (error) {
      console.error("Error creating direct chat:", error)
      toast.error("Failed to start direct chat")
    }
  }, [])

  const sendMessage = useCallback(
    async (message: string, attachments: File[] = [], replyToMessageId?: number) => {
      if (!activeRoom) return

      const tempId = Date.now()
      const nowIso = new Date().toISOString()
      const attachmentPreviews = attachments.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
      }))

      setMessages((prev) => {
        const replySource = replyToMessageId ? prev.find((m) => m.id === replyToMessageId) : undefined
        const optimisticMessage: ChatMessage = {
          id: tempId,
          message,
          attachments: attachmentPreviews,
          created_at: nowIso,
          is_edited: false,
          user: currentUser,
          reply_to_message:
            replyToMessageId && replySource
              ? {
                  id: replyToMessageId,
                  message: replySource.message,
                  user: { name: replySource.user.name },
                }
              : undefined,
          chat_room_id: activeRoom.id,
        }
        return deduplicateMessages([...prev, optimisticMessage])
      })
      updateRoomPreview(activeRoom.id, message || "[Attachment]", nowIso, currentUser.name)
      setReplyingToMessage(null)

      const formData = new FormData()
      formData.append("message", message)
      attachments.forEach((file) => formData.append("attachments[]", file))
      if (replyToMessageId) formData.append("reply_to_message_id", replyToMessageId.toString())

      try {
        const { data } = await api.post<{ message: ChatMessage }>(`/chat/rooms/${activeRoom.id}/messages`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })

        if (data?.message) {
          const serverMessage = data.message
          setMessages((prev) => deduplicateMessages(prev.map((msg) => (msg.id === tempId ? serverMessage : msg))))
          updateRoomPreview(
            activeRoom.id,
            serverMessage.message || "[Attachment]",
            serverMessage.created_at,
            serverMessage.user?.name || currentUser.name,
          )
        }
      } catch (error) {
        console.error("Error sending message:", error)
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
        toast.error("Failed to send message")
      } finally {
        attachmentPreviews.forEach((file) => URL.revokeObjectURL(file.url))
      }
    },
    [activeRoom, currentUser, deduplicateMessages, updateRoomPreview],
  )

  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      await api.delete(`/chat/messages/${messageId}`)
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
      toast.success("Message deleted")
    } catch (error) {
      console.error("Error deleting message:", error)
      toast.error("Failed to delete message")
    }
  }, [])

  const joinRoom = useCallback(
    async (roomId: number) => {
      try {
        await api.post(`/chat/rooms/${roomId}/join`)

        // Optimistically update the UI
        setChatRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, is_member: true } : room)))

        if (activeRoom?.id === roomId) {
          setActiveRoom((prev) =>
            prev
              ? {
                  ...prev,
                  is_member: true,
                  members: [...prev.members, currentUser],
                }
              : null,
          )
        }

        toast.success("Joined room successfully")
      } catch (error) {
        console.error("Error joining room:", error)
        toast.error("Failed to join room")
      }
    },
    [activeRoom?.id, currentUser],
  )

  const emitTypingStatus = useCallback(async (roomId: number, isTyping: boolean) => {
    try {
      await api.post(`/chat/rooms/${roomId}/typing`, { is_typing: isTyping })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error setting typing status:", error)
      }
    }
  }, [])

  const setTypingStatus = useCallback(
    (isTyping: boolean) => {
      const roomId = activeRoomRef.current?.id
      if (!roomId) return

      if (isTyping) {
        if (!typingActiveRef.current) {
          typingActiveRef.current = true
          void emitTypingStatus(roomId, true)
        }

        if (typingStopTimerRef.current) {
          clearTimeout(typingStopTimerRef.current)
        }

        typingStopTimerRef.current = setTimeout(() => {
          typingActiveRef.current = false
          typingStopTimerRef.current = null
          void emitTypingStatus(roomId, false)
        }, 2500)
      } else {
        if (typingStopTimerRef.current) {
          clearTimeout(typingStopTimerRef.current)
          typingStopTimerRef.current = null
        }
        if (typingActiveRef.current) {
          typingActiveRef.current = false
          void emitTypingStatus(roomId, false)
        }
      }
    },
    [emitTypingStatus],
  )

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current)
        typingStopTimerRef.current = null
      }
      const roomId = activeRoomRef.current?.id
      if (typingActiveRef.current && roomId) {
        typingActiveRef.current = false
        void emitTypingStatus(roomId, false)
      }
    }
  }, [emitTypingStatus])

  // Auto-scroll handling
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      isScrolledToBottomRef.current = container.scrollHeight - container.scrollTop <= container.clientHeight + 10
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (messagesContainerRef.current && isScrolledToBottomRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <ChatContext.Provider
      value={{
        chatRooms,
        setChatRooms,
        activeRoom,
        setActiveRoom,
        messages,
        setMessages,
        hasMoreMessages,
        loadMoreMessages,
        sendMessage,
        deleteMessage,
        createRoom,
        createDirectChat,
        joinRoom,
        leaveRoom,
        setTypingStatus,
        typingUsers,
        markRoomAsRead,
        allUsers,
        currentUser,
        activeUsers,
        replyingToMessage,
        setReplyingToMessage,
        addMembers,
        searchQuery,
        setSearchQuery,
        allTopics,
        loadingMessages,
        startAudioCall,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider")
  }
  return context
}
