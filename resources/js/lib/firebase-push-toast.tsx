import { UNITY_MEET_INVITATION_TYPE } from "@/lib/notification-map"
import { trackPushNotificationOpen } from "@/lib/push-open-tracker"

export type FirebaseNotificationDetail = {
    title?: string
    body?: string
    data?: Record<string, string | undefined>
}

export function resolvePushTitleBody(detail: FirebaseNotificationDetail): { title: string; body: string } {
    const data = detail.data ?? {}
    const title =
        (detail.title && String(detail.title).trim()) ||
        (data.title && String(data.title).trim()) ||
        "Believe In Unity"
    const body =
        (detail.body && String(detail.body).trim()) ||
        (data.body && String(data.body).trim()) ||
        (data.message && String(data.message).trim()) ||
        ""

    return { title, body }
}

export function resolvePushClickUrl(data: Record<string, string | undefined>): string {
    return data.join_url || data.click_action || data.url || "/"
}

export function resolveAppNotificationIcon(origin?: string): string {
    const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "")
    return base ? new URL("/favicon-96x96.png", base).href : "/favicon-96x96.png"
}

export function resolveNotificationBadge(
    data: Record<string, string | undefined>,
    origin?: string,
): string {
    const orgLogo = data.organization_logo_url?.trim()
    if (orgLogo) {
        try {
            const base = origin ?? (typeof window !== "undefined" ? window.location.origin : undefined)
            return base ? new URL(orgLogo, base).href : orgLogo
        } catch {
            // Fall back to app logo when the organization logo URL is invalid.
        }
    }

    return resolveAppNotificationIcon(origin)
}

export function buildNativeNotificationOptions(
    detail: FirebaseNotificationDetail,
    dedupeTag: string,
): NotificationOptions {
    const { body } = resolvePushTitleBody(detail)
    const data = detail.data ?? {}
    const clickUrl = resolvePushClickUrl(data)
    const icon = resolveAppNotificationIcon()
    const badge = resolveNotificationBadge(data)

    const options: NotificationOptions = {
        body: body || undefined,
        icon,
        badge,
        tag: dedupeTag,
        data: {
            ...data,
            click_action: clickUrl,
            url: clickUrl,
            join_url: data.join_url || clickUrl,
        },
    }

    if (data.type === UNITY_MEET_INVITATION_TYPE) {
        options.actions = [{ action: "join", title: "Join" }]
    }

    return options
}

const recentNativeKeys = new Map<string, number>()
const NATIVE_DEDUPE_MS = 5000

/** Show a native OS / device notification (Windows Action Center, macOS, etc.). */
export async function showNativePushNotification(detail: FirebaseNotificationDetail): Promise<void> {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return
    }

    if (Notification.permission !== "granted") {
        return
    }

    const { title } = resolvePushTitleBody(detail)
    const data = detail.data ?? {}

    const dedupeKey = `${data.type ?? "push"}:${data.livestream_id ?? data.source_id ?? title}`
    const now = Date.now()
    const lastShown = recentNativeKeys.get(dedupeKey)
    if (lastShown !== undefined && now - lastShown < NATIVE_DEDUPE_MS) {
        return
    }
    recentNativeKeys.set(dedupeKey, now)

    const options = buildNativeNotificationOptions(detail, dedupeKey)

    try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
    } catch (err) {
        console.warn("[Push] serviceWorker.showNotification failed, falling back to Notification API", err)
        const clickUrl = resolvePushClickUrl(data)
        const notification = new Notification(title, {
            body: options.body,
            icon: options.icon,
            badge: options.badge,
            tag: dedupeKey,
            data: options.data,
        })
        notification.onclick = () => {
            void trackPushNotificationOpen(data.notification_log_id, data.recipient_id)
            window.focus()
            window.location.href = clickUrl
            notification.close()
        }
    }
}

/** @deprecated Use showNativePushNotification */
export const showFirebasePushToast = showNativePushNotification
