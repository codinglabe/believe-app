export const CARE_ALLIANCE_INVITATION_TYPE = "care_alliance_invitation"
export const SUPPORTER_BIRTHDAY_TYPE = "supporter_birthday"
export const BELIEVE_POINTS_GIFT_RECEIVED_TYPE = "believe_points_gift_received"

export interface Notification {
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

/** Row from /notifications/api (snake_case; some stacks may camelCase JSON). */
export interface DatabaseNotification {
  id: string
  type: string
  notifiable_type?: string
  notifiable_id?: number
  data: string | Record<string, unknown>
  read_at?: string | null
  created_at?: string
  updated_at?: string
  readAt?: string | null
  createdAt?: string
}

export function parseNotificationPayload(data: unknown): Record<string, any> {
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

/** Maps API / DB notification row to UI shape. */
export function mapDatabaseNotification(dbNotif: DatabaseNotification): Notification {
  const notificationData = parseNotificationPayload(dbNotif.data)
  const readAt = dbNotif.read_at ?? dbNotif.readAt ?? null
  const createdAt = dbNotif.created_at ?? dbNotif.createdAt ?? ""
  const rawType = notificationData.type || dbNotif.type || "notification"
  const type =
    typeof rawType === "string" && rawType.includes("SupporterBirthdayNotification")
      ? SUPPORTER_BIRTHDAY_TYPE
      : typeof rawType === "string" && rawType.includes("BelievePointGiftReceived")
        ? BELIEVE_POINTS_GIFT_RECEIVED_TYPE
        : rawType
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
    timestamp: createdAt,
    read: !!readAt,
  }
}
