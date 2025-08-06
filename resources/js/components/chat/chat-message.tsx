"use client"
import { cn } from "@/lib/utils"
import { UserAvatar } from "./user-avatar"
import { motion } from "framer-motion"
import { FileText, MoreHorizontal, Reply, X, Download } from "lucide-react"
import { useState } from "react"
import ImageViewerModal from "./image-viewer-modal"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/chat/ui/dropdown-menu"
import type { Message } from "@/providers/chat-provider"

interface ChatMessageProps {
  message: Message
  isCurrentUser: boolean
  onDelete: (messageId: number) => void
  onReply: (message: Message) => void
}

export function ChatMessage({ message, isCurrentUser, onDelete, onReply }: ChatMessageProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const imageAttachments = message.attachments?.filter((att) => att.type.startsWith("image/")) || []
  const otherAttachments = message.attachments?.filter((att) => !att.type.startsWith("image/")) || []

  const displayImages = imageAttachments.slice(0, 3)
  const remainingImagesCount = imageAttachments.length - displayImages.length
  const hasAttachments = message.attachments && message.attachments.length > 0

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index)
    setIsImageViewerOpen(true)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
      {!isCurrentUser && (
        <UserAvatar
          src={message.user.avatar}
          alt={message.user.name}
          fallback={message.user.name.charAt(0)}
          status={message.user.is_online ? "online" : "offline"}
        />
      )}

      <div className={cn("flex flex-col max-w-[70%]", isCurrentUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm relative",
            isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            hasAttachments && "p-2",
          )}
        >
          {!isCurrentUser && <span className="font-semibold text-xs mb-1 block">{message.user.name}</span>}

          {/* Reply to message */}
          {message.reply_to_message && (
            <div
              className={cn(
                "border-l-2 pl-2 mb-2 text-xs italic opacity-75",
                isCurrentUser ? "border-primary-foreground/50" : "border-muted-foreground/50",
              )}
            >
              <p className="font-semibold">Replying to {message.reply_to_message.user.name}</p>
              <p className="truncate max-w-[200px]">{message.reply_to_message.message || "[Attachment]"}</p>
            </div>
          )}

          {/* Message content */}
          {message.message && <p className={cn(hasAttachments && "mb-2")}>{message.message}</p>}

          {/* Image attachments */}
          {imageAttachments.length > 0 && (
            <div className={cn("grid gap-2", imageAttachments.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {displayImages.map((img, index) => (
                <div key={index} className="relative group/image">
                  <img
                    src={img.url || "/placeholder.svg"}
                    alt={img.name}
                    className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ maxWidth: "200px", maxHeight: "200px" }}
                    onClick={() => openImageViewer(index)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors rounded-md" />
                </div>
              ))}
              {remainingImagesCount > 0 && (
                <div
                  className="relative w-full h-24 bg-muted-foreground/20 rounded-md flex items-center justify-center text-lg font-bold text-muted-foreground cursor-pointer hover:bg-muted-foreground/30 transition-colors"
                  onClick={() => openImageViewer(3)}
                >
                  +{remainingImagesCount}
                </div>
              )}
            </div>
          )}

          {/* Other attachments */}
          {otherAttachments.length > 0 && (
            <div className="grid gap-2 mt-2">
              {otherAttachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-background/10 rounded-md hover:bg-background/20 transition-colors"
                >
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs opacity-75">{formatFileSize(file.size)}</p>
                  </div>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-background/20 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Message actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "absolute top-1 right-1 p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100",
                  isCurrentUser
                    ? "text-primary-foreground/70 hover:bg-primary-foreground/20"
                    : "text-foreground/70 hover:bg-background/20",
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Message actions</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="mr-2 h-4 w-4" /> Reply
              </DropdownMenuItem>
              {isCurrentUser && (
                <DropdownMenuItem onClick={() => onDelete(message.id)} className="text-destructive">
                  <X className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit indicator */}
          {message.is_edited && <span className="text-xs opacity-50 ml-2">(edited)</span>}
        </div>

        <span className={cn("text-xs text-muted-foreground mt-1", isCurrentUser ? "text-right" : "text-left")}>
          {formatTime(message.created_at)}
        </span>
      </div>

      {isCurrentUser && (
        <UserAvatar
          src={message.user.avatar}
          alt={message.user.name}
          fallback={message.user.name.charAt(0)}
          status={message.user.is_online ? "online" : "offline"}
        />
      )}

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
