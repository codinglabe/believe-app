"use client"

import React, { useState } from "react"
import { Input } from "@/components/chat/ui/input"
import { Button } from "@/components/chat/ui/button"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ConversationItem } from "@/components/chat/conversation-item"
import { GroupCreateDialog } from "@/components/chat/group-create-dialog"
import { useChat } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { PlusIcon, SearchIcon } from 'lucide-react'
import { Link, usePage } from "@inertiajs/react"

// Helper function to safely convert to lowercase
const safeToLower = (str: any): string => {
  return String(str || '').toLowerCase()
}

export function Sidebar() {
    const page = usePage().props;
  const {
    chatRooms = [],
    activeRoom,
    setActiveRoom,
    allUsers = [],
    currentUser,
    createDirectChat,
    searchQuery = '',
    setSearchQuery,
  } = useChat()

  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false)
  const [showUsers, setShowUsers] = useState(false)

  // Safe filtering for rooms
  const filteredRooms = chatRooms.filter((room) => {
    const query = safeToLower(searchQuery).trim()
    if (!query) return true

    return (
      safeToLower(room.name).includes(query) ||
      safeToLower(room.last_message?.message).includes(query) ||
      room.members?.some(member =>
        safeToLower(member.name).includes(query)
      ) || false
    )
  })

  // Safe filtering for users
  const filteredUsers = allUsers.filter((user) => {
    if (!user || user.id === currentUser?.id) return false

    const query = safeToLower(searchQuery).trim()
    if (!query) return true

    return safeToLower(user.name).includes(query)
  })

  const handleUserClick = async (userId: number) => {
    try {
      const room = await createDirectChat(userId)
      setActiveRoom(room)
      setShowUsers(false)
      setSearchQuery("")
    } catch (error) {
      console.error("Failed to create direct chat:", error)
    }
  }

  const canCreateGroups = currentUser?.role === "organization" || currentUser?.role === "admin"

  return (
    <div className="flex h-full flex-col border-r">
      {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">
        {['admin', 'organization'].includes(page.auth.user.role) ? (
            <Link href={route("dashboard")} className="underline">Dashboard</Link>
        ) : (
            <Link href={route("home")} className="underline">Home</Link>
        )}
        &nbsp;/ Chats
        </h2>
        {canCreateGroups && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsGroupCreateOpen(true)}
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Search and Toggle */}
      <div className="p-4 border-b">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats or users..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant={!showUsers ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUsers(false)}
            className="flex-1"
          >
            Rooms
          </Button>
          <Button
            variant={showUsers ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUsers(true)}
            className="flex-1"
          >
            Users
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {showUsers ? (
          <div className="p-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user?.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => user?.id && handleUserClick(user.id)}
                >
                  <UserAvatar user={user} className="h-8 w-8" />
                  <div className="flex-1">
                    <p className="font-medium">{user?.name}</p>
                    {user?.organization && (
                      <p className="text-sm text-muted-foreground">
                        {user.organization.name}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No users found
              </p>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <ConversationItem
                  key={room?.id}
                  room={room}
                  isActive={activeRoom?.id === room?.id}
                  onClick={() => room?.id && setActiveRoom(room)}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No chat rooms found
              </p>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Create Group Dialog */}
      <GroupCreateDialog
        open={isGroupCreateOpen}
        onOpenChange={setIsGroupCreateOpen}
      />
    </div>
  )
}
