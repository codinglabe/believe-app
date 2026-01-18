"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/chat/ui/popover"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { router } from "@inertiajs/react"
import axios from "axios"

interface Notification {
  id: string
  title: string
  body: string
  content_item_id: number
  type: string
  channel: string
  meta?: Record<string, any>
  timestamp: string
  read?: boolean
}

interface DatabaseNotification {
  id: string
  type: string
  notifiable_type: string
  notifiable_id: number
  data: string
  read_at: string | null
  created_at: string
  updated_at: string
}

interface NotificationBellProps {
  userId: number
  emailVerified?: boolean
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationBell({ userId, emailVerified = true, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio("/notification-sound.mp3")
    audioRef.current.volume = 0.5
  }, [])

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch((err) => console.log("Audio play failed:", err))
    }
  }

  const fetchNotifications = async () => {
    if (!userId) return
    
    // Don't fetch notifications if email is not verified
    if (!emailVerified) {
      return
    }

    setIsLoading(true)

    try {
      const response = await axios.get("/notifications")
      const data = response.data.notifications || []

      const formattedNotifications = data.map((dbNotif: DatabaseNotification) => {
        const notificationData = typeof dbNotif.data === "string" ? JSON.parse(dbNotif.data) : dbNotif.data

        return {
          id: dbNotif.id,
          title: notificationData.title || "Notification",
          body: notificationData.body || "",
          content_item_id: notificationData.content_item_id || 0,
          type: notificationData.type || dbNotif.type,
          channel: notificationData.channel || "app",
          meta: notificationData.meta || {},
          timestamp: dbNotif.created_at,
          read: !!dbNotif.read_at,
        }
      })

      setNotifications(formattedNotifications)
      setUnreadCount(formattedNotifications.filter((n: Notification) => !n.read).length)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notification: Notification): Promise<boolean> => {
    try {
      const response = await axios.post(`/notifications/${notification.id}/read`)

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))

      // Redirect to content page using Inertia router
      if (notification.content_item_id) {
        router.visit(`/notifications/content/${notification.content_item_id}`)
      }

      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
  }

  const markAllAsRead = async (): Promise<boolean> => {
    try {
      await axios.post("/notifications/mark-all-read")

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)

      return true
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      return false
    }
  }

  const clearAllNotifications = async (): Promise<boolean> => {
    try {
      await axios.post("/notifications/clear-all")

      setNotifications([])
      setUnreadCount(0)

      return true
    } catch (error) {
      console.error("Error clearing all notifications:", error)
      return false
    }
  }

  useEffect(() => {
    // Fetch initial notifications only if email is verified
    if (emailVerified) {
      fetchNotifications()
    }

    if (typeof window !== "undefined" && (window as any).Echo) {
      const echo = (window as any).Echo

      echo
        .private(`user.${userId}`)
        .listen(".campaign.notification", (data: any) => {
          console.log("[v0] Received campaign notification:", data)

          const newNotification: Notification = {
            id: data.id || `real-time-${Date.now()}`,
            title: data.title || "New Notification",
            body: data.body || "",
            content_item_id: data.content_item_id || 0,
            type: data.content_type || "campaign",
            channel: data.channel || "app",
            meta: data.meta || {},
            timestamp: data.sent_at || new Date().toISOString(),
            read: false,
          }


          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)

          playNotificationSound()

        //   if ("Notification" in window && Notification.permission === "granted") {
        //     new Notification(newNotification.title, {
        //       body: newNotification.body,
        //       icon: "/icon.png",
        //       tag: newNotification.id,
        //     })
        //   }
        })
        .listen(".Illuminate\\Notifications\\Events\\BroadcastNotificationCreated", (data: any) => {
          console.log("[v0] Received Laravel notification:", data)

          const notificationData = typeof data.data === "string" ? JSON.parse(data.data) : data.data

          const newNotification: Notification = {
            id: data.id || `laravel-${Date.now()}`,
            title: notificationData.title || "New Notification",
            body: notificationData.body || "",
            content_item_id: notificationData.content_item_id || 0,
            type: notificationData.type || data.type,
            channel: notificationData.channel || "app",
            meta: notificationData.meta || {},
            timestamp: data.created_at || new Date().toISOString(),
            read: false,
          }

          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)

          playNotificationSound()

        //   if ("Notification" in window && Notification.permission === "granted") {
        //     new Notification(newNotification.title, {
        //       body: newNotification.body,
        //       icon: "/icon.png",
        //       tag: newNotification.id,
        //     })
        //   }
        })

      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission()
      }

      return () => {
        echo.leave(`user.${userId}`)
      }
    }
  }, [userId])

  const handleNotificationClick = async (notification: Notification) => {
    const success = await markAsRead(notification)
    if (!success) {
      console.error("Failed to mark notification as read")
    }

    if (onNotificationClick) {
      onNotificationClick(notification)
    }

    setIsOpen(false)
  }

  const handleMarkAllRead = async () => {
    const success = await markAllAsRead()
    if (!success) {
      alert("Failed to mark all notifications as read. Please try again.")
    }
  }

  const handleClearAll = async () => {
    const confirmed = window.confirm("Are you sure you want to clear all notifications?")
    if (confirmed) {
      const success = await clearAllNotifications()
      if (!success) {
        alert("Failed to clear all notifications. Please try again.")
      }
    }
  }

  const handleRefresh = () => {
    fetchNotifications()
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-xs" disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs"
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs">
                  Clear all
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-accent cursor-pointer transition-colors",
                    !notification.read && "bg-blue-50 dark:bg-blue-950/20",
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm leading-tight">{notification.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize">
                          {notification.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {!notification.read && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
