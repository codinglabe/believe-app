import { useCallback, useEffect, useRef } from "react"
import {
  getGeolocationPermissionState,
  LOCATION_PERMISSION_GRANTED_EVENT,
  type LocationPermissionGrantedDetail,
} from "@/lib/location-permissions"
import { postProximityLocation } from "@/lib/proximity-location-api"

/** Minimum movement (meters) before re-reporting — filters GPS jitter, not a time interval. */
const MIN_MOVEMENT_METERS = 25

type ProximityAuthUser = {
  id?: number
  proximity_notifications_enabled?: boolean
}

type UseProximityLocationOptions = {
  enabled: boolean
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusM = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Real-time proximity checks via geolocation watchPosition after permission is granted.
 * The native prompt is triggered from LocationPermissionPrompt (user gesture — required for PWA / iOS).
 */
export function useProximityLocation({ enabled }: UseProximityLocationOptions): void {
  const watchIdRef = useRef<number | null>(null)
  const lastReportedRef = useRef<{ lat: number; lng: number } | null>(null)
  const inFlightRef = useRef(false)

  const reportPosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords

    const last = lastReportedRef.current
    if (last !== null && haversineMeters(last.lat, last.lng, latitude, longitude) < MIN_MOVEMENT_METERS) {
      return
    }

    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true
    lastReportedRef.current = { lat: latitude, lng: longitude }

    postProximityLocation(latitude, longitude)

    window.setTimeout(() => {
      inFlightRef.current = false
    }, 500)
  }, [])

  const beginWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || watchIdRef.current !== null) {
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      reportPosition,
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 30_000,
      },
    )
  }, [reportPosition])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    lastReportedRef.current = null
  }, [])

  const startIfGranted = useCallback(async () => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return
    }

    if (watchIdRef.current !== null) {
      return
    }

    const permission = await getGeolocationPermissionState()
    if (permission !== "granted") {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastReportedRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        postProximityLocation(position.coords.latitude, position.coords.longitude)
        beginWatch()
      },
      () => {
        beginWatch()
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 30_000,
      },
    )
  }, [enabled, beginWatch])

  useEffect(() => {
    if (!enabled) {
      stopWatching()
      return
    }

    const onGranted = (event: Event) => {
      const detail = (event as CustomEvent<LocationPermissionGrantedDetail>).detail
      if (detail?.latitude != null && detail?.longitude != null) {
        lastReportedRef.current = { lat: detail.latitude, lng: detail.longitude }
      }
      beginWatch()
    }

    window.addEventListener(LOCATION_PERMISSION_GRANTED_EVENT, onGranted)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void startIfGranted()
      } else {
        stopWatching()
      }
    }

    handleVisibility()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener(LOCATION_PERMISSION_GRANTED_EVENT, onGranted)
      document.removeEventListener("visibilitychange", handleVisibility)
      stopWatching()
    }
  }, [enabled, startIfGranted, stopWatching, beginWatch])
}

export function isProximityEnabledForUser(user: ProximityAuthUser | null | undefined): boolean {
  if (!user?.id) {
    return false
  }

  // On by default; profile toggle opts out.
  return user.proximity_notifications_enabled !== false
}
