"use client"

import { useEffect, useState } from "react"
import { initializeMessaging, requestNotificationPermission } from "@/lib/firebase"
import axios from "axios"
import { usePage } from "@inertiajs/react"
import { Button } from "./frontend/ui/button"

interface PushNotificationManagerProps {
  userId?: number
}

interface Auth {
  user: {
    id: number
    push_token?: string // Add this field to your user model
  }
}

export function PushNotificationManager({ userId }: PushNotificationManagerProps) {
  const { props } = usePage()
  const auth = props.auth as Auth
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasToken, setHasToken] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function getDeviceInfo() {
        return {
            device_id: localStorage.getItem('device_id') || generateDeviceId(),
            device_type: 'web',
            device_name: navigator.userAgent,
            browser: navigator.userAgentData?.brands?.[0]?.brand || 'Unknown',
            platform: navigator.platform,
            user_agent: navigator.userAgent
        };
    }

    function generateDeviceId() {
        const deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
        return deviceId;
    }

  // Initialize from server data
  useEffect(() => {
    if (auth?.user?.push_token) {
      setHasToken(true)
    }
  }, [auth])

  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        await initializeMessaging()
        setIsInitialized(true)

        // Listen for firebase notifications in foreground
        window.addEventListener("firebase-notification", (event: any) => {
          console.log("[PushNotificationManager] Received notification:", event.detail)
        })
      } catch (err) {
        console.error("[PushNotificationManager] Initialization error:", err)
        setError("Failed to initialize push notifications")
      }
    }

    initializePushNotifications()

    return () => {
      window.removeEventListener("firebase-notification", () => {})
    }
  }, [])

  const handleEnablePushNotifications = async () => {
    try {
      setError(null)
      setIsLoading(true)

      // Request permission and get token
        const fcmToken = await requestNotificationPermission()
        const deviceInfo = getDeviceInfo();

      if (fcmToken) {
        // Send token to backend
        if (auth?.user?.id) {
          await axios.post("/push-token", {
              token: fcmToken,
               device_info: deviceInfo
          })

          // Update local state immediately
          setHasToken(true)
          console.log("[PushNotificationManager] Token saved to backend")
        }
      } else {
        setError("Failed to get notification permission")
      }
    } catch (err) {
      console.error("[PushNotificationManager] Error enabling notifications:", err)
      setError("Failed to enable push notifications")
    } finally {
      setIsLoading(false)
    }
  }

//   const handleDisablePushNotifications = async () => {
//     try {
//       setError(null)
//       setIsLoading(true)

//       // Remove token from backend
//       if (auth?.user?.id) {
//         await axios.delete("/push-token")

//         // Update local state immediately
//         setHasToken(false)
//         console.log("[PushNotificationManager] Push notifications disabled")
//       }
//     } catch (err) {
//       console.error("[PushNotificationManager] Error disabling notifications:", err)
//       setError("Failed to disable push notifications")
//     } finally {
//       setIsLoading(false)
//     }
//   }

  if (!isInitialized) {
    return null
  }

  return (
    <div className="push-notification-manager">
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      {!hasToken ? (
        <Button
          onClick={handleEnablePushNotifications}
          disabled={isLoading}
          className="bg-transparent border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
        >
          {isLoading ? "Enabling..." : "Enable Notifications"}
        </Button>
      ) : (
        <Button
          onClick={handleDisablePushNotifications}
          disabled={isLoading}
          className="bg-transparent border-white/30 text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-105"
        >
          {isLoading ? "Disabling..." : "Disable Notifications"}
        </Button>
      )}
    </div>
  )
}
