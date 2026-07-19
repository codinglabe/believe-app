export const CARE_ALLIANCE_INVITATION_TYPE = "care_alliance_invitation"
export const SUPPORTER_BIRTHDAY_TYPE = "supporter_birthday"
export const BELIEVE_POINTS_GIFT_RECEIVED_TYPE = "gift_received"
export const BELIEVE_POINTS_GIFT_SENT_TYPE = "gift_sent"
export const BELIEVE_POINTS_GIFT_INVITE_PENDING_TYPE = "gift_invite_pending"
export const BELIEVE_POINTS_GIFT_INVITE_CLAIMED_TYPE = "gift_invite_claimed"
export const BELIEVE_POINTS_GIFT_INVITE_EXPIRED_TYPE = "gift_invite_expired"
export const BELIEVE_POINTS_GIFT_INVITE_CANCELLED_TYPE = "gift_invite_cancelled"
export const BELIEVE_POINTS_GIFT_INVITE_EMAIL_CHANGED_TYPE = "gift_invite_email_changed"
export const BELIEVE_POINTS_GIFT_INVITE_RESENT_TYPE = "gift_invite_resent"
export const BELIEVE_POINTS_GIFT_INVITE_CANCELLATION_BRP_TYPE = "gift_invite_cancellation_brp"
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
  /** Short "Sent by …" line for org/person who created the notification. */
  senderLabel?: string | null
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
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftSent") || rawType === "gift_sent")
          ? BELIEVE_POINTS_GIFT_SENT_TYPE
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftInvitePending") || rawType === "gift_invite_pending")
          ? BELIEVE_POINTS_GIFT_INVITE_PENDING_TYPE
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftClaimed") || rawType === "gift_invite_claimed")
          ? BELIEVE_POINTS_GIFT_INVITE_CLAIMED_TYPE
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftRefunded") || rawType === "gift_invite_expired")
          ? BELIEVE_POINTS_GIFT_INVITE_EXPIRED_TYPE
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftInviteCancelled") || rawType === "gift_invite_cancelled")
          ? BELIEVE_POINTS_GIFT_INVITE_CANCELLED_TYPE
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftInviteEmailChanged") || rawType === "gift_invite_email_changed")
          ? BELIEVE_POINTS_GIFT_INVITE_EMAIL_CHANGED_TYPE
        : typeof rawType === "string" && (rawType.includes("BelievePointGiftInviteResent") || rawType === "gift_invite_resent")
          ? BELIEVE_POINTS_GIFT_INVITE_RESENT_TYPE
        : typeof rawType === "string" && rawType === "gift_invite_cancellation_brp"
          ? BELIEVE_POINTS_GIFT_INVITE_CANCELLATION_BRP_TYPE
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

  const organizationName =
    pickNonEmptyString(notificationData.organization_name) ||
    pickNonEmptyString(notificationData.meta?.organization_name) ||
    null
  const organizationId =
    notificationData.organization_id ?? notificationData.meta?.organization_id ?? null
  const creatorName =
    pickNonEmptyString(notificationData.creator_name) ||
    pickNonEmptyString(notificationData.meta?.creator_name) ||
    null

  const meta: Record<string, any> = {
    ...(notificationData.meta || {}),
    ...(invitationId != null ? { invitation_id: invitationId } : {}),
    ...(joinUrl ? { join_url: joinUrl } : {}),
    ...(successUrl ? { success_url: successUrl } : {}),
    ...(donationsUrl ? { donations_url: donationsUrl } : {}),
    ...(organizationId != null ? { organization_id: organizationId } : {}),
    ...(organizationName ? { organization_name: organizationName } : {}),
    ...(creatorName ? { creator_name: creatorName } : {}),
    ...(pickNonEmptyString(notificationData.host_name)
      ? { host_name: pickNonEmptyString(notificationData.host_name) }
      : {}),
    ...(pickNonEmptyString(notificationData.inviter_label)
      ? { inviter_label: pickNonEmptyString(notificationData.inviter_label) }
      : {}),
  }

  const mapped: Notification = {
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
  mapped.senderLabel = notificationSenderLabel(mapped, notificationData)

  return mapped
}

function pickNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Types where "Sent by …" would be wrong or redundant:
 * - recipient/system alerts (donation received, confirmations, rewards)
 * - body already names the actor (donor, celebrant, etc.)
 */
function shouldHideSenderLabel(type: string): boolean {
  const t = type.toLowerCase()
  if (
    t === DONATION_RECEIVED_TYPE ||
    t === DONATION_CONFIRMED_TYPE ||
    t === SUPPORTER_BIRTHDAY_TYPE ||
    t.includes("DonationReceived") ||
    t.includes("DonationConfirmed") ||
    t.includes("ManualDonation") ||
    t.includes("manual_donation") ||
    t.includes("participation") ||
    t.includes("daily_engagement") ||
    t.includes("gift_card") ||
    t.includes("brp_reward") ||
    t.includes("believe_point_purchase")
  ) {
    return true
  }
  return false
}

/**
 * True when this notification was authored/sent by an org (campaign, course, invite, etc.).
 * Not when the org is merely the recipient of an action.
 */
function shouldPreferOrganizationSender(type: string): boolean {
  const t = type.toLowerCase()
  return (
    t === "prayer" ||
    t === "devotional" ||
    t === "scripture" ||
    t === "campaign" ||
    t.includes("dailyprayer") ||
    t === CARE_ALLIANCE_INVITATION_TYPE ||
    t.includes("care_alliance") ||
    t.includes("course") ||
    t.includes("job") ||
    t.includes("event") ||
    t.includes("newsletter")
  )
}

/**
 * Short "Sent by …" line only when an external org/person authored the notification.
 * Skips recipient/system types (e.g. donation received → your own org is not the sender).
 */
export function notificationSenderLabel(
  notification: Notification,
  rawPayload?: Record<string, any>,
): string | null {
  if (shouldHideSenderLabel(notification.type)) {
    return null
  }

  const meta = notification.meta || {}
  const payload = rawPayload || {}
  const type = notification.type

  // Org-authored content (prayer campaigns, courses, alliance invites, …)
  if (shouldPreferOrganizationSender(type)) {
    const organizationName =
      pickNonEmptyString(meta.organization_name) ||
      pickNonEmptyString(payload.organization_name)
    if (organizationName) {
      return `Sent by ${organizationName}`
    }
  }

  // Person-authored (gifts, Unity Meet host, inviter) — never donor_name (already in body)
  const personName =
    pickNonEmptyString(meta.sender_name) ||
    pickNonEmptyString(payload.host_name) ||
    pickNonEmptyString(meta.host_name) ||
    pickNonEmptyString(payload.inviter_label) ||
    pickNonEmptyString(meta.inviter_label) ||
    pickNonEmptyString(meta.creator_name) ||
    pickNonEmptyString(payload.creator_name)

  if (personName) {
    return `Sent by ${personName}`
  }

  // Fallback: org name only for org-authored types already handled above;
  // for unknown types, show org if present (campaign-like payloads).
  const organizationName =
    pickNonEmptyString(meta.organization_name) ||
    pickNonEmptyString(payload.organization_name)
  if (organizationName && shouldPreferOrganizationSender(type)) {
    return `Sent by ${organizationName}`
  }

  return null
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

/** Navigate when a gift-card in-app notification is opened. */
export function giftCardNotificationTarget(notification: Notification): string | null {
  const type = (notification.type || "").toLowerCase()
  if (!type.includes("gift_card")) {
    return null
  }

  if (typeof notification.meta?.gift_card_url === "string" && notification.meta.gift_card_url) {
    return notification.meta.gift_card_url
  }

  if (notification.meta?.gift_card_id != null) {
    return route("gift-cards.show.id", notification.meta.gift_card_id)
  }

  return route("gift-cards.my-cards")
}
