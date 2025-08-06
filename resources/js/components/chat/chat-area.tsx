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
  const { chatRooms, selectedRoomId, currentUser } = useChat()

  const selectedRoom = chatRooms?.find((room) => room.id === selectedRoomId)

  const getChatHeaderInfo = () => {
    if (!selectedRoom) {
      return { name: "No Room Selected", avatar: "", status: undefined }
    }

    if (selectedRoom.type === "public" || selectedRoom.type === "private") {
      return {
        name: selectedRoom.name,
        avatar: selectedRoom.image || "/placeholder.svg?height=40&width=40&text=G",
        status: undefined, // Groups don't have a single status
      }
    } else {
      // Direct message
      const otherParticipant = selectedRoom.members?.find((member) => member.id !== currentUser?.id)
      return {
        name: otherParticipant?.name || "Unknown User",
        avatar: otherParticipant?.avatar || "/placeholder.svg?height=40&width=40",
        status: otherParticipant?.is_online ? "online" : "offline",
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
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">{name}</h2>
            {selectedRoom && selectedRoom.type === "direct" && (
              <span className="text-xs text-muted-foreground">{status === "online" ? "Online" : "Offline"}</span>
            )}
            {selectedRoom && (selectedRoom.type === "public" || selectedRoom.type === "private") && (
              <span className="text-xs text-muted-foreground">{selectedRoom.members?.length || 0} members</span>
            )}
          </div>
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
        <MessageList />
      </div>
      <MessageInput />
    </div>
  )
}
