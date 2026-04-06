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

  const handleImageClick = (url: string | null | undefined) => {
    if (!url) return
    setSelectedImage(url)
    setIsImageViewerOpen(true)
  }

  return (
    <div
      className={cn(
        "flex items-end gap-3 group mb-4",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      {!isOwnMessage && (
        <UserAvatar
          user={message.user}
          className="h-8 w-8 flex-shrink-0 ring-2 ring-background shadow-sm"
        />
      )}
      <div
        className={cn(
          "flex flex-col max-w-[75%] sm:max-w-[65%]",
          isOwnMessage ? "items-end" : "items-start",
        )}
      >
        {!isOwnMessage && (
          <span className="text-xs text-muted-foreground mb-1 px-1">
            {message.user.name}
          </span>
        )}
        {message.reply_to_message && (
          <div
            className={cn(
              "mb-2 rounded-lg px-3 py-2 text-sm border-l-2 shadow-sm",
              isOwnMessage
                ? "bg-primary/5 border-primary/30 text-foreground"
                : "bg-muted/50 border-muted-foreground/30",
            )}
          >
            <p className="font-semibold text-xs text-muted-foreground mb-0.5">
              Replying to {message.reply_to_message.user.name}
            </p>
            <p className="text-xs line-clamp-1 text-muted-foreground">
              {message.reply_to_message.message || "[Attachment]"}
            </p>
          </div>
        )}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200",
            "hover:shadow-md",
            isOwnMessage
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md"
              : "bg-card border border-border/50 rounded-bl-md",
          )}
        >
          {message.message && (
            <p className="leading-relaxed whitespace-pre-wrap break-words">
              {message.message}
            </p>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className={cn("mt-2 grid gap-2", message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {message.attachments.map((attachment, index) => (
                <div key={index} className="relative group/attachment">
                  {attachment.type.startsWith('image/') ? (
                    <div
                      className="relative overflow-hidden rounded-xl border border-border/50 shadow-sm cursor-pointer group/image"
                      onClick={() => handleImageClick(attachment.url)}
                    >
                      <img
                        src={attachment.url || "/placeholder.svg"}
                        alt={attachment.name || "Image"}
                        className="max-w-full h-auto object-cover max-h-64 w-full transition-transform duration-200 group-hover/image:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg"
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/5 transition-colors pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/50 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                          Click to view
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 border border-border/50 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <DownloadIcon className="h-4 w-4 text-primary" />
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate flex-1"
                      >
                        {attachment.name}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className={cn(
            "flex items-center gap-1.5 mt-1.5",
            isOwnMessage ? "justify-end" : "justify-start"
          )}>
            <span className="text-[0.65rem] text-muted-foreground/70">
              {format(new Date(message.created_at), "HH:mm")}
            </span>
          </div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted rounded-lg"
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwnMessage ? "end" : "start"}>
          <DropdownMenuItem onClick={() => setReplyingToMessage(message)}>
            <ReplyIcon className="mr-2 h-4 w-4" /> Reply
          </DropdownMenuItem>
          {isOwnMessage && (
            <DropdownMenuItem onClick={() => deleteMessage(message.id)} className="text-red-600 focus:text-red-600">
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
