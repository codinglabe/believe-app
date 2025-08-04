"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"

interface User {
  id: string
  name: string
  avatar: string
  status: "online" | "offline" | "away"
}

interface Attachment {
  name: string
  url: string // In a real app, this would be a URL to the uploaded file
  type: string // e.g., 'image/png', 'application/pdf'
}

export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  attachments?: Attachment[]
  repliedToMessageId?: string // Added for reply functionality
}

interface Conversation {
  id: string
  type: "individual" | "group"
  name: string
  participants: User[]
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  unreadCount?: number // Added for unread messages
}

interface ChatContextType {
  conversations: Conversation[]
  selectedConversationId: string | null
  selectConversation: (id: string) => void
  addMessage: (conversationId: string, content: string, attachments?: Attachment[], repliedToMessageId?: string) => void
  deleteMessage: (conversationId: string, messageId: string) => void // Added delete message
  createGroup: (name: string, participantIds: string[]) => void
  currentUser: User
  allUsers: User[]
  isTyping: boolean // Mock typing state
  setIsTyping: (typing: boolean) => void // Function to set typing state
  replyingToMessage: Message | null // Message being replied to
  setReplyingToMessage: (message: Message | null) => void // Set message to reply to
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

const mockUsers: User[] = [
  { id: "user-1", name: "Alice", avatar: "/placeholder.svg?height=40&width=40&text=A", status: "online" },
  { id: "user-2", name: "Bob", avatar: "/placeholder.svg?height=40&width=40&text=B", status: "offline" },
  { id: "user-3", name: "Charlie", avatar: "/placeholder.svg?height=40&width=40&text=C", status: "away" },
  { id: "user-4", name: "Diana", avatar: "/placeholder.svg?height=40&width=40&text=D", status: "online" },
  { id: "user-5", name: "Eve", avatar: "/placeholder.svg?height=40&width=40&text=E", status: "offline" },
]

const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    type: "individual",
    name: "Alice",
    participants: [mockUsers[0], mockUsers[1]], // Assuming currentUser is mockUsers[0]
    messages: [
      {
        id: uuidv4(),
        senderId: mockUsers[1].id,
        content: "Hey there! How are you?",
        timestamp: "10:00 AM",
      },
      {
        id: uuidv4(),
        senderId: mockUsers[0].id,
        content: "I'm good, thanks! Just working on a new project.",
        timestamp: "10:05 AM",
      },
      {
        id: uuidv4(),
        senderId: mockUsers[1].id,
        content: "Check out these images!",
        timestamp: "10:10 AM",
        attachments: [
          {
            name: "image1.png",
            url: "/placeholder.svg?height=150&width=200",
            type: "image/png",
          },
          {
            name: "image2.jpg",
            url: "/placeholder.svg?height=120&width=180",
            type: "image/jpeg",
          },
          {
            name: "image3.jpeg",
            url: "/placeholder.svg?height=100&width=150",
            type: "image/jpeg",
          },
          {
            name: "image4.png",
            url: "/placeholder.svg?height=130&width=190",
            type: "image/png",
          },
          {
            name: "image5.gif",
            url: "/placeholder.svg?height=110&width=160",
            type: "image/gif",
          },
          {
            name: "image6.webp",
            url: "/placeholder.svg?height=140&width=210",
            type: "image/webp",
          },
        ],
      },
      {
        id: uuidv4(),
        senderId: mockUsers[0].id,
        content: "And here's a document!",
        timestamp: "10:15 AM",
        attachments: [
          {
            name: "document.pdf",
            url: "https://example.com/document.pdf", // Placeholder URL for a PDF
            type: "application/pdf",
          },
        ],
      },
    ],
    lastMessage: "And here's a document!",
    lastMessageTime: "10:15 AM",
    unreadCount: 0, // No unread for selected
  },
  {
    id: "conv-2",
    type: "group",
    name: "Project Team",
    participants: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]],
    messages: [
      {
        id: uuidv4(),
        senderId: mockUsers[2].id,
        content: "Meeting at 2 PM today, don't forget!",
        timestamp: "Yesterday",
      },
      {
        id: uuidv4(),
        senderId: mockUsers[0].id,
        content: "Got it!",
        timestamp: "Yesterday",
      },
    ],
    lastMessage: "Got it!",
    lastMessageTime: "Yesterday",
    unreadCount: 13, // Example unread count
  },
  {
    id: "conv-3",
    type: "individual",
    name: "Bob",
    participants: [mockUsers[0], mockUsers[2]],
    messages: [
      {
        id: uuidv4(),
        senderId: mockUsers[2].id,
        content: "Are you free for a call later?",
        timestamp: "Mon",
      },
    ],
    lastMessage: "Are you free for a call later?",
    lastMessageTime: "Mon",
    unreadCount: 0,
  },
  {
    id: "conv-4",
    type: "individual",
    name: "Jack",
    participants: [mockUsers[0], mockUsers[3]],
    messages: [
      {
        id: uuidv4(),
        senderId: mockUsers[3].id,
        content: "I will send you the work file",
        timestamp: "9:00 AM",
      },
    ],
    lastMessage: "I will send you the work file",
    lastMessageTime: "9:00 AM",
    unreadCount: 0,
  },
  {
    id: "conv-5",
    type: "individual",
    name: "Kate",
    participants: [mockUsers[0], mockUsers[4]],
    messages: [
      {
        id: uuidv4(),
        senderId: mockUsers[4].id,
        content: "I will send you the work file",
        timestamp: "7:10 PM",
      },
    ],
    lastMessage: "I will send you the work file",
    lastMessageTime: "7:10 PM",
    unreadCount: 0,
  },
]

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentUser = mockUsers[0] // Current logged-in user
  const allUsers = mockUsers

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    initialConversations[0]?.id || null,
  )
  const [isTyping, setIsTyping] = useState(false) // Mock typing state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null) // Message being replied to

  const selectConversation = useCallback((id: string) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) => (conv.id === id ? { ...conv, unreadCount: 0 } : conv)),
    )
    setSelectedConversationId(id)
    setReplyingToMessage(null) // Clear reply state when changing conversation
  }, [])

  const addMessage = useCallback(
    (conversationId: string, content: string, attachments?: Attachment[], repliedToMessageId?: string) => {
      setConversations((prevConversations) =>
        prevConversations.map((conv) => {
          if (conv.id === conversationId) {
            const newMessage: Message = {
              id: uuidv4(),
              senderId: currentUser.id,
              content,
              timestamp: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              attachments,
              repliedToMessageId,
            }
            const lastMsgContent = attachments?.length ? `[${attachments.length} file(s)]` : content || "New message"
            return {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: lastMsgContent,
              lastMessageTime: newMessage.timestamp,
              unreadCount: conv.id === selectedConversationId ? 0 : (conv.unreadCount || 0) + 1, // Increment unread if not selected
            }
          }
          return conv
        }),
      )
      setReplyingToMessage(null) // Clear reply state after sending message
    },
    [currentUser.id, selectedConversationId],
  )

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    setConversations((prevConversations) =>
      prevConversations.map((conv) =>
        conv.id === conversationId ? { ...conv, messages: conv.messages.filter((msg) => msg.id !== messageId) } : conv,
      ),
    )
  }, [])

  const createGroup = useCallback(
    (name: string, participantIds: string[]) => {
      const participants = allUsers.filter((user) => participantIds.includes(user.id))
      // Ensure current user is always in the group
      if (!participants.some((p) => p.id === currentUser.id)) {
        participants.push(currentUser)
      }

      const newGroup: Conversation = {
        id: uuidv4(),
        type: "group",
        name,
        participants,
        messages: [],
        lastMessage: "No messages yet.",
        lastMessageTime: "",
        unreadCount: 0,
      }
      setConversations((prevConversations) => [newGroup, ...prevConversations])
      setSelectedConversationId(newGroup.id)
    },
    [allUsers, currentUser],
  )

  return (
    <ChatContext.Provider
      value={{
        conversations,
        selectedConversationId,
        selectConversation,
        addMessage,
        deleteMessage,
        createGroup,
        currentUser,
        allUsers,
        isTyping,
        setIsTyping,
        replyingToMessage,
        setReplyingToMessage,
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
