"use client"

import type React from "react"

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
import { Textarea } from "@/components/chat/ui/textarea"
import { useChat } from "@/providers/chat-provider"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Checkbox } from "@/components/chat/ui/checkbox"
import { UserAvatar } from "./user-avatar"
import { RadioGroup, RadioGroupItem } from "@/components/chat/ui/radio-group"
import { Upload, X } from 'lucide-react'

interface GroupCreateDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function GroupCreateDialog({ isOpen, onClose }: GroupCreateDialogProps) {
  const { allUsers, createRoom, currentUser } = useChat()
  const [roomName, setRoomName] = useState("")
  const [description, setDescription] = useState("")
  const [roomType, setRoomType] = useState<"public" | "private">("public")
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [roomImage, setRoomImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleMemberToggle = (userId: number, checked: boolean) => {
    setSelectedMembers((prev) => (checked ? [...prev, userId] : prev.filter((id) => id !== userId)))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("Image size should be less than 5MB")
        return
      }
      setRoomImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setRoomImage(null)
    setImagePreview(null)
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert("Please enter a room name")
      return
    }

    setIsCreating(true)
    try {
      const newRoom = await createRoom(roomName, description, roomType, selectedMembers, roomImage || undefined)

      // Reset form
      setRoomName("")
      setDescription("")
      setRoomType("public")
      setSelectedMembers([])
      setRoomImage(null)
      setImagePreview(null)
      onClose()

      console.log("Room created successfully:", newRoom)
    } catch (error) {
      console.error("Failed to create room:", error)
      alert("Failed to create room. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setRoomName("")
      setDescription("")
      setRoomType("public")
      setSelectedMembers([])
      setRoomImage(null)
      setImagePreview(null)
      onClose()
    }
  }

  // Filter users from same organization
  const sameOrgUsers = allUsers.filter((user) =>
    user.id !== currentUser?.id &&
    user.organization_id === currentUser?.organization_id
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>Create a new group chat and invite members from your organization.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Room Image */}
          <div className="space-y-2">
            <Label>Group Image (Optional)</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Group preview"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="room-image" />
                <Label htmlFor="room-image" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>Choose Image</span>
                  </Button>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">Max 5MB</p>
              </div>
            </div>
          </div>

          {/* Room Name */}
          <div className="space-y-2">
            <Label htmlFor="room-name">Group Name *</Label>
            <Input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter group name"
              disabled={isCreating}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description (optional)"
              rows={3}
              disabled={isCreating}
            />
          </div>

          {/* Room Type */}
          <div className="space-y-2">
            <Label>Group Type</Label>
            <RadioGroup
              value={roomType}
              onValueChange={(value) => setRoomType(value as "public" | "private")}
              disabled={isCreating}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Public</p>
                    <p className="text-xs text-muted-foreground">Anyone in your organization can join</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer">
                  <div>
                    <p className="font-medium">Private</p>
                    <p className="text-xs text-muted-foreground">Only invited members can join</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Members Selection */}
          <div className="space-y-2">
            <Label>Invite Members (Optional)</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              {sameOrgUsers.length > 0 ? (
                <div className="space-y-2">
                  {sameOrgUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedMembers.includes(user.id)}
                        onCheckedChange={(checked) => handleMemberToggle(user.id, checked as boolean)}
                        disabled={isCreating}
                      />
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="flex items-center gap-2 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        <UserAvatar
                          src={user.avatar}
                          alt={user.name}
                          fallback={user.name.charAt(0)}
                          status={user.is_online ? "online" : "offline"}
                        />
                        <div>
                          <p>{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.is_online ? "Online" : "Offline"}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm">No users available in your organization</div>
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground">Selected: {selectedMembers.length} members</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateRoom} disabled={isCreating || !roomName.trim()}>
            {isCreating ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
