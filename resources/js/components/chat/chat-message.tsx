"use client"
import { cn } from "@/lib/utils"
import { UserAvatar } from "./user-avatar"
import { motion } from "framer-motion"
import { FileText, MoreHorizontal, Reply, X } from "lucide-react"
import { useState } from "react"
import ImageViewerModal from "./image-viewer-modal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/chat/ui/dropdown-menu"
import type { Message } from "@/providers/chat-provider" // Import Message type

interface ChatMessageProps {
  senderName: string
  senderAvatar: string
  content: string
  timestamp: string
  isCurrentUser: boolean
  attachments?: {
    name: string
    url: string
    type: string
  }[]
  messageId: string // Added for delete/reply
  onDelete: (messageId: string) => void // Added for delete
  onReply: (message: Message) => void // Added for reply
  repliedToMessage?: Message // Added for displaying replied message
}

export function ChatMessage({
  senderName,
  senderAvatar,
  content,
  timestamp,
  isCurrentUser,
  attachments,
  messageId,
  onDelete,
  onReply,
  repliedToMessage,
}: ChatMessageProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const imageAttachments = attachments?.filter((att) => att.type.startsWith("image/")) || []
  const otherAttachments = attachments?.filter((att) => !att.type.startsWith("image/")) || []

  const displayImages = imageAttachments.slice(0, 3) // Show first 3 images
  const remainingImagesCount = imageAttachments.length - displayImages.length

  const hasMultipleAttachments = attachments && attachments.length > 0

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index)
    setIsImageViewerOpen(true)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn("flex items-start gap-3 p-2 group relative", isCurrentUser ? "justify-end" : "justify-start")}
    >
      {!isCurrentUser && <UserAvatar src={senderAvatar} alt={senderName} fallback={senderName.charAt(0)} />}
      <div className={cn("flex flex-col max-w-[70%]", isCurrentUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm relative",
            isCurrentUser
              ? "bg-chat-bubble-mine text-chat-bubble-mine-foreground"
              : "bg-chat-bubble-other dark:bg-chat-bubble-other-dark text-chat-bubble-other-foreground dark:text-chat-bubble-other-foreground-dark", // Changed colors
            hasMultipleAttachments && "p-2",
          )}
        >
          {!isCurrentUser && <span className="font-semibold text-xs mb-1 block">{senderName}</span>}

          {repliedToMessage && (
            <div
              className={cn(
                "border-l-2 pl-2 mb-2 text-xs italic",
                isCurrentUser ? "border-chat-bubble-mine-foreground/50" : "border-muted-foreground/50",
              )}
            >
              <p className="font-semibold">
                Replying to {repliedToMessage.senderId === messageId ? "yourself" : repliedToMessage.senderId}
              </p>
              <p className="truncate max-w-[200px]">{repliedToMessage.content || "[Attachment]"}</p>
            </div>
          )}

          {content && <p className={cn(hasMultipleAttachments && "mb-2")}>{content}</p>}

          {imageAttachments.length > 0 && (
            <div className={cn("grid gap-2", imageAttachments.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {displayImages.map((img, index) => (
                <img
                  key={index}
                  src={img.url || "/placeholder.svg"}
                  alt={img.name}
                  className="w-full h-24 object-cover rounded-md cursor-pointer"
                  style={{ maxWidth: "200px", maxHeight: "200px" }}
                  onClick={() => openImageViewer(index)}
                />
              ))}
              {remainingImagesCount > 0 && (
                <div
                  className="relative w-full h-24 bg-muted-foreground/20 rounded-md flex items-center justify-center text-lg font-bold text-muted-foreground cursor-pointer"
                  onClick={() => openImageViewer(3)} // Open viewer starting from the 4th image (index 3)
                >
                  +{remainingImagesCount}
                </div>
              )}
            </div>
          )}

          {otherAttachments.length > 0 && (
            <div className="grid gap-2 mt-2">
              {otherAttachments.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-500 hover:underline text-xs"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </a>
              ))}
            </div>
          )}

          {/* Message Actions Dropdown - Moved back inside the bubble */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "absolute top-1 right-1 p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100",
                  isCurrentUser
                    ? "text-chat-bubble-mine-foreground/70 hover:bg-chat-bubble-mine-foreground/20"
                    : "text-chat-bubble-other-foreground/70 dark:text-chat-bubble-other-foreground-dark/70 hover:bg-chat-bubble-other/20 dark:hover:bg-chat-bubble-other-dark/20",
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Message actions</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
              <DropdownMenuItem
                onClick={() =>
                  onReply({
                    id: messageId,
                    senderId: "",
                    content,
                    timestamp,
                    attachments,
                    repliedToMessageId: repliedToMessage?.id,
                  })
                }
              >
                <Reply className="mr-2 h-4 w-4" /> Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(messageId)}>
                <X className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span className={cn("text-xs text-muted-foreground mt-1", isCurrentUser ? "text-right" : "text-left")}>
          {timestamp}
        </span>
      </div>

      {isCurrentUser && <UserAvatar src={senderAvatar} alt={senderName} fallback={senderName.charAt(0)} />}

      {isImageViewerOpen && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          images={imageAttachments}
          initialIndex={currentImageIndex}
        />
      )}
    </motion.div>
  )
}
