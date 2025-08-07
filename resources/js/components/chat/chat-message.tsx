"use client"

import React, { useState } from "react"
import { ChatMessage as ChatMessageType } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/chat/ui/dropdown-menu"
import { MoreHorizontalIcon, ReplyIcon, Trash2Icon, DownloadIcon } from 'lucide-react'
import { useChat } from "@/providers/chat-provider"
import { ImageViewerModal } from "@/components/chat/image-viewer-modal"
import { Button } from "./ui/button"

interface ChatMessageProps {
  message: ChatMessageType
  isOwnMessage: boolean
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
  const { setReplyingToMessage, deleteMessage } = useChat()
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleImageClick = (url: string) => {
    setSelectedImage(url)
    setIsImageViewerOpen(true)
  }

  return (
    <div
      className={cn(
        "flex items-end gap-3",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      {!isOwnMessage && <UserAvatar user={message.user} className="h-8 w-8" />}
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isOwnMessage ? "items-end" : "items-start",
        )}
      >
        {message.reply_to_message && (
          <div
            className={cn(
              "mb-1 rounded-lg px-3 py-2 text-sm border",
              isOwnMessage
                ? "bg-primary/10 border-primary/20 text-primary-foreground"
                : "bg-muted border-muted-foreground/20 text-muted-foreground",
            )}
          >
            <p className="font-semibold text-xs">
              Replying to {message.reply_to_message.user.name}:
            </p>
            <p className="text-xs line-clamp-1">{message.reply_to_message.message}</p>
          </div>
        )}
        <div
          className={cn(
            "relative rounded-lg px-4 py-2 text-sm",
            isOwnMessage
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted rounded-bl-none",
          )}
        >
          {message.message && <p>{message.message}</p>}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="relative group">
                  {attachment.type.startsWith('image/') ? (
                    <img
                      src={attachment.url || "/placeholder.svg"}
                      alt={attachment.name}
                      className="max-w-full h-auto rounded-md cursor-pointer object-cover max-h-40"
                      onClick={() => handleImageClick(attachment.url)}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                      <DownloadIcon className="h-4 w-4" />
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-xs truncate"
                      >
                        {attachment.name}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <span
            className={cn(
              "absolute text-[0.6rem] bottom-1",
              isOwnMessage ? "-left-10 text-muted-foreground" : "-right-10 text-muted-foreground",
            )}
          >
            {format(new Date(message.created_at), "HH:mm")}
          </span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
          <DropdownMenuItem onClick={() => setReplyingToMessage(message)}>
            <ReplyIcon className="mr-2 h-4 w-4" /> Reply
          </DropdownMenuItem>
          {isOwnMessage && (
            <DropdownMenuItem onClick={() => deleteMessage(message.id)} className="text-red-600">
              <Trash2Icon className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ImageViewerModal
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        imageUrl={selectedImage}
      />
    </div>
  )
}
