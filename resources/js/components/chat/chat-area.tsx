"use client"
import { MessageList } from "./message-list"
import type React from "react"

import { MessageInput } from "./message-input"
import { useChat } from "@/providers/chat-provider"
import { UserAvatar } from "./user-avatar"
import { Button } from "@/components/chat/ui/button"
import { Info } from "lucide-react"

interface ChatAreaProps {
  mobileMenuButton?: React.ReactNode
  toggleDetailsPanel: () => void
}

export function ChatArea({ mobileMenuButton, toggleDetailsPanel }: ChatAreaProps) {
  const { conversations, selectedConversationId, currentUser } = useChat()

  const selectedConversation = conversations.find((conv) => conv.id === selectedConversationId)

  const getChatHeaderInfo = () => {
    if (!selectedConversation) {
      return { name: "No Conversation Selected", avatar: "", status: undefined }
    }

    if (selectedConversation.type === "group") {
      return {
        name: selectedConversation.name,
        avatar: "/placeholder.svg?height=40&width=40&text=G",
        status: undefined, // Groups don't have a single status
      }
    } else {
      const otherParticipant = selectedConversation.participants.find((p) => p.id !== currentUser.id)
      return {
        name: otherParticipant?.name || "Unknown User",
        avatar: otherParticipant?.avatar || "/placeholder.svg?height=40&width=40",
        status: otherParticipant?.status,
      }
    }
  }

  const { name, avatar, status } = getChatHeaderInfo()

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          {mobileMenuButton}
          <UserAvatar src={avatar} alt={name} fallback={name.charAt(0)} status={status} />
          <h2 className="text-lg font-semibold">{name}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={toggleDetailsPanel}
          aria-label="View details"
        >
          <Info className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        {/* MessageList now has its own background for readability */}
        <MessageList />
      </div>
      <MessageInput />
    </div>
  )
}
