"use client"

import { useState } from "react"
import { Input } from "@/components/chat/ui/input"
import { Button } from "@/components/chat/ui/button"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ConversationItem } from "@/components/chat/conversation-item"
import { GroupCreateDialog } from "@/components/chat/group-create-dialog"
import { useChat } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { PlusIcon, SearchIcon } from 'lucide-react'
import { NotificationBell } from "../notification-bell"
import { Link, usePage } from "@inertiajs/react"

// Helper function to safely convert to lowercase
const safeToLower = (str: any): string => {
  return String(str || "").toLowerCase()
}

type TabType = "groups" | "direct" | "users"

export function Sidebar() {
  const {
    chatRooms = [],
    activeRoom,
    setActiveRoom,
    allUsers = [],
    currentUser,
    createDirectChat,
    searchQuery = "",
    setSearchQuery,
  } = useChat()

    const { auth } = usePage().props;

  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("groups")

  const getFilteredRooms = () => {
    if (activeTab === "groups") {
      return chatRooms.filter((room) => room.type === "public" || room.type === "private")
    } else if (activeTab === "direct") {
      return chatRooms.filter((room) => room.type === "direct")
    }
    return []
  }

  // Safe filtering for rooms
  const filteredRooms = getFilteredRooms().filter((room) => {
    const query = safeToLower(searchQuery).trim()
    if (!query) return true

    return (
      safeToLower(room.name).includes(query) ||
      safeToLower(room.last_message?.message).includes(query) ||
      room.members?.some((member) => safeToLower(member.name).includes(query)) ||
      false
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
      setActiveTab("direct")
      setSearchQuery("")
    } catch (error) {
      console.error("Failed to create direct chat:", error)
    }
  }

  // <CHANGE> Added null check for activeRoom to prevent TypeError
  const getBreadcrumbText = () => {
    if (!activeRoom) return "Chat"

    if (activeRoom.type === "direct") {
      return "Direct Chat"
    } else if (activeRoom.type === "public" || activeRoom.type === "private") {
      return "Groups Chat"
    }
    return "Chat"
  }

  const canCreateGroups =
    currentUser?.role === "organization" || currentUser?.role === "admin" || currentUser?.role === "user"

  return (
    <div className="flex h-full flex-col border-r">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">
   <Link
  href={auth?.user?.role !== 'user' ? route("dashboard") : route("user.profile.index")}
  className="hover:underline"
>
  Dashboard
</Link> / {getBreadcrumbText()}
              </h2>
              <div>
                  <NotificationBell userId={currentUser?.id} emailVerified={!!auth?.user?.email_verified_at} />
        {canCreateGroups && (
          <Button variant="ghost" size="icon" onClick={() => setIsGroupCreateOpen(true)}>
            <PlusIcon className="h-5 w-5" />
          </Button>
        )}
              </div>
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
        <div className="flex gap-1 mt-3">
          <Button
            variant={activeTab === "groups" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("groups")}
            className="flex-1"
          >
            Groups
          </Button>
          <Button
            variant={activeTab === "direct" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("direct")}
            className="flex-1"
          >
            Direct
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("users")}
            className="flex-1"
          >
            Users
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "users" ? (
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
                    {user?.organization && <p className="text-sm text-muted-foreground">{user.organization.name}</p>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No users found</p>
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
                  currentUser={currentUser}
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {activeTab === "groups" ? "No groups found" : "No direct chats found"}
              </p>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Create Group Dialog */}
      <GroupCreateDialog open={isGroupCreateOpen} onOpenChange={setIsGroupCreateOpen} />
    </div>
  )
}
