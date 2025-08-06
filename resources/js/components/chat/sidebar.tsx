"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Button } from "@/components/chat/ui/button"
import { PlusCircle, Sun, Moon, MoreVertical, Search, MessageCircle } from 'lucide-react'
import { ConversationItem } from "./conversation-item"
import { useChat } from "@/providers/chat-provider"
import { GroupCreateDialog } from "./group-create-dialog"
import { UserAvatar } from "./user-avatar"
import { Input } from "@/components/chat/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/chat/ui/dropdown-menu"
import { Skeleton } from "@/components/chat/ui/skeleton"

export function Sidebar() {
  const {
    filteredRooms,
    selectedRoomId,
    selectRoom,
    currentUser,
    activeUsers,
    isConnected,
    searchQuery,
    setSearchQuery,
    createDirectChat
  } = useChat()

  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)

  const handleActiveUserClick = async (user: any) => {
    try {
      await createDirectChat(user.id)
    } catch (error) {
      console.error("Failed to start direct chat:", error)
    }
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="grid gap-1 p-2">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Messages</h2>
          {/* Connection status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
        </div>
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

      {/* Search Section */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            className="pl-9 pr-4 py-2 rounded-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Active Users Section - Horizontal Scroll */}
      {activeUsers.length > 0 && (
        <>
          <div className="px-4 py-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">
              Active Users ({activeUsers.length})
            </h3>
          </div>
          <ScrollArea className="px-4 pb-2 border-b" orientation="horizontal">
            <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
              {activeUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleActiveUserClick(user)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted/50 transition-colors min-w-[60px]"
                >
                  <UserAvatar
                    src={user.avatar}
                    alt={user.name}
                    fallback={user.name.charAt(0)}
                    status={user.is_online ? "online" : "offline"}
                    className="h-12 w-12"
                  />
                  <span className="text-xs truncate max-w-[50px] text-center">{user.name}</span>
                  <MessageCircle className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Chat Rooms Section */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">
          All Chats ({filteredRooms.length})
        </h3>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="text-xs"
          >
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        {filteredRooms.length > 0 ? (
          <div className="grid gap-1">
            {filteredRooms.map((room) => {
              // For direct messages, find the other participant
              const otherParticipant =
                room.type === "direct" ? room.members?.find((member) => member.id !== currentUser?.id) : undefined

              const avatarSrc =
                room.type === "direct"
                  ? otherParticipant?.avatar || "/placeholder.svg?height=40&width=40"
                  : room.image || "/placeholder.svg?height=40&width=40&text=G"

              const displayName = room.type === "direct" ? otherParticipant?.name || "Unknown User" : room.name

              const status = room.type === "direct" ? (otherParticipant?.is_online ? "online" : "offline") : undefined

              return (
                <ConversationItem
                  key={room.id}
                  id={room.id.toString()}
                  name={displayName}
                  lastMessage={room.last_message?.message || "No messages yet"}
                  lastMessageTime={room.last_message?.created_at || ""}
                  avatarSrc={avatarSrc}
                  isSelected={room.id === selectedRoomId}
                  onClick={(id) => selectRoom(Number.parseInt(id))}
                  status={status}
                  unreadCount={room.unread_count || 0}
                />
              )
            })}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-muted-foreground text-sm mb-2">No chats found</div>
            <div className="text-xs text-muted-foreground">Try searching with different keywords</div>
          </div>
        ) : currentUser ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-muted-foreground text-sm mb-2">No chat rooms yet</div>
            <Button variant="outline" size="sm" onClick={() => setIsGroupDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create your first room
            </Button>
          </div>
        ) : (
          <LoadingSkeleton />
        )}
      </ScrollArea>

      <GroupCreateDialog isOpen={isGroupDialogOpen} onClose={() => setIsGroupDialogOpen(false)} />
    </div>
  )
}
