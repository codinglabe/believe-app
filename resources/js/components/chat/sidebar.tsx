"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Button } from "@/components/chat/ui/button"
import { PlusCircle, Sun, Moon, MoreVertical, Search } from "lucide-react"
import { ConversationItem } from "./conversation-item"
import { useChat } from "@/providers/chat-provider"
import { GroupCreateDialog } from "./group-create-dialog"
import { UserAvatar } from "./user-avatar"
import { Input } from "@/components/chat/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/chat/ui/dropdown-menu"

export function Sidebar() {
  const { conversations, selectedConversationId, selectConversation, currentUser, allUsers } = useChat()
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)


  const activeUsers = allUsers.filter((user) => user.status === "online" && user.id !== currentUser.id)

  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Active Users</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="More options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsGroupDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="px-4 py-2 border-b whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {activeUsers.map((user) => (
            <div key={user.id} className="flex flex-col items-center gap-1">
              <UserAvatar src={user.avatar} alt={user.name} fallback={user.name.charAt(0)} status={user.status} />
              <span className="text-xs truncate max-w-[50px]">{user.name}</span>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search or start new chat" className="pl-9 pr-4 py-2 rounded-full" />
        </div>
      </div>

      <h3 className="text-sm font-semibold px-4 pt-4 pb-2 text-muted-foreground uppercase">All Chats</h3>
      <ScrollArea className="flex-1 p-2">
        <div className="grid gap-1">
          {conversations.map((conv) => {
            const otherParticipant =
              conv.type === "individual" ? conv.participants.find((p) => p.id !== currentUser.id) : undefined
            const avatarSrc = otherParticipant?.avatar || "/placeholder.svg?height=40&width=40"
            const status = otherParticipant?.status

            return (
              <ConversationItem
                key={conv.id}
                id={conv.id}
                name={conv.name}
                lastMessage={conv.lastMessage}
                lastMessageTime={conv.lastMessageTime}
                avatarSrc={avatarSrc}
                isSelected={conv.id === selectedConversationId}
                onClick={selectConversation}
                status={status}
                unreadCount={conv.unreadCount}
              />
            )
          })}
        </div>
      </ScrollArea>
      <GroupCreateDialog isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </div>
  )
}
