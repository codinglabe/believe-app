"use client"

import { useState } from "react"
import { Input } from "@/components/chat/ui/input"
import { Button } from "@/components/chat/ui/button"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { ConversationItem } from "@/components/chat/conversation-item"
import { GroupCreateDialog } from "@/components/chat/group-create-dialog"
import { useChat } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { MessageCircle, PlusIcon, SearchIcon, Users } from "lucide-react"
import { NotificationBell } from "../notification-bell"
import { Link, usePage } from "@inertiajs/react"
import { cn } from "@/lib/utils"
import { chatGradientBg, chatGradientBgHover, chatGradientText } from "./chat-brand"

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
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden border-r border-border/50 bg-card/30">
      {/* Header */}
      <div className="flex shrink-0 min-w-0 items-start justify-between gap-2 overflow-hidden border-b border-border/50 p-3 sm:p-4">
        <h2 className="min-w-0 flex-1 text-sm font-semibold leading-snug sm:text-base">
          <span className="line-clamp-2 break-words sm:line-clamp-1">
            <Link
              href={auth?.user?.role !== "user" ? route("dashboard") : route("user.profile.index")}
              className={`hover:underline ${chatGradientText}`}
            >
              Dashboard
            </Link>
            <span className="text-muted-foreground font-normal"> / </span>
            <span className="text-foreground">{getBreadcrumbText()}</span>
          </span>
        </h2>
              <div className="flex shrink-0 items-center gap-0.5">
                  <NotificationBell userId={currentUser?.id} emailVerified={!!auth?.user?.email_verified_at} />
        {canCreateGroups && (
          <Button
            variant="ghost"
            size="icon"
            title="New chat room"
            onClick={() => setIsGroupCreateOpen(true)}
            className="rounded-xl text-purple-700 hover:bg-purple-500/15 hover:text-purple-900 dark:text-purple-300 dark:hover:bg-purple-500/20 dark:hover:text-purple-100"
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
        )}
              </div>
      </div>

      {/* Search and Toggle */}
      <div className="shrink-0 space-y-3 border-b border-border/50 p-3 sm:p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search chats or users..."
            className="pl-9 h-10 rounded-xl border-border/60 focus-visible:ring-purple-500/25 focus-visible:border-purple-500/40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border/40">
          {(
            [
              { id: "groups" as const, label: "Groups" },
              { id: "direct" as const, label: "Direct" },
              { id: "users" as const, label: "Users" },
            ]
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 min-w-0 rounded-lg px-1.5 py-2 text-[11px] sm:text-sm font-medium transition-all duration-200",
                activeTab === id
                  ? cn("text-white shadow-sm", chatGradientBg, chatGradientBgHover)
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden [&_[data-radix-scroll-area-viewport]]:[scrollbar-gutter:stable]">
        {activeTab === "users" ? (
          <div className="space-y-1 px-2 pb-2 pt-1 pr-3 sm:px-3 sm:pb-3 sm:pt-2 sm:pr-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <button
                  key={user?.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition-all",
                    "hover:border-purple-500/20 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-blue-500/10",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30",
                  )}
                  onClick={() => user?.id && handleUserClick(user.id)}
                >
                  <UserAvatar user={user} className="h-10 w-10 shrink-0 ring-2 ring-background" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user?.name}</p>
                    {user?.organization && (
                      <p className="truncate text-xs text-muted-foreground">{user.organization.name}</p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-purple-500/25 bg-muted/40">
                  <Users className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground">No users match your search</p>
                <p className="max-w-[240px] text-xs text-muted-foreground">Try another name or clear the search field.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1 px-2 pb-2 pt-1 pr-3 sm:px-3 sm:pb-3 sm:pt-2 sm:pr-4">
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
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-purple-500/25 bg-muted/40">
                  <MessageCircle className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {activeTab === "groups" ? "No groups yet" : "No direct chats yet"}
                </p>
                <p className="max-w-[260px] text-xs text-muted-foreground">
                  {activeTab === "groups"
                    ? "Create a room with the + button or adjust your search."
                    : "Start a chat from the Users tab or open an existing thread."}
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Create Group Dialog */}
      <GroupCreateDialog open={isGroupCreateOpen} onOpenChange={setIsGroupCreateOpen} />
    </div>
  )
}
