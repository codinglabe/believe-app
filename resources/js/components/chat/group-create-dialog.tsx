"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/chat/ui/dialog"
import { Input } from "@/components/chat/ui/input"
import { Textarea } from "@/components/chat/ui/textarea"
import { Button } from "@/components/chat/ui/button"
import { Label } from "@/components/chat/ui/label"
import { useChat } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { Checkbox } from "@/components/chat/ui/checkbox"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Loader2Icon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/chat/ui/select"
import { cn } from "@/lib/utils"
import {
  chatGradientText,
  chatPrimaryButtonClass,
  chatInsetBorder,
  chatInputFocusRing,
  chatSegmentTrack,
} from "./chat-brand"

interface GroupCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GroupCreateDialog({ open, onOpenChange }: GroupCreateDialogProps) {
  const { createRoom, allUsers, currentUser, allTopics } = useChat()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"public" | "private">("public")
  const [topicId, setTopicId] = useState<string>("")
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
      await createRoom(
        name,
        type,
        description,
        image || undefined,
        type === "private" ? selectedMembers : undefined,
        topicId,
      )
      setName("")
      setDescription("")
      setType("public")
      setTopicId("")
      setImage(null)
      setSelectedMembers([])
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create group:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const availableMembers = allUsers.filter((user) => user.id !== currentUser.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[calc(100vw-1rem)] max-w-[min(100%,22rem)] flex-col gap-0 overflow-hidden border-purple-500/20 p-0 sm:max-w-md",
          "max-h-[min(92dvh,640px)]",
        )}
      >
        <div className="shrink-0 border-b border-border/50 px-4 py-3 sm:px-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className={`text-base font-bold sm:text-lg ${chatGradientText}`}>Create chat room</DialogTitle>
            <DialogDescription className="text-xs leading-snug text-muted-foreground">
              Name, topic & visibility — optional description, image, and members.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 sm:space-y-3 sm:px-5">
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="group-name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={cn("h-9 rounded-lg text-sm", chatInputFocusRing)}
                  placeholder="Room name"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label htmlFor="group-topic" className="text-xs">
                  Topic
                </Label>
                <Select value={topicId} onValueChange={setTopicId} required>
                  <SelectTrigger id="group-topic" className={cn("h-9 w-full rounded-lg text-sm", chatInputFocusRing)}>
                    <SelectValue placeholder="Select topic" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[min(280px,40vh)]">
                    {allTopics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id.toString()}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-description" className="text-xs">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={cn("min-h-[2.75rem] resize-none rounded-lg py-2 text-sm leading-snug", chatInputFocusRing)}
                placeholder="Short summary…"
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium">Visibility</span>
              <div className={cn(chatSegmentTrack, "flex gap-0.5 p-0.5")}>
                {(
                  [
                    { id: "public" as const, label: "Public" },
                    { id: "private" as const, label: "Private" },
                  ]
                ).map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-2 text-xs font-medium transition-all sm:text-sm",
                      type === id
                        ? chatPrimaryButtonClass
                        : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="group-image" className="text-xs">
                Image <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="group-image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={cn(
                  "h-9 cursor-pointer rounded-lg py-1.5 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs",
                  chatInputFocusRing,
                )}
                aria-label="Room cover image"
              />
            </div>

            {type === "private" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Members (optional)</Label>
                <div className={cn(chatInsetBorder, "overflow-hidden")}>
                  <ScrollArea className="h-[min(7.5rem,22vh)]">
                    <div className="p-1.5 pr-2">
                      {availableMembers.length > 0 ? (
                        availableMembers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 rounded-md py-1 pl-0.5 pr-1 hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`member-${user.id}`}
                              checked={selectedMembers.includes(user.id)}
                              onCheckedChange={() => handleMemberToggle(user.id)}
                            />
                            <Label htmlFor={`member-${user.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                              <UserAvatar user={user} className="h-7 w-7 shrink-0" />
                              <span className="truncate text-xs font-medium sm:text-sm">{user.name}</span>
                            </Label>
                          </div>
                        ))
                      ) : (
                        <p className="py-4 text-center text-xs text-muted-foreground">No other users.</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/50 bg-muted/15 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            <Button type="button" variant="outline" size="sm" className="w-full rounded-lg sm:w-auto" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !topicId}
              className={cn("w-full rounded-lg sm:w-auto", chatPrimaryButtonClass)}
            >
              {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
