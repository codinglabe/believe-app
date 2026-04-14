"use client"

import React, { useState } from "react"
import { ChatRoom } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { Button } from "@/components/chat/ui/button"
import { LogOutIcon, UserPlusIcon } from "lucide-react"
import { useChat } from "@/providers/chat-provider"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Checkbox } from "@/components/chat/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/chat/ui/dialog"
import { Label } from "@/components/chat/ui/label"
import toast from "react-hot-toast"
import { Badge } from "./ui/badge"
import { cn } from "@/lib/utils"
import {
  chatGradientText,
  chatGradientTopBar,
  chatPrimaryButtonClass,
  chatInsetBorder,
} from "./chat-brand"

interface ChatDetailsPanelProps {
  room: ChatRoom
  onClose: () => void
}

export function ChatDetailsPanel({ room, onClose }: ChatDetailsPanelProps) {
  const { currentUser, leaveRoom, allUsers, addMembers } = useChat()
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false)
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<number[]>([])

  const isCreator = room.created_by === currentUser.id
  const isAdmin = currentUser.role === "admin" || currentUser.role === "organization"

  const canAddMembers = (isCreator || isAdmin) && room.type === "private"
  const canLeave = room.type !== "direct" || room.members.length > 1

  const handleLeaveRoom = async () => {
    if (confirm(`Are you sure you want to leave "${room.name}"?`)) {
      await leaveRoom(room.id)
      onClose()
    }
  }

  const handleAddMembers = async () => {
    if (selectedMembersToAdd.length === 0) {
      toast.error("Please select members to add.")
      return
    }
    try {
      await addMembers(room.id, selectedMembersToAdd)
      toast.success("Members added successfully!")
      setSelectedMembersToAdd([])
      setIsAddMembersDialogOpen(false)
    } catch (error) {
      console.error("Failed to add members:", error)
      toast.error("Failed to add members.")
    }
  }

  const handleMemberToggle = (userId: number) => {
    setSelectedMembersToAdd((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const membersNotInRoom = allUsers.filter(
    (user) => !room.members.some((member) => member.id === user.id) && user.id !== currentUser.id,
  )

  const roomTypeLabel =
    room.type === "public" ? "Public group" : room.type === "private" ? "Private group" : "Direct message"

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 min-w-0 flex-1 [&_[data-radix-scroll-area-viewport]]:min-w-0 [&_[data-radix-scroll-area-viewport]]:max-w-full">
        <div className="box-border w-full min-w-0 max-w-full space-y-6 px-5 pb-4 pt-2 sm:px-6">
          <div className="flex flex-col items-center gap-3 border-b border-border/50 pb-6 text-center">
            <UserAvatar
              user={{ name: room.name, avatar: room.image || "/placeholder.svg?height=64&width=64" }}
              className="h-20 w-20 ring-2 ring-purple-500/25 shadow-lg"
            />
            <div className="space-y-1">
              <h3 className={`text-xl font-bold tracking-tight ${chatGradientText}`}>{room.name}</h3>
              {room.description && (
                <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{room.description}</p>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{roomTypeLabel}</p>
            </div>
            {room.topics && room.topics.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {room.topics.map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="secondary"
                    className="border border-purple-500/20 bg-purple-500/10 text-purple-800 dark:text-purple-200"
                  >
                    {topic.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">
              Members <span className="text-muted-foreground">({room.members.length})</span>
            </h4>
            <div className="grid w-full min-w-0 gap-2">
              {room.members.map((member) => (
                <div
                  key={member.id}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 shadow-sm transition-colors hover:border-purple-500/20"
                >
                  <UserAvatar user={member} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.role}
                      {member.organization ? ` · ${member.organization.name}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {canAddMembers && (
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full min-w-0 max-w-full rounded-xl border-purple-500/25 hover:bg-purple-500/10 hover:text-purple-800 dark:hover:text-purple-200"
                onClick={() => setIsAddMembersDialogOpen(true)}
              >
                <UserPlusIcon className="mr-2 h-4 w-4" /> Add members
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="box-border w-full min-w-0 shrink-0 space-y-2 border-t border-border/50 bg-muted/20 px-5 py-4 backdrop-blur-sm sm:px-6">
        {canLeave && (
          <Button
            type="button"
            variant="outline"
            className="w-full min-w-0 max-w-full rounded-xl"
            onClick={handleLeaveRoom}
          >
            <LogOutIcon className="mr-2 h-4 w-4" /> Leave room
          </Button>
        )}
      </div>

      <Dialog open={isAddMembersDialogOpen} onOpenChange={setIsAddMembersDialogOpen}>
        <DialogContent className="flex max-h-[min(85dvh,560px)] flex-col gap-0 overflow-hidden border-purple-500/20 p-0 sm:max-w-md">
          <div className="relative shrink-0 border-b border-border/50 px-5 pb-4 pt-6 sm:px-6">
            <div className={chatGradientTopBar} aria-hidden />
            <DialogHeader className="text-left">
              <DialogTitle className={`text-lg font-bold ${chatGradientText}`}>Add members</DialogTitle>
              <DialogDescription className="text-sm">Choose people to add to {room.name}.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 px-5 py-4 sm:px-6">
            {membersNotInRoom.length > 0 ? (
              <div className={cn(chatInsetBorder, "overflow-hidden")}>
                <ScrollArea className="h-56 p-2">
                  {membersNotInRoom.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 rounded-lg py-1.5 pl-1 pr-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`add-member-${user.id}`}
                        checked={selectedMembersToAdd.includes(user.id)}
                        onCheckedChange={() => handleMemberToggle(user.id)}
                      />
                      <Label htmlFor={`add-member-${user.id}`} className="flex flex-1 cursor-pointer items-center gap-2">
                        <UserAvatar user={user} className="h-8 w-8" />
                        <span className="text-sm font-medium">{user.name}</span>
                        {user.organization && (
                          <span className="text-xs text-muted-foreground">({user.organization.name})</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No users available to add.</p>
            )}
          </div>
          <DialogFooter className="gap-2 border-t border-border/50 bg-muted/20 px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setIsAddMembersDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedMembersToAdd.length === 0}
              className={cn("w-full rounded-xl sm:w-auto", chatPrimaryButtonClass)}
              onClick={handleAddMembers}
            >
              Add selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
