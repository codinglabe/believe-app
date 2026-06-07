"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell, Mic, Phone, Smartphone, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { isLivestockDomain } from "@/lib/livestock-domain"
import { isMerchantDomain } from "@/lib/merchant-domain"
import {
  CALL_PERMISSIONS_REQUEST_EVENT,
  callNotificationsEnabled,
  canPromptForCallNotifications,
  dismissCallPermissionPrompt,
  getCallNotificationPermission,
  isCallPermissionPromptDismissed,
} from "@/lib/call-permissions"
import { syncPushTokenWithServer } from "@/lib/push-token-sync"
import { registerServiceWorker } from "@/pwa/register-service-worker"

type Props = {
  authUserId: number | null | undefined
}

function readAuthUserId(): number | null {
  if (typeof document === "undefined") {
    return null
  }
  const raw = document.querySelector('meta[name="user-id"]')?.getAttribute("content")
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) && id > 0 ? id : null
}

export default function CallPermissionsPrompt({ authUserId }: Props) {
  const userId = authUserId ?? readAuthUserId()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [permission, setPermission] = useState(getCallNotificationPermission())
  const [error, setError] = useState<string | null>(null)

  const refreshPermission = useCallback(() => {
    setPermission(getCallNotificationPermission())
  }, [])

  const shouldOfferPrompt = useCallback(() => {
    if (!userId || isLivestockDomain() || isMerchantDomain()) {
      return false
    }
    if (callNotificationsEnabled()) {
      return false
    }
    if (isCallPermissionPromptDismissed(userId)) {
      return false
    }
    return permission === "default" || permission === "denied"
  }, [userId, permission])

  useEffect(() => {
    refreshPermission()
    if (shouldOfferPrompt()) {
      setOpen(true)
    }
  }, [refreshPermission, shouldOfferPrompt])

  useEffect(() => {
    const onRequest = () => {
      refreshPermission()
      if (userId && !callNotificationsEnabled()) {
        setOpen(true)
      }
    }
    window.addEventListener(CALL_PERMISSIONS_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(CALL_PERMISSIONS_REQUEST_EVENT, onRequest)
  }, [refreshPermission, userId])

  const handleDismiss = () => {
    if (userId) {
      dismissCallPermissionPrompt(userId)
    }
    setOpen(false)
    setError(null)
  }

  const handleEnableNotifications = async () => {
    setBusy(true)
    setError(null)
    try {
      await registerServiceWorker()
      const token = await syncPushTokenWithServer({ prompt: true, force: true })
      refreshPermission()

      if (token && callNotificationsEnabled()) {
        setOpen(false)
        return
      }

      if (getCallNotificationPermission() === "denied") {
        setError("Notifications are blocked. Enable them in your browser or phone settings for this site.")
        return
      }

      setError("Please allow notifications when your browser asks, so incoming calls can ring.")
    } catch {
      setError("Could not enable notifications. Try again or check browser settings.")
    } finally {
      setBusy(false)
    }
  }

  if (!userId || permission === "unsupported" || permission === "granted") {
    return null
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-labelledby="call-permissions-title"
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
              <Phone className="h-6 w-6" />
            </div>

            <h2 id="call-permissions-title" className="text-lg font-semibold">
              Allow permissions for audio calls
            </h2>
            <p className="mt-2 text-sm text-white/70">
              To show the incoming call screen and ring when someone calls you — even if the app is in the background —
              please allow the permissions below.
            </p>

            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
                <div>
                  <p className="font-medium">Notifications — required</p>
                  <p className="mt-1 text-white/60">
                    Shows the full-screen incoming call UI and plays the ringtone when you are not actively using the app.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <Mic className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                <div>
                  <p className="font-medium">Microphone — when you answer</p>
                  <p className="mt-1 text-white/60">
                    Your browser will ask for microphone access when you tap Accept on a call.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
                <div>
                  <p className="font-medium">Install app — recommended on phone</p>
                  <p className="mt-1 text-white/60">
                    Add Believe In Unity to your home screen for the best full-screen incoming call experience.
                  </p>
                </div>
              </li>
            </ul>

            {error ? <p className="mt-4 text-sm text-amber-200">{error}</p> : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {canPromptForCallNotifications() ? (
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={busy}
                  onClick={() => void handleEnableNotifications()}
                >
                  {busy ? "Enabling…" : "Enable notifications"}
                </Button>
              ) : (
                <p className="flex-1 text-sm text-white/70">
                  Notifications are blocked. Open your browser settings, find this website, and allow notifications.
                </p>
              )}
              <Button type="button" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" onClick={handleDismiss}>
                Not now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
