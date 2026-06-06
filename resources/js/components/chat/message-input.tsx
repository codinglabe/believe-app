"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/chat/ui/button"
import { PaperclipIcon, SendIcon, XIcon, ReplyIcon } from "lucide-react"
import { useChat } from "@/providers/chat-provider"
import { Textarea } from "@/components/chat/ui/textarea"
import { cn } from "@/lib/utils"
import { chatAccentText, chatGradientBg, chatGradientBgHover, chatSendButtonActive } from "./chat-brand"

type MessageInputProps = {
  isMobile?: boolean
}

export function MessageInput({ isMobile = false }: MessageInputProps) {
  const { sendMessage, setTypingStatus, replyingToMessage, setReplyingToMessage } = useChat()
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isTypingRef = useRef(false)

  const canSend = message.trim() !== "" || attachments.length > 0

  const handleSendMessage = async () => {
    if (!canSend) return

    try {
      await sendMessage(message, attachments, replyingToMessage?.id)
      setMessage("")
      setAttachments([])
      setReplyingToMessage(null)
      isTypingRef.current = false
      setTypingStatus(false)
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
    const value = e.target.value
    setMessage(value)
    if (value.length > 0) {
      isTypingRef.current = true
      setTypingStatus(true)
    } else if (isTypingRef.current) {
      isTypingRef.current = false
      setTypingStatus(false)
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, isMobile ? 100 : 120)}px`
    }
  }, [message, isMobile])

  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        isTypingRef.current = false
        setTypingStatus(false)
      }
    }
  }, [setTypingStatus])

  return (
    <div className={cn("flex flex-col", isMobile ? "gap-1.5" : "gap-3")}>
      {replyingToMessage && (
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/80 px-3 py-2 text-sm shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ReplyIcon className={cn("h-4 w-4 shrink-0", chatAccentText)} />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-foreground">{replyingToMessage.user.name}</span>
              <span className="ml-1 line-clamp-1 text-muted-foreground">
                {replyingToMessage.message || "[Attachment]"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setReplyingToMessage(null)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-border/40 bg-background/80 p-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-1 text-xs"
            >
              <span className="max-w-[120px] truncate font-medium">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:text-destructive"
                onClick={() => removeAttachment(index)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-1.5",
          isMobile
            ? "rounded-full border border-purple-500/10 bg-card px-1 py-1 shadow-sm dark:border-purple-500/20"
            : "rounded-2xl border border-border/60 bg-background p-2 shadow-sm focus-within:border-purple-500/35 focus-within:ring-2 focus-within:ring-purple-500/25 dark:focus-within:border-blue-500/30 dark:focus-within:ring-blue-500/20",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full hover:bg-muted/60",
            isMobile ? "h-9 w-9 text-muted-foreground" : "h-10 w-10 rounded-xl hover:bg-muted",
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <PaperclipIcon className="h-5 w-5" strokeWidth={2} aria-hidden />
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
          placeholder={isMobile ? "Message" : "Type your message..."}
          className={cn(
            "flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[15px] leading-5 focus-visible:ring-0 focus-visible:ring-offset-0",
            isMobile ? "min-h-[36px] max-h-[100px]" : "min-h-[44px] max-h-[min(120px,35vh)] text-sm",
          )}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <Button
          type="button"
          size="icon"
          className={cn(
            "inline-flex shrink-0 items-center justify-center text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
            isMobile
              ? cn(
                  "h-10 w-10 rounded-full",
                  canSend ? chatSendButtonActive : "bg-muted-foreground/30",
                )
              : cn("h-10 w-10 rounded-xl shadow-md", chatGradientBg, chatGradientBgHover),
          )}
          onClick={handleSendMessage}
          disabled={!canSend}
          aria-label="Send message"
        >
          <SendIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </div>
  )
}
