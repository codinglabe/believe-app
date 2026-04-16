"use client"

import { useState, useEffect, useRef, type MouseEvent } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/chat/ui/popover"
import { ScrollArea } from "@/components/chat/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { router } from "@inertiajs/react"
import axios from "axios"
import toast from "react-hot-toast"

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
  /** Laravel JSON-encodes this; axios gives an object. Legacy rows may be a JSON string. */
  data: string | Record<string, unknown>
  read_at: string | null
  created_at: string
  updated_at: string
}

interface NotificationBellProps {
  userId: number
  emailVerified?: boolean
  onNotificationClick?: (notification: Notification) => void
}

const CARE_ALLIANCE_INVITATION_TYPE = "care_alliance_invitation"
const SUPPORTER_BIRTHDAY_TYPE = "supporter_birthday"

function parseNotificationPayload(data: unknown): Record<string, any> {
  if (data == null) {
    return {}
  }
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, any>
    } catch {
      return {}
    }
  }
  if (typeof data === "object") {
    return data as Record<string, any>
  }
  return {}
}

/** Maps API / DB notification row to UI shape. Laravel casts `data` to array — JSON response is an object, not always a string. */
function mapDatabaseNotification(dbNotif: DatabaseNotification): Notification {
  const notificationData = parseNotificationPayload(dbNotif.data)
  const type = notificationData.type || dbNotif.type || "notification"
  const title =
    notificationData.title ||
    (type === CARE_ALLIANCE_INVITATION_TYPE ? "Care Alliance invitation" : "Notification")
  const body = notificationData.body || notificationData.message || ""
  const invitationId = notificationData.invitation_id ?? notificationData.meta?.invitation_id
  const meta: Record<string, any> = {
    ...(notificationData.meta || {}),
    ...(invitationId != null ? { invitation_id: invitationId } : {}),
  }

  return {
    id: String(dbNotif.id),
    title,
    body,
    content_item_id: Number(notificationData.content_item_id) || 0,
    type,
    channel: notificationData.channel || "app",
    meta,
    timestamp: dbNotif.created_at,
    read: !!dbNotif.read_at,
  }
}

export function NotificationBell({ userId, emailVerified = true, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [careAllianceActionLoadingId, setCareAllianceActionLoadingId] = useState<string | null>(null)
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

      const formattedNotifications = data.map((dbNotif: DatabaseNotification) => mapDatabaseNotification(dbNotif))

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

      if (notification.content_item_id) {
        router.visit(`/notifications/content/${notification.content_item_id}`)
      } else if (notification.type === CARE_ALLIANCE_INVITATION_TYPE) {
        router.visit("/organization/alliance-membership?tab=invitations#care-alliance-invitations")
      } else if (notification.type === SUPPORTER_BIRTHDAY_TYPE && notification.meta?.celebrant_id != null) {
        router.visit(`/supporters/birthday-gift/${notification.meta.celebrant_id}`)
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

          const notificationData = parseNotificationPayload(data.data)
          const invitationId = notificationData.invitation_id ?? notificationData.meta?.invitation_id

          const newNotification: Notification = {
            id: data.id || `laravel-${Date.now()}`,
            title: notificationData.title || "New Notification",
            body: notificationData.body || notificationData.message || "",
            content_item_id: notificationData.content_item_id || 0,
            type: notificationData.type || data.type,
            channel: notificationData.channel || "app",
            meta: {
              ...(notificationData.meta || {}),
              ...(invitationId != null ? { invitation_id: invitationId } : {}),
            },
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

      // Do NOT auto-request notification permission here — it runs on every mount and causes
      // repeated "Allow notifications?" prompts (e.g. in Edge). Permission is requested once
      // via PushNotificationManager / app layout after login.

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

  /** Pending server-side invites show actions; legacy rows without the flag still get buttons if we have an id (API returns 422 if already handled). */
  const showCareAllianceActions = (notification: Notification) =>
    notification.type === CARE_ALLIANCE_INVITATION_TYPE &&
    typeof notification.meta?.invitation_id === "number" &&
    notification.meta?.show_care_alliance_actions !== false

  const showSupporterBirthdayActions = (notification: Notification) =>
    notification.type === SUPPORTER_BIRTHDAY_TYPE && notification.meta?.celebrant_id != null

  const handleCareAllianceInvitationAction = async (
    e: MouseEvent<HTMLButtonElement>,
    notification: Notification,
    action: "accept" | "decline",
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const invitationId = notification.meta?.invitation_id as number
    if (invitationId == null) return

    setCareAllianceActionLoadingId(notification.id)
    try {
      await axios.post(`/organization/care-alliance-invitations/${invitationId}/${action}`)
      toast.success(action === "accept" ? "You joined the Care Alliance." : "Invitation declined.")
      await axios.post(`/notifications/${notification.id}/read`)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? {
                ...n,
                read: true,
                meta: { ...n.meta, show_care_alliance_actions: false },
              }
            : n,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - (notification.read ? 0 : 1)))
      if (action === "accept") {
        router.visit("/organization/alliance-membership?tab=invitations#care-alliance-invitations")
      }
    } catch (err: any) {
      const msg = err.response?.data?.message
      toast.error(typeof msg === "string" ? msg : "Something went wrong. Try again.")
    } finally {
      setCareAllianceActionLoadingId(null)
    }
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
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">{notification.title}</p>
                      <p
                        className={cn(
                          "text-sm text-muted-foreground",
                          notification.type === CARE_ALLIANCE_INVITATION_TYPE ? "line-clamp-6" : "line-clamp-2",
                        )}
                      >
                        {notification.body}
                      </p>
                      {showCareAllianceActions(notification) && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={careAllianceActionLoadingId === notification.id}
                            onClick={(e) => handleCareAllianceInvitationAction(e, notification, "accept")}
                          >
                            {careAllianceActionLoadingId === notification.id ? "…" : "Accept"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={careAllianceActionLoadingId === notification.id}
                            onClick={(e) => handleCareAllianceInvitationAction(e, notification, "decline")}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                      {showSupporterBirthdayActions(notification) && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0"
                            onClick={async (e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const id = notification.meta?.celebrant_id
                              if (id == null) return
                              await markAsRead(notification)
                              router.visit(`/supporters/birthday-gift/${id}`)
                            }}
                          >
                            Send Gift
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const slug = notification.meta?.celebrant_slug
                              if (slug) {
                                router.visit(`/users/${slug}`)
                              } else if (notification.meta?.celebrant_id != null) {
                                router.visit(`/users/${notification.meta.celebrant_id}`)
                              }
                            }}
                          >
                            View profile
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground capitalize">
                          {String(notification.type).replace(/_/g, " ")}
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
