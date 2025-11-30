"use client"

import { useEffect, useState } from "react"
import { RefreshCw, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isLivestockDomain } from "@/lib/livestock-domain"

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Don't show PWA update prompt on livestock domain
  if (isLivestockDomain()) {
    return null
  }

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // Check if user has dismissed this update permanently
    const dismissedUpdate = localStorage.getItem("pwaUpdateDismissed")
    if (dismissedUpdate === "true") {
      return
    }

    // Check if "Later" was clicked and the delay hasn't passed yet
    const updateLater = localStorage.getItem("pwaUpdateLater")
    if (updateLater) {
      const dismissedTime = parseInt(updateLater)
      const delayInMs = 30 * 60 * 1000 // 30 minutes
      if (Date.now() - dismissedTime < delayInMs) {
        return
      } else {
        localStorage.removeItem("pwaUpdateLater")
      }
    }

    const handleUpdateFound = (reg: ServiceWorkerRegistration) => {
      const newWorker = reg.installing || reg.waiting

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          console.log("[PWA] Service Worker state:", newWorker.state)

          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New content available, showing update prompt")
            setShowUpdate(true)
            setRegistration(reg)
          }
        })
      }
    }

    // Listen for updates
    navigator.serviceWorker.ready.then((reg) => {
      // Check if there's already a waiting service worker
      if (reg.waiting) {
        console.log("[PWA] Found waiting service worker")
        setShowUpdate(true)
        setRegistration(reg)
        return
      }

      // Listen for new service worker installation
      reg.addEventListener("updatefound", () => {
        console.log("[PWA] Update found, new service worker installing")
        handleUpdateFound(reg)
      })
    })

    // Periodically check for updates (every 5 minutes)
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update().catch(console.error)
      })
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const handleUpdate = async () => {
    if (!registration?.waiting) {
      console.log("[PWA] No waiting service worker found")
      return
    }

    setIsUpdating(true)

    try {
      // Send skip waiting message to the waiting service worker
      registration.waiting.postMessage({ type: "SKIP_WAITING" })

      // Wait for the new service worker to take control
      return new Promise<void>((resolve) => {
        const handleControllerChange = () => {
          console.log("[PWA] Controller changed, reloading page")
          navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
          window.location.reload()
          resolve()
        }

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange)

        // Fallback: reload after 3 seconds if controller doesn't change
        setTimeout(() => {
          console.log("[PWA] Fallback reload")
          navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange)
          window.location.reload()
          resolve()
        }, 3000)
      })
    } catch (error) {
      console.error("[PWA] Update failed:", error)
      // Fallback: simple reload
      window.location.reload()
    } finally {
      setIsUpdating(false)
      setShowUpdate(false)

      // Clear dismissal flags on update
      localStorage.removeItem("pwaUpdateLater")
      localStorage.removeItem("pwaUpdateDismissed")
    }
  }

  const handleDismissLater = () => {
    localStorage.setItem("pwaUpdateLater", Date.now().toString())
    setShowUpdate(false)
  }

  const handleDismissPermanently = () => {
    localStorage.setItem("pwaUpdateDismissed", "true")
    setShowUpdate(false)
  }

  // Don't show if no update available
  if (!showUpdate) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                App Update Available
              </h3>
              <button
                onClick={handleDismissPermanently}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0 ml-2"
                aria-label="Close permanently"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              A new version of the app is available. Update now to get the latest features and improvements.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 gap-2"
                size="sm"
              >
                {isUpdating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isUpdating ? "Updating..." : "Update Now"}
              </Button>

              <Button
                onClick={handleDismissLater}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={isUpdating}
              >
                Later
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-500 mt-3 text-center">
              The app will reload after updating
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
