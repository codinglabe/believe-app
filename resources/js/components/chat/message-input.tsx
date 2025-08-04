"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/chat/ui/textarea"
import { Button } from "@/components/chat/ui/button"
import { Paperclip, Send, Smile, X, FileText } from "lucide-react" // Removed Sticker
import { useChat } from "@/providers/chat-provider"
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/chat/ui/popover"
import { Reply } from "lucide-react" // Import the Reply component

export function MessageInput() {
  const { selectedConversationId, addMessage, setIsTyping, replyingToMessage, setReplyingToMessage } = useChat()
  const [message, setMessage] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null) // Ref for textarea

  // Effect to revoke object URLs when files are removed or component unmounts
  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => URL.revokeObjectURL(URL.createObjectURL(file)))
    }
  }, [selectedFiles])

  // Effect for dynamic textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto" // Reset height to calculate new scrollHeight
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSendMessage = () => {
    if ((message.trim() || selectedFiles.length > 0) && selectedConversationId) {
      const attachmentsData = selectedFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file), // Use temporary object URL for display
        type: file.type,
      }))
      addMessage(selectedConversationId, message, attachmentsData, replyingToMessage?.id)
      setMessage("")
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = "" // Clear the file input
      }
      setIsTyping(false) // Turn off typing indicator after sending message
      setReplyingToMessage(null) // Clear reply state after sending
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prevMsg) => prevMsg + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)])
    }
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prevFiles) => {
      const newFiles = prevFiles.filter((_, index) => index !== indexToRemove)
      if (newFiles.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "" // Clear input if last file is removed
      }
      return newFiles
    })
  }

  return (
    <div className="flex flex-col p-4 border-t bg-background">
      {replyingToMessage && (
        <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="h-4 w-4 text-muted-foreground" /> {/* Use the imported Reply component */}
            <span className="font-semibold">Replying to:</span>
            <span className="truncate max-w-[200px] text-muted-foreground">
              {replyingToMessage.content || "[Attachment]"}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingToMessage(null)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 bg-muted rounded-md">
          <span className="text-sm font-semibold mb-1 block">Selected Files:</span>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1 text-xs relative group"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file) || "/placeholder.svg"}
                    alt={file.name}
                    className="h-12 w-12 object-cover rounded-sm"
                  />
                ) : (
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="truncate max-w-[100px]">{file.name}</span>
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
      <div className="flex items-end gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleAttachClick}
          aria-label="Attach file"
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
          ref={textareaRef} // Assign ref
          placeholder="Type your message..."
          className="flex-1 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            if (selectedConversationId) {
              setIsTyping(e.target.value.length > 0) // Set typing based on message content
            }
          }}
          onKeyDown={handleKeyDown}
          rows={1} // Set initial rows to 1 for proper min-height calculation
        />
        <Button
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={handleSendMessage}
          disabled={!message.trim() && selectedFiles.length === 0}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
