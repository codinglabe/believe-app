import { isPushCapableBrowser } from "@/lib/push-environment"

const DISMISS_UNTIL_KEY = "biu_call_notify_dismissed_until"

export type CallNotificationPermission = "unsupported" | "default" | "granted" | "denied"

export function getCallNotificationPermission(): CallNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }
  return Notification.permission as CallNotificationPermission
}

export function canPromptForCallNotifications(): boolean {
  return isPushCapableBrowser() && getCallNotificationPermission() === "default"
}

export function callNotificationsEnabled(): boolean {
  return getCallNotificationPermission() === "granted"
}

function dismissStorageKey(userId: number): string {
  return `${DISMISS_UNTIL_KEY}_${userId}`
}

export function isCallPermissionPromptDismissed(userId: number): boolean {
  if (typeof localStorage === "undefined") {
    return false
  }
  const raw = localStorage.getItem(dismissStorageKey(userId))
  if (!raw) {
    return false
  }
  const until = Number(raw)
  if (!Number.isFinite(until) || Date.now() >= until) {
    localStorage.removeItem(dismissStorageKey(userId))
    return false
  }
  return true
}

export function dismissCallPermissionPrompt(userId: number, days = 7): void {
  if (typeof localStorage === "undefined") {
    return
  }
  localStorage.setItem(dismissStorageKey(userId), String(Date.now() + days * 86_400_000))
}

export const CALL_PERMISSIONS_REQUEST_EVENT = "unity-call-request-permissions"

export function requestCallPermissionsPrompt(): void {
  if (typeof window === "undefined") {
    return
  }
  window.dispatchEvent(new CustomEvent(CALL_PERMISSIONS_REQUEST_EVENT))
}
