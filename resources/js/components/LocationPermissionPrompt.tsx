"use client"

import { useCallback, useEffect, useState } from "react"
import { MapPin, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { router, type GlobalEvent } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { isLivestockDomain } from "@/lib/livestock-domain"
import { isMerchantDomain } from "@/lib/merchant-domain"
import {
  dismissLocationPermissionPrompt,
  dispatchLocationPermissionGranted,
  getGeolocationPermissionState,
  isGeolocationSupported,
  isLocationPermissionPromptDismissed,
  LOCATION_PERMISSION_REQUEST_EVENT,
  readAuthUserIdFromDom,
  readProximityNotificationsEnabledFromDom,
  type GeolocationPermissionState,
} from "@/lib/location-permissions"
import { postProximityLocation } from "@/lib/proximity-location-api"
import { requestLocationPermission } from "@/lib/request-location-permission"

type AuthUser = {
  id?: number
  proximity_notifications_enabled?: boolean
}

type PageAuthProps = {
  auth?: {
    user?: AuthUser | null
  }
}

function readAuthFromPageProps(props?: PageAuthProps): { userId: number | null; proximityEnabled: boolean } {
  const user = props?.auth?.user
  if (user?.id) {
    return {
      userId: user.id,
      proximityEnabled: user.proximity_notifications_enabled !== false,
    }
  }

  return {
    userId: readAuthUserIdFromDom(),
    proximityEnabled: readProximityNotificationsEnabledFromDom(),
  }
}

function syncAuthMeta(userId: number | null, proximityEnabled: boolean): void {
  if (typeof document === "undefined") {
    return
  }

  const userMeta = document.querySelector('meta[name="user-id"]')
  const proximityMeta = document.querySelector('meta[name="proximity-notifications-enabled"]')

  if (userId) {
    if (userMeta) {
      userMeta.setAttribute("content", String(userId))
    }
    if (proximityMeta) {
      proximityMeta.setAttribute("content", proximityEnabled ? "1" : "0")
    }
  }
}

export default function LocationPermissionPrompt() {
  const [userId, setUserId] = useState<number | null>(() => readAuthFromPageProps().userId)
  const [proximityEnabled, setProximityEnabled] = useState(
    () => readAuthFromPageProps().proximityEnabled,
  )
  const [permission, setPermission] = useState<GeolocationPermissionState>("prompt")
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshAuth = useCallback((props?: PageAuthProps) => {
    const next = readAuthFromPageProps(props)
    setUserId(next.userId)
    setProximityEnabled(next.proximityEnabled)
    syncAuthMeta(next.userId, next.proximityEnabled)
  }, [])

  const refreshPermission = useCallback(async () => {
    const state = await getGeolocationPermissionState()
    setPermission(state)

    if (state === "granted") {
      setOpen(false)
    }
  }, [])

  const shouldOfferPrompt = useCallback(async () => {
    if (!userId || !proximityEnabled) {
      return false
    }
    if (isLivestockDomain() || isMerchantDomain()) {
      return false
    }
    if (!isGeolocationSupported()) {
      return false
    }
    if (isLocationPermissionPromptDismissed(userId)) {
      return false
    }

    const state = await getGeolocationPermissionState()
    setPermission(state)

    return state === "prompt" || state === "unsupported"
  }, [userId, proximityEnabled])

  const evaluatePrompt = useCallback(
    async (props?: PageAuthProps) => {
      refreshAuth(props)
      await refreshPermission()

      if (await shouldOfferPrompt()) {
        setOpen(true)
      }
    },
    [refreshAuth, refreshPermission, shouldOfferPrompt],
  )

  useEffect(() => {
    void evaluatePrompt()
  }, [evaluatePrompt])

  useEffect(() => {
    const onNavigate = (event: GlobalEvent<"success">) => {
      const props = event.detail.page?.props as PageAuthProps | undefined
      void evaluatePrompt(props)
    }

    return router.on("success", onNavigate)
  }, [evaluatePrompt])

  useEffect(() => {
    const onRequest = () => {
      void evaluatePrompt().then(() => setOpen(true))
    }

    window.addEventListener(LOCATION_PERMISSION_REQUEST_EVENT, onRequest)

    return () => window.removeEventListener(LOCATION_PERMISSION_REQUEST_EVENT, onRequest)
  }, [evaluatePrompt])

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return
    }

    let cancelled = false
    let permissionStatus: PermissionStatus | null = null

    const onChange = () => {
      if (!permissionStatus) {
        return
      }

      void refreshPermission()
      if (permissionStatus.state === "granted") {
        void requestLocationPermission().then((result) => {
          if (result.status === "granted") {
            postProximityLocation(result.latitude, result.longitude)
            dispatchLocationPermissionGranted(result.latitude, result.longitude)
          }
        })
      }
    }

    void navigator.permissions.query({ name: "geolocation" }).then((status) => {
      if (cancelled) {
        return
      }

      permissionStatus = status
      status.addEventListener("change", onChange)
    })

    return () => {
      cancelled = true
      permissionStatus?.removeEventListener("change", onChange)
    }
  }, [refreshPermission])

  const handleDismiss = () => {
    if (userId) {
      dismissLocationPermissionPrompt(userId)
    }
    setOpen(false)
    setError(null)
  }

  const handleAllowLocation = async () => {
    setBusy(true)
    setError(null)

    try {
      const result = await requestLocationPermission()

      if (result.status === "granted") {
        postProximityLocation(result.latitude, result.longitude)
        dispatchLocationPermissionGranted(result.latitude, result.longitude)
        setPermission("granted")
        setOpen(false)
        return
      }

      if (result.status === "denied") {
        setPermission("denied")
        setError(
          "Location access was blocked. Open your browser or phone settings, find this site, and allow location — especially if you installed the app to your home screen.",
        )
        return
      }

      setError(result.message)
    } catch {
      setError("Could not request location. Tap Allow when your browser asks, then try again.")
    } finally {
      setBusy(false)
      void refreshPermission()
    }
  }

  if (!userId || !proximityEnabled || !isGeolocationSupported() || permission === "granted") {
    return null
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-labelledby="location-permissions-title"
          aria-modal="true"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-purple-950 via-[#120818] to-blue-950 p-6 text-white shadow-2xl"
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Close"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600">
              <MapPin className="h-6 w-6" />
            </div>

            <h2 id="location-permissions-title" className="text-lg font-semibold">
              Allow location for nearby alerts
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Believe In Unity can notify you when organizations you follow are nearby. Your location is only used for
              these alerts and is not shared publicly.
            </p>
            <p className="mt-2 text-xs text-white/50">
              If you installed the app, tap the button below — your phone will ask for permission.
            </p>

            {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {permission !== "denied" ? (
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={busy}
                  onClick={() => void handleAllowLocation()}
                >
                  {busy ? "Requesting…" : "Allow location"}
                </Button>
              ) : (
                <p className="flex-1 text-sm text-white/70">
                  Location is blocked in settings. Enable it for this website, then reload the page.
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                className="text-white/70 hover:bg-white/10 hover:text-white"
                onClick={handleDismiss}
              >
                Not now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
