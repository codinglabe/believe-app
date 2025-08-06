"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/chat/ui/textarea"
import { Button } from "@/components/chat/ui/button"
import { Paperclip, Send, Smile, X, FileText, ImageIcon } from "lucide-react"
import { useChat } from "@/providers/chat-provider"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/chat/ui/popover"
import { Reply } from "lucide-react"

export function MessageInput() {
  const { selectedRoomId, sendMessage, setTyping, replyingToMessage, setReplyingToMessage } = useChat()
  const [message, setMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Effect to revoke object URLs when files are removed or component unmounts
  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => URL.revokeObjectURL(URL.createObjectURL(file)))
    }
  }, [selectedFiles])

  // Effect for dynamic textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSendMessage = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || !selectedRoomId || isUploading) return

    setIsUploading(true)
    try {
      await sendMessage(message, selectedFiles, replyingToMessage?.id)
      setMessage("")
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      setReplyingToMessage(null)

      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      setTyping(false)
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)

    if (selectedRoomId) {
      // Set typing indicator
      setTyping(value.length > 0)

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Set timeout to clear typing indicator
      if (value.length > 0) {
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false)
        }, 2000)
      }
    }
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prevMsg) => prevMsg + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Validate file size (max 10MB per file)
      const validFiles = newFiles.filter((file) => file.size <= 10 * 1024 * 1024)
      if (validFiles.length !== newFiles.length) {
        alert("Some files were too large (max 10MB per file)")
      }
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prevFiles) => {
      const fileToRemove = prevFiles[indexToRemove]
      URL.revokeObjectURL(URL.createObjectURL(fileToRemove))

      const newFiles = prevFiles.filter((_, index) => index !== indexToRemove)
      if (newFiles.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return newFiles
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="flex flex-col p-4 border-t bg-background">
      {/* Reply indicator */}
      {replyingToMessage && (
        <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">Replying to {replyingToMessage.user.name}:</span>
            <span className="truncate max-w-[200px] text-muted-foreground">
              {replyingToMessage.message || "[Attachment]"}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingToMessage(null)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 bg-muted rounded-md">
          <span className="text-sm font-semibold mb-1 block">Selected Files ({selectedFiles.length}):</span>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-xs relative group max-w-[200px]"
              >
                {file.type.startsWith("image/") ? (
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <img
                      src={URL.createObjectURL(file) || "/placeholder.svg"}
                      alt={file.name}
                      className="h-8 w-8 object-cover rounded-sm"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  className="h-5 w-5 absolute -top-2 -right-2 bg-background rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar"
        />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleAttachClick}
          aria-label="Attach file"
          disabled={isUploading}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Add emoji">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
          </PopoverContent>
        </Popover>

        <Textarea
          ref={textareaRef}
          placeholder={isUploading ? "Sending..." : "Type your message..."}
          className="flex-1 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isUploading}
        />

        <Button
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={handleSendMessage}
          disabled={(!message.trim() && selectedFiles.length === 0) || isUploading}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
