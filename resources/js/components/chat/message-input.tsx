"use client"

import React, { useState, useRef, useEffect } from "react"
import { Input } from "@/components/chat/ui/input"
import { Button } from "@/components/chat/ui/button"
import { PaperclipIcon, SendIcon, XIcon } from 'lucide-react'
import { useChat } from "@/providers/chat-provider"
import { Textarea } from "@/components/chat/ui/textarea"
import { cn } from "@/lib/utils"

export function MessageInput() {
  const { sendMessage, setTypingStatus, replyingToMessage, setReplyingToMessage, currentUser } = useChat()
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isTypingRef = useRef(false)

  const handleSendMessage = async () => {
    if (message.trim() === "" && attachments.length === 0) return

    try {
      await sendMessage(message, attachments, replyingToMessage?.id)
      setMessage("")
      setAttachments([])
      setReplyingToMessage(null)
      isTypingRef.current = false
      setTypingStatus(false) // Ensure typing status is reset
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files))
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (e.target.value.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true
      setTypingStatus(true)
    } else if (e.target.value.length === 0 && isTypingRef.current) {
      isTypingRef.current = false
      setTypingStatus(false)
    }
  }

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="flex flex-col gap-2">
      {replyingToMessage && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
          <div className="flex items-center gap-2">
            <ReplyIcon className="h-4 w-4 text-muted-foreground" />
            <span>
              Replying to{" "}
              <span className="font-semibold">{replyingToMessage.user.name}</span>:{" "}
              <span className="text-muted-foreground line-clamp-1">
                {replyingToMessage.message || "[Attachment]"}
              </span>
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingToMessage(null)}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-xs">
              <span>{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => removeAttachment(index)}
              >
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
          <PaperclipIcon className="h-5 w-5" />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={handleAttachmentChange}
          />
        </Button>
        <Textarea
          ref={textareaRef}
          placeholder="Type your message..."
          className="flex-1 resize-none min-h-[40px] max-h-[120px] pr-10"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button size="icon" onClick={handleSendMessage} disabled={message.trim() === "" && attachments.length === 0}>
          <SendIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
