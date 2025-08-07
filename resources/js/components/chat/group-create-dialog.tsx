"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/chat/ui/dialog"
import { Input } from "@/components/chat/ui/input"
import { Textarea } from "@/components/chat/ui/textarea"
import { Button } from "@/components/chat/ui/button"
import { Label } from "@/components/chat/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/chat/ui/radio-group"
import { useChat } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { Checkbox } from "@/components/chat/ui/checkbox"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Loader2Icon } from 'lucide-react'

interface GroupCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupCreateDialog({ open, onOpenChange }: GroupCreateDialogProps) {
  const { createRoom, allUsers, currentUser } = useChat()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"public" | "private">("public")
  const [image, setImage] = useState<File | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const handleMemberToggle = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await createRoom(name, type, description, image || undefined, type === "private" ? selectedMembers : undefined)
      // Reset form
      setName("")
      setDescription("")
      setType("public")
      setImage(null)
      setSelectedMembers([])
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create group:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const availableMembers = allUsers.filter(user => user.id !== currentUser.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Chat Room</DialogTitle>
          <DialogDescription>
            Create a new public or private chat room.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <RadioGroup
              value={type}
              onValueChange={(value: "public" | "private") => setType(value)}
              className="col-span-3 flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public">Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private">Private</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right">
              Image
            </Label>
            <Input id="image" type="file" onChange={handleImageChange} className="col-span-3" />
          </div>

          {type === "private" && (
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">
                Select Members (Optional)
              </Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                {availableMembers.length > 0 ? (
                  availableMembers.map((user) => (
                    <div key={user.id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        id={`member-${user.id}`}
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={() => handleMemberToggle(user.id)}
                      />
                      <Label htmlFor={`member-${user.id}`} className="flex items-center gap-2 cursor-pointer">
                        <UserAvatar user={user} className="h-7 w-7" />
                        <span>{user.name}</span>
                        {user.organization && (
                          <span className="text-xs text-muted-foreground">({user.organization.name})</span>
                        )}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-4">No other users available.</p>
                )}
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Create Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
