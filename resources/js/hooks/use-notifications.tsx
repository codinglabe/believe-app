"use client"

import echo from "@/lib/echo"
import { useEffect, useState } from "react"

interface Notification {
  id: string
  type: string
  data: {
    title: string
    body: string
    content_item_id: number
    channel: string
    meta?: Record<string, any>
    timestamp: string
  }
  read_at: string | null
  created_at: string
}

export function useNotifications(userId: number) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Listen for new notifications via Laravel Reverb
    const channel = echo.private(`users.${userId}`)

    channel.notification((notification: Notification) => {
      console.log("[v0] New notification received:", notification)

      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)

      // Show browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.data.title, {
          body: notification.data.body,
          icon: "/favicon-96x96.png",
        })
      }
    })

    return () => {
      channel.stopListening(".notification")
    }
  }, [userId])

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
    setUnreadCount(0)
  }

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  }
}
