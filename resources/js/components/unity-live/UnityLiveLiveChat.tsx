"use client"

import { useState } from "react"
import { usePage } from "@inertiajs/react"
import { Send, Smile, Users } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { useUnityLiveChat } from "@/hooks/useUnityLiveChat"
import toast from "react-hot-toast"

type Props = {
  slug: string
  broadcastChannel: string
  viewerCount: number
  className?: string
}

export function UnityLiveLiveChat({ slug, broadcastChannel, viewerCount, className = "" }: Props) {
  const { auth } = usePage().props as { auth?: { user?: { name?: string } } }
  const displayName = auth?.user?.name?.trim() || undefined
  const { messages, isLoading, isSending, sendMessage, scrollRef } = useUnityLiveChat(slug, broadcastChannel)
  const [draft, setDraft] = useState("")

  const handleSend = async () => {
    if (!draft.trim()) {
      return
    }
    try {
      const ok = await sendMessage(draft, displayName)
      if (ok) {
        setDraft("")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not send message."
      toast.error(message)
    }
  }

  return (
    <div
      className={`flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-lg sm:min-h-[360px] lg:min-h-[420px] lg:max-h-[calc(100vh-6.5rem)] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-3.5">
        <span className="text-sm font-semibold text-white">Live Chat</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-300">
          <Users className="h-3.5 w-3.5" />
          {viewerCount}
        </span>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
        {isLoading ? (
          <p className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">Loading chat…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Be the first to say something in the chat.
          </p>
        ) : (
          messages.map((msg) => {
            const initials = msg.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()

            return (
              <div key={msg.id} className="flex gap-2.5">
                <Avatar className="h-8 w-8 shrink-0">
                  {msg.avatarUrl ? <AvatarImage src={msg.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-purple-600/15 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{msg.name}</p>
                  <p className="mt-0.5 break-words text-sm leading-snug text-neutral-600 dark:text-neutral-300">
                    {msg.message}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-800 p-3">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Type a message…"
              className="h-10 pr-9 text-sm"
              maxLength={500}
            />
            <Smile className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-10 shrink-0 bg-purple-600 px-4 hover:bg-purple-700"
            disabled={isSending || !draft.trim()}
            onClick={() => void handleSend()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
