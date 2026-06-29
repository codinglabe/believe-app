import { queryGeolocationPermissionState } from "@/lib/request-location-permission"

export type GeolocationPermissionState = PermissionState | "unsupported"

const DISMISS_UNTIL_KEY = "biu_location_dismissed_until"

export const LOCATION_PERMISSION_GRANTED_EVENT = "biu-location-permission-granted"
export const LOCATION_PERMISSION_REQUEST_EVENT = "biu-location-permission-request"

export type LocationPermissionGrantedDetail = {
  latitude: number
  longitude: number
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation)
}

export async function getGeolocationPermissionState(): Promise<GeolocationPermissionState> {
  if (!isGeolocationSupported()) {
    return "unsupported"
  }

  return queryGeolocationPermissionState()
}

function dismissStorageKey(userId: number): string {
  return `${DISMISS_UNTIL_KEY}_${userId}`
}

export function isLocationPermissionPromptDismissed(userId: number): boolean {
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

export function dismissLocationPermissionPrompt(userId: number, days = 7): void {
  if (typeof localStorage === "undefined") {
    return
  }

  localStorage.setItem(dismissStorageKey(userId), String(Date.now() + days * 86_400_000))
}

export function dispatchLocationPermissionGranted(latitude: number, longitude: number): void {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent<LocationPermissionGrantedDetail>(LOCATION_PERMISSION_GRANTED_EVENT, {
      detail: { latitude, longitude },
    }),
  )
}

export function requestLocationPermissionPrompt(): void {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(new CustomEvent(LOCATION_PERMISSION_REQUEST_EVENT))
}

export function readAuthUserIdFromDom(): number | null {
  if (typeof document === "undefined") {
    return null
  }

  const raw = document.querySelector('meta[name="user-id"]')?.getAttribute("content")
  const id = raw ? Number(raw) : NaN

  return Number.isFinite(id) && id > 0 ? id : null
}

export function readProximityNotificationsEnabledFromDom(): boolean {
  if (typeof document === "undefined") {
    return true
  }

  const raw = document.querySelector('meta[name="proximity-notifications-enabled"]')?.getAttribute("content")

  return raw !== "0"
}
