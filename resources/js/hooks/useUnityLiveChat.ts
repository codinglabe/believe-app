import { useCallback, useEffect, useRef, useState } from "react"
import { echo } from "@/lib/echo"
import axios from "axios"
import type { UnityLiveChatMessage } from "@/lib/unity-live-display"

const POLL_INTERVAL_MS = 2_000

function mergeChatMessages(
  prev: UnityLiveChatMessage[],
  incoming: UnityLiveChatMessage[],
): UnityLiveChatMessage[] {
  if (incoming.length === 0) {
    return prev
  }

  const map = new Map<string, UnityLiveChatMessage>()
  for (const row of prev) {
    map.set(row.id, row)
  }
  for (const row of incoming) {
    if (row?.id) {
      map.set(row.id, row)
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
}

function latestMessageId(messages: UnityLiveChatMessage[]): string {
  if (messages.length === 0) {
    return ""
  }
  return messages[messages.length - 1]?.id ?? ""
}

export function useUnityLiveChat(slug: string, broadcastChannel: string) {
  const [messages, setMessages] = useState<UnityLiveChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string>("")
  const slugRef = useRef(slug)

  slugRef.current = slug

  const applyMessages = useCallback((incoming: UnityLiveChatMessage[], replace = false) => {
    setMessages((prev) => {
      const next = replace ? mergeChatMessages([], incoming) : mergeChatMessages(prev, incoming)
      lastMessageIdRef.current = latestMessageId(next)
      return next
    })
  }, [])

  const appendMessage = useCallback(
    (payload: UnityLiveChatMessage) => {
      if (!payload?.id) {
        return
      }
      applyMessages([payload])
    },
    [applyMessages],
  )

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  const fetchMessages = useCallback(
    async (incremental = false) => {
      const currentSlug = slugRef.current
      if (!currentSlug) {
        return
      }

      const afterId = incremental ? lastMessageIdRef.current : ""
      const url =
        incremental && afterId
          ? `/unity-live/${encodeURIComponent(currentSlug)}/chat?after_id=${encodeURIComponent(afterId)}`
          : `/unity-live/${encodeURIComponent(currentSlug)}/chat`

      const res = await axios.get(url)
      const incoming = Array.isArray(res.data?.messages)
        ? (res.data.messages as UnityLiveChatMessage[])
        : []

      if (incremental && afterId) {
        if (incoming.length > 0) {
          applyMessages(incoming)
        }
      } else {
        applyMessages(incoming, true)
      }
    },
    [applyMessages],
  )

  useEffect(() => {
    if (!slug) {
      return
    }

    let active = true
    setIsLoading(true)
    lastMessageIdRef.current = ""

    void fetchMessages(false)
      .catch(() => {})
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [fetchMessages, slug])

  useEffect(() => {
    if (!slug) {
      return
    }

    const poll = () => {
      if (document.visibilityState === "hidden") {
        return
      }
      void fetchMessages(true).catch(() => {})
    }

    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchMessages(true).catch(() => {})
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [fetchMessages, slug])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const channel = broadcastChannel?.trim()
    if (!channel || channel === "unity-live.disabled") {
      return
    }

    const subscription = echo().channel(channel)
    const handler = (payload: UnityLiveChatMessage) => {
      appendMessage(payload)
    }

    subscription.listen(".chat.message", handler)

    return () => {
      subscription.stopListening(".chat.message", handler)
    }
  }, [appendMessage, broadcastChannel])

  const sendMessage = useCallback(
    async (text: string, displayName?: string) => {
      const message = text.trim()
      if (!message || isSending || !slug) {
        return false
      }

      setIsSending(true)
      try {
        const res = await axios.post(`/unity-live/${encodeURIComponent(slug)}/chat`, {
          message,
          displayName,
        })
        const entry = res.data?.message as UnityLiveChatMessage | undefined
        if (entry?.id) {
          appendMessage(entry)
        }
        return true
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const streamError = error.response?.data?.errors?.stream?.[0]
          const messageError = error.response?.data?.errors?.message?.[0]
          throw new Error(
            (typeof streamError === "string" && streamError) ||
              (typeof messageError === "string" && messageError) ||
              "Could not send message.",
          )
        }
        throw new Error("Could not send message.")
      } finally {
        setIsSending(false)
      }
    },
    [appendMessage, isSending, slug],
  )

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    scrollRef,
  }
}
