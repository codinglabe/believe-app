import { useCallback, useEffect, useRef } from "react"
import { postProximityLocation } from "@/lib/proximity-location-api"
import { requestLocationPermission } from "@/lib/request-location-permission"

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
 * Real-time proximity checks via geolocation watchPosition (no polling interval).
 * Uses the browser's native location permission prompt only.
 */
export function useProximityLocation({ enabled }: UseProximityLocationOptions): void {
  const watchIdRef = useRef<number | null>(null)
  const lastReportedRef = useRef<{ lat: number; lng: number } | null>(null)
  const inFlightRef = useRef(false)
  const permissionRequestedRef = useRef(false)

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

    lastReportedRef.current = null

    watchIdRef.current = navigator.geolocation.watchPosition(
      reportPosition,
      () => {},
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20_000,
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

  const startWatching = useCallback(async () => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return
    }

    if (watchIdRef.current !== null) {
      return
    }

    if (!permissionRequestedRef.current) {
      permissionRequestedRef.current = true

      const result = await requestLocationPermission()

      if (result.status === "granted") {
        lastReportedRef.current = { lat: result.latitude, lng: result.longitude }
        postProximityLocation(result.latitude, result.longitude)
        beginWatch()
        return
      }

      permissionRequestedRef.current = false
      return
    }

    beginWatch()
  }, [enabled, beginWatch])

  useEffect(() => {
    if (!enabled) {
      stopWatching()
      permissionRequestedRef.current = false
      return
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void startWatching()
      } else {
        stopWatching()
      }
    }

    handleVisibility()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      stopWatching()
    }
  }, [enabled, startWatching, stopWatching])
}

export function isProximityEnabledForUser(user: ProximityAuthUser | null | undefined): boolean {
  if (!user?.id) {
    return false
  }

  // On by default; profile toggle opts out.
  return user.proximity_notifications_enabled !== false
}
