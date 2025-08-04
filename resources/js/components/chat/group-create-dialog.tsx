"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/chat/ui/dialog"
import { Button } from "@/components/chat/ui/button"
import { Input } from "@/components/chat/ui/input"
import { Label } from "@/components/chat/ui/label"
import { useChat } from "@/providers/chat-provider"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Checkbox } from "@/components/chat/ui/checkbox"
import { UserAvatar } from "./user-avatar"

interface GroupCreateDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function GroupCreateDialog({ isOpen, onClose }: GroupCreateDialogProps) {
  const { allUsers, createGroup, currentUser } = useChat()
  const [groupName, setGroupName] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([currentUser.id])

  const handleCheckboxChange = (userId: string, checked: boolean) => {
    if (userId === currentUser.id) return // Prevent unselecting current user
    setSelectedParticipants((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)))
  }

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedParticipants.length > 0) {
      createGroup(groupName, selectedParticipants)
      setGroupName("")
      setSelectedParticipants([currentUser.id])
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>Enter group name and select participants.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Group Name
            </Label>
            <Input id="name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Participants</Label>
            <ScrollArea className="col-span-3 h-40 w-full rounded-md border p-4">
              {allUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedParticipants.includes(user.id)}
                    onCheckedChange={(checked) => handleCheckboxChange(user.id, checked as boolean)}
                    disabled={user.id === currentUser.id}
                  />
                  <Label
                    htmlFor={`user-${user.id}`}
                    className="flex items-center gap-2 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    <UserAvatar src={user.avatar} alt={user.name} fallback={user.name.charAt(0)} status={user.status} />
                    {user.name}
                    {user.id === currentUser.id && <span className="text-xs text-muted-foreground">(You)</span>}
                  </Label>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateGroup}>Create Group</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
