"use client"

import React, { useState } from "react"
import { ChatRoom, User, ChatMessage as ChatMessageType } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { Button } from "@/components/chat/ui/button"
import { PlusIcon, LogOutIcon, UserPlusIcon, Trash2Icon } from 'lucide-react'
import { useChat } from "@/providers/chat-provider"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Checkbox } from "@/components/chat/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/chat/ui/dialog"
import { Label } from "@/components/chat/ui/label"
import toast from "react-hot-toast"
import { Badge } from "./ui/badge"

interface ChatDetailsPanelProps {
  room: ChatRoom
  onClose: () => void
}

export function ChatDetailsPanel({ room, onClose }: ChatDetailsPanelProps) {
  const { currentUser, leaveRoom, deleteMessage, allUsers, addMembers } = useChat()
  const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false)
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<number[]>([])


    console.log("ChatDetailsPanel", room.topics)
  const isCreator = room.created_by === currentUser.id
  const isAdmin = currentUser.role === "admin" || currentUser.role === "organization" // Assuming organization role can manage groups

  const canAddMembers = (isCreator || isAdmin) && room.type === "private"
  const canLeave = room.type !== "direct" || room.members.length > 1 // Cannot leave direct chat if only one member
  const canDeleteMessage = (message: ChatMessageType) => message.user.id === currentUser.id; // Only own messages

  const handleLeaveRoom = async () => {
    if (confirm(`Are you sure you want to leave "${room.name}"?`)) {
      await leaveRoom(room.id)
      onClose()
    }
  }

  const handleAddMembers = async () => {
    if (selectedMembersToAdd.length === 0) {
      toast.error("Please select members to add.");
      return;
    }
    try {
      await addMembers(room.id, selectedMembersToAdd);
      toast.success("Members added successfully!");
      setSelectedMembersToAdd([]);
      setIsAddMembersDialogOpen(false);
    } catch (error) {
      console.error("Failed to add members:", error);
      toast.error("Failed to add members.");
    }
  }

  const handleMemberToggle = (userId: number) => {
    setSelectedMembersToAdd((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const membersNotInRoom = allUsers.filter(
    (user) => !room.members.some((member) => member.id === user.id) && user.id !== currentUser.id
  )

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex flex-col items-center gap-4 border-b pb-4">
        <UserAvatar user={{ name: room.name, avatar: room.image || '/placeholder.svg?height=64&width=64' }} className="h-20 w-20 text-4xl" />
        <h3 className="text-xl font-semibold">{room.name}</h3>
        {room.description && <p className="text-sm text-muted-foreground text-center">{room.description}</p>}
        <p className="text-sm text-muted-foreground">
          {room.type === "public" ? "Public Group" : room.type === "private" ? "Private Group" : "Direct Message"}
              </p>
              {room.topics && room.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {room.topics.map(topic => (
              <Badge key={topic.id} variant="secondary">
                {topic.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <h4 className="font-semibold mb-3">Members ({room.members.length})</h4>
        <div className="grid gap-2">
          {room.members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <UserAvatar user={member} className="h-8 w-8" />
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">
                  {member.role} {member.organization ? `(${member.organization.name})` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
        {canAddMembers && (
          <Button variant="outline" className="w-full mt-4" onClick={() => setIsAddMembersDialogOpen(true)}>
            <UserPlusIcon className="mr-2 h-4 w-4" /> Add Members
          </Button>
        )}
      </div>

      <div className="border-t pt-4 flex flex-col gap-2">
        {canLeave && (
          <Button variant="outline" className="w-full" onClick={handleLeaveRoom}>
            <LogOutIcon className="mr-2 h-4 w-4" /> Leave Room
          </Button>
        )}
        {/* Add other actions like delete room if applicable */}
      </div>

      <Dialog open={isAddMembersDialogOpen} onOpenChange={setIsAddMembersDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Members to {room.name}</DialogTitle>
            <DialogDescription>
              Select users to add to this private chat room.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {membersNotInRoom.length > 0 ? (
              <ScrollArea className="h-60 border rounded-md p-2">
                {membersNotInRoom.map((user) => (
                  <div key={user.id} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={`add-member-${user.id}`}
                      checked={selectedMembersToAdd.includes(user.id)}
                      onCheckedChange={() => handleMemberToggle(user.id)}
                    />
                    <Label htmlFor={`add-member-${user.id}`} className="flex items-center gap-2 cursor-pointer">
                      <UserAvatar user={user} className="h-7 w-7" />
                      <span>{user.name}</span>
                      {user.organization && (
                        <span className="text-xs text-muted-foreground">({user.organization.name})</span>
                      )}
                    </Label>
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">No new users to add.</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleAddMembers} disabled={selectedMembersToAdd.length === 0}>
              Add Selected Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
