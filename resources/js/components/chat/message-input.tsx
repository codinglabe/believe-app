"use client"

import React, { useState, useRef, useEffect } from "react"
import { Input } from "@/components/chat/ui/input"
import { Button } from "@/components/chat/ui/button"
import { PaperclipIcon, SendIcon, XIcon, ReplyIcon } from 'lucide-react'
import { useChat } from "@/providers/chat-provider"
import { Textarea } from "@/components/chat/ui/textarea"
import { cn } from "@/lib/utils"
import { chatGradientBg, chatGradientBgHover } from "./chat-brand"

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
    <div className="flex flex-col gap-3">
      {replyingToMessage && (
        <div className="flex items-center justify-between p-3 bg-muted/50 border border-border/50 rounded-xl text-sm shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
              <ReplyIcon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-foreground">
                {replyingToMessage.user.name}
              </span>
              <span className="text-muted-foreground line-clamp-1 ml-1">
                {replyingToMessage.message || "[Attachment]"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 hover:bg-muted"
            onClick={() => setReplyingToMessage(null)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border border-border/50 rounded-xl bg-muted/30">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-background border border-border/50 rounded-lg px-3 py-1.5 text-xs shadow-sm"
            >
              <span className="font-medium truncate max-w-[150px]">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => removeAttachment(index)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 bg-background border border-border/60 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/25 focus-within:border-purple-500/35 dark:focus-within:ring-blue-500/20 dark:focus-within:border-blue-500/30 transition-all duration-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-muted"
          onClick={() => fileInputRef.current?.click()}
        >
          <PaperclipIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            aria-label="Attach files"
            onChange={handleAttachmentChange}
          />
        </Button>
        <Textarea
          ref={textareaRef}
          placeholder="Type your message..."
          className="flex-1 resize-none border-0 bg-transparent px-1.5 py-2.5 text-sm leading-5 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[44px] max-h-[min(120px,35vh)]"
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button
          type="button"
          size="icon"
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
            chatGradientBg,
            chatGradientBgHover,
          )}
          onClick={handleSendMessage}
          disabled={message.trim() === "" && attachments.length === 0}
        >
          <SendIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </div>
  )
}
