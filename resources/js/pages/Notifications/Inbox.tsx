"use client"

import { Head, router, usePage } from "@inertiajs/react"
import { useState, type MouseEvent } from "react"
import { Bell, ChevronLeft, ChevronRight } from "lucide-react"
import axios from "axios"
import toast from "react-hot-toast"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
import { cn } from "@/lib/utils"
import {
  CARE_ALLIANCE_INVITATION_TYPE,
  SUPPORTER_BIRTHDAY_TYPE,
  mapDatabaseNotification,
  type DatabaseNotification,
  type Notification,
} from "@/lib/notification-map"

interface PaginatedNotifications {
  data: DatabaseNotification[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  prev_page_url: string | null
  next_page_url: string | null
}

interface InboxProps {
  notifications: PaginatedNotifications
}

export default function NotificationsInbox() {
  const { notifications } = usePage().props as unknown as InboxProps
  const [careAllianceActionLoadingId, setCareAllianceActionLoadingId] = useState<string | null>(null)

  const rows: Notification[] = (notifications?.data || []).map((row) => mapDatabaseNotification(row))

  const unreadOnPage = rows.filter((n) => !n.read).length

  const markAsReadAndNavigate = async (notification: Notification) => {
    try {
      await axios.post(`/notifications/${notification.id}/read`)
      if (notification.content_item_id) {
        router.visit(`/notifications/content/${notification.content_item_id}`)
      } else if (notification.type === CARE_ALLIANCE_INVITATION_TYPE) {
        router.visit("/organization/alliance-membership?tab=invitations#care-alliance-invitations")
      } else if (notification.type === SUPPORTER_BIRTHDAY_TYPE && notification.meta?.celebrant_id != null) {
        router.visit(`/supporters/gift/${notification.meta.celebrant_id}`)
      } else {
        router.reload({ only: ["notifications"] })
      }
    } catch {
      toast.error("Could not update notification.")
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await axios.post("/notifications/mark-all-read")
      toast.success("All marked read")
      router.reload({ only: ["notifications"] })
    } catch {
      toast.error("Something went wrong.")
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm("Clear all notifications? This cannot be undone.")) return
    try {
      await axios.post("/notifications/clear-all")
      toast.success("Notifications cleared")
      router.reload({ only: ["notifications"] })
    } catch {
      toast.error("Something went wrong.")
    }
  }

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
      if (action === "accept") {
        router.visit("/organization/alliance-membership?tab=invitations#care-alliance-invitations")
      } else {
        router.reload({ only: ["notifications"] })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(typeof msg === "string" ? msg : "Something went wrong.")
    } finally {
      setCareAllianceActionLoadingId(null)
    }
  }

  return (
    <FrontendLayout>
      <Head title="Notifications" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {notifications?.total ?? 0} total
              {unreadOnPage > 0 ? ` · ${unreadOnPage} unread on this page` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={(notifications?.total ?? 0) === 0}>
              Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll} disabled={(notifications?.total ?? 0) === 0}>
              Clear all
            </Button>
          </div>
        </div>

        <Card className="dark:border-gray-700 dark:bg-gray-900/40">
          <CardHeader className="border-b dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-lg dark:text-white">
              <Bell className="h-5 w-5" />
              Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="h-14 w-14 mb-3 opacity-20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {rows.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-muted/60 dark:hover:bg-gray-800/60",
                      !notification.read && "bg-blue-50/80 dark:bg-blue-950/20",
                    )}
                  >
                    <div
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => markAsReadAndNavigate(notification)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          void markAsReadAndNavigate(notification)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium dark:text-white">{notification.title}</p>
                          <p
                            className={cn(
                              "text-sm text-muted-foreground",
                              notification.type === CARE_ALLIANCE_INVITATION_TYPE ? "" : "line-clamp-3",
                            )}
                          >
                            {notification.body}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="secondary" className="text-xs font-normal capitalize">
                              {String(notification.type).replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {!notification.read && <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
                      </div>
                    </div>

                    {showCareAllianceActions(notification) && (
                      <div className="mt-3 flex flex-wrap gap-2 pl-0">
                        <Button
                          type="button"
                          size="sm"
                          disabled={careAllianceActionLoadingId === notification.id}
                          onClick={(e) => handleCareAllianceInvitationAction(e, notification, "accept")}
                        >
                          {careAllianceActionLoadingId === notification.id ? "…" : "Accept"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={careAllianceActionLoadingId === notification.id}
                          onClick={(e) => handleCareAllianceInvitationAction(e, notification, "decline")}
                        >
                          Decline
                        </Button>
                      </div>
                    )}

                    {showSupporterBirthdayActions(notification) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const id = notification.meta?.celebrant_id
                            if (id == null) return
                            try {
                              await axios.post(`/notifications/${notification.id}/read`)
                            } catch {
                              toast.error("Could not update notification.")
                              return
                            }
                            router.visit(`/supporters/gift/${id}`)
                          }}
                        >
                          Send Gift
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
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
                  </div>
                ))}
              </div>
            )}

            {notifications && notifications.last_page > 1 && (
              <div className="flex items-center justify-between border-t p-4 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!notifications.prev_page_url}
                  onClick={() => notifications.prev_page_url && router.visit(notifications.prev_page_url)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {notifications.current_page} of {notifications.last_page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!notifications.next_page_url}
                  onClick={() => notifications.next_page_url && router.visit(notifications.next_page_url)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FrontendLayout>
  )
}
