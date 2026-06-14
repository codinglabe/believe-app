"use client"

import React, { useState } from "react"
import { ChatMessage as ChatMessageType } from "@/providers/chat-provider"
import { UserAvatar } from "@/components/chat/user-avatar"
import { formatChatTime } from "@/lib/chat-timestamps"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/chat/ui/dropdown-menu"
import { MoreHorizontalIcon, ReplyIcon, Trash2Icon, DownloadIcon } from "lucide-react"
import { useChat } from "@/providers/chat-context"
import { ImageViewerModal } from "@/components/chat/image-viewer-modal"
import { Button } from "./ui/button"
import { chatAccentText, chatReceivedBubble, chatReplyBorder, chatSentBubble } from "./chat-brand"

interface ChatMessageProps {
  message: ChatMessageType
  isOwnMessage: boolean
  isMobile?: boolean
  isGroupChat?: boolean
  showAvatar?: boolean
}

export function ChatMessage({
  message,
  isOwnMessage,
  isMobile = false,
  isGroupChat = false,
  showAvatar = true,
}: ChatMessageProps) {
  const { setReplyingToMessage, deleteMessage } = useChat()
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handleImageClick = (url: string | null | undefined) => {
    if (!url) return
    setSelectedImage(url)
    setIsImageViewerOpen(true)
  }

  const showSenderAvatar = !isOwnMessage && showAvatar && (isGroupChat || !isMobile)

  return (
    <div
      className={cn(
        "group flex items-end gap-1.5 sm:gap-2",
        isMobile ? "mb-1" : "mb-3 sm:mb-4",
        isOwnMessage ? "justify-end" : "justify-start",
      )}
    >
      {!isOwnMessage && !showSenderAvatar && <div className="w-7 shrink-0 sm:w-8" />}
      {showSenderAvatar && (
        <UserAvatar
          user={message.user}
          className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
        />
      )}
      <div
        className={cn(
          "flex max-w-[min(82%,28rem)] flex-col sm:max-w-[65%]",
          isOwnMessage ? "items-end" : "items-start",
        )}
      >
        {!isOwnMessage && isGroupChat && (
          <span className={cn("mb-0.5 px-1 text-[11px] font-medium", chatAccentText)}>
            {message.user.name}
          </span>
        )}
        {message.reply_to_message && (
          <div
            className={cn(
              "mb-1 rounded-lg border-l-2 px-2.5 py-1.5 text-sm shadow-sm",
              isOwnMessage
                ? "border-white/50 bg-black/10 text-white/90"
                : cn(chatReplyBorder, "bg-purple-500/5 dark:bg-purple-500/10"),
            )}
          >
            <p className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
              {message.reply_to_message.user.name}
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {message.reply_to_message.message || "[Attachment]"}
            </p>
          </div>
        )}
        <div className="relative flex items-end gap-1">
          <div
            className={cn(
              "relative px-3 py-1.5 text-[15px] leading-[1.35] shadow-sm transition-shadow sm:px-3.5 sm:py-2 sm:text-sm",
              isOwnMessage
                ? cn(chatSentBubble, "rounded-2xl rounded-br-sm")
                : cn(chatReceivedBubble, "rounded-2xl rounded-bl-sm"),
            )}
          >
            {message.message && (
              <p className="whitespace-pre-wrap break-words">{message.message}</p>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className={cn("grid gap-2", message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1", message.message && "mt-1.5")}>
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="relative">
                    {attachment.type.startsWith("image/") ? (
                      <div
                        className="relative cursor-pointer overflow-hidden rounded-lg"
                        onClick={() => handleImageClick(attachment.url)}
                      >
                        <img
                          src={attachment.url || "/placeholder.svg"}
                          alt={attachment.name || "Image"}
                          className="h-auto max-h-64 w-full max-w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg"
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-black/5 p-2 dark:bg-white/5">
                        <DownloadIcon className="h-4 w-4 shrink-0" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm font-medium hover:underline"
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
                "mt-0.5 block text-right text-[10px] leading-none tabular-nums",
                isOwnMessage ? "text-white/70" : "text-muted-foreground/80",
              )}
            >
              {formatChatTime(message.created_at)}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 shrink-0 rounded-full hover:bg-muted",
                  isMobile ? "opacity-60" : "opacity-0 group-hover:opacity-100",
                  "transition-opacity",
                )}
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
        </div>
      </div>

      <ImageViewerModal
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        imageUrl={selectedImage}
      />
    </div>
  )
}
