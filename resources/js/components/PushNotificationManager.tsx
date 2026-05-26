"use client"

import { useEffect, useState } from "react"
import { syncPushTokenWithServer } from "@/lib/push-token-sync"
import { registerServiceWorker } from "@/pwa/register-service-worker"
import { router, usePage } from "@inertiajs/react"
import { Button } from "./ui/button"
import { showNativePushNotification } from "@/lib/firebase-push-toast"

interface PushNotificationManagerProps {
  userId?: number
}

interface Auth {
  user: {
    id: number
    push_token?: string
  }
}

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const { props } = usePage()
  const auth = props.auth as Auth
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth?.user?.push_token) {
      setHasToken(true)
    }
  }, [auth])

  useEffect(() => {
    void registerServiceWorker().then(() => setIsInitialized(true))
  }, [])

  const handleEnablePushNotifications = async () => {
    try {
      setError(null)
      setIsLoading(true)

      const fcmToken = await syncPushTokenWithServer({ prompt: true })

      if (fcmToken && auth?.user?.id) {
        setHasToken(true)
        void showNativePushNotification({
          title: "Notifications enabled",
          body: "You will receive alerts on this device.",
        })
        router.reload({ only: ["auth"] })
      } else {
        setError("Allow notifications in your browser to receive alerts.")
      }
    } catch (err) {
      console.error("[PushNotificationManager] Error enabling notifications:", err)
      setError("Failed to enable push notifications")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isInitialized) {
    return null
  }

  if (hasToken) {
    return null
  }

  return (
    <div className="push-notification-manager shrink-0">
      {error && <div className="text-red-600 text-xs mb-1">{error}</div>}

      <Button
        onClick={handleEnablePushNotifications}
        disabled={isLoading}
        size="sm"
        variant="outline"
      >
        {isLoading ? "Enabling..." : "Enable notifications"}
      </Button>
    </div>
  )
}
