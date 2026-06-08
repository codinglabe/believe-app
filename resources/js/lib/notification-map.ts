export const CARE_ALLIANCE_INVITATION_TYPE = "care_alliance_invitation"
export const SUPPORTER_BIRTHDAY_TYPE = "supporter_birthday"
export const BELIEVE_POINTS_GIFT_RECEIVED_TYPE = "gift_received"
export const UNITY_MEET_INVITATION_TYPE = "unity_meet_invitation"
export const DONATION_CONFIRMED_TYPE = "donation_confirmed"
export const DONATION_RECEIVED_TYPE = "donation_received"
export const INCOMING_CALL_TYPE = "incoming_call"

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
      : typeof rawType === "string" && (rawType.includes("BelievePointGiftReceived") || rawType === "gift_received" || rawType === "believe_points_gift_received")
        ? BELIEVE_POINTS_GIFT_RECEIVED_TYPE
        : typeof rawType === "string" && (rawType.includes("DonationConfirmedForDonor") || rawType === DONATION_CONFIRMED_TYPE)
          ? DONATION_CONFIRMED_TYPE
          : typeof rawType === "string" && (rawType.includes("DonationReceivedForOrganization") || rawType === DONATION_RECEIVED_TYPE)
            ? DONATION_RECEIVED_TYPE
            : rawType
  const title =
    notificationData.title ||
    (type === CARE_ALLIANCE_INVITATION_TYPE ? "Unity Impact Alliance invitation" : "Notification")
  const body = notificationData.body || notificationData.message || ""
  const invitationId = notificationData.invitation_id ?? notificationData.meta?.invitation_id
  const joinUrl =
    notificationData.meta?.join_url ??
    notificationData.url ??
    notificationData.click_action ??
    null
  const successUrl =
    notificationData.meta?.success_url ??
    (type === DONATION_CONFIRMED_TYPE ? notificationData.url ?? notificationData.click_action : null) ??
    null
  const donationsUrl =
    notificationData.meta?.donations_url ??
    (type === DONATION_RECEIVED_TYPE ? notificationData.url ?? notificationData.click_action : null) ??
    null

  const meta: Record<string, any> = {
    ...(notificationData.meta || {}),
    ...(invitationId != null ? { invitation_id: invitationId } : {}),
    ...(joinUrl ? { join_url: joinUrl } : {}),
    ...(successUrl ? { success_url: successUrl } : {}),
    ...(donationsUrl ? { donations_url: donationsUrl } : {}),
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

/** Navigate when a donation in-app notification is opened. */
export function donationNotificationTarget(notification: Notification): string | null {
  if (notification.type === DONATION_CONFIRMED_TYPE) {
    if (typeof notification.meta?.success_url === "string") {
      return notification.meta.success_url
    }
    if (notification.meta?.donation_id != null) {
      return `${route("donations.success")}?donation_id=${notification.meta.donation_id}`
    }
    return route("profile.donations")
  }

  if (notification.type === DONATION_RECEIVED_TYPE) {
    if (typeof notification.meta?.donations_url === "string") {
      return notification.meta.donations_url
    }
    return route("donations.index")
  }

  return null
}
