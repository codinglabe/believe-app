"use client"

import { useEffect, useState } from "react"
import { RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"

// Simple version tracking - you can update this manually
const APP_VERSION = "1.1.0"

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // Check if user has dismissed this specific version
    const dismissedVersion = localStorage.getItem("pwaUpdateDismissedVersion")
    if (dismissedVersion === APP_VERSION) {
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

    const handleServiceWorkerUpdate = (reg: ServiceWorkerRegistration) => {
      const newWorker = reg.installing || reg.waiting

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New service worker available")
            setShowUpdate(true)
            setRegistration(reg)
          }
        })
      }
    }

    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener("updatefound", () => {
        handleServiceWorkerUpdate(reg)
      })
    })

    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update()
      })
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const handleUpdate = () => {
    if (!registration?.waiting) return

    registration.waiting.postMessage({ type: "SKIP_WAITING" })

    // Clear dismissal flags
    localStorage.removeItem("pwaUpdateLater")
    localStorage.removeItem("pwaUpdateDismissedVersion")

    let refreshing = false
    navigator.serviceWorker.oncontrollerchange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    setShowUpdate(false)
  }

  const handleDismissLater = () => {
    localStorage.setItem("pwaUpdateLater", Date.now().toString())
    setShowUpdate(false)
  }

  const handleDismissPermanently = () => {
    // Store dismissal for this specific version
    localStorage.setItem("pwaUpdateDismissedVersion", APP_VERSION)
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">New Version Available</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tap to update the app and get the latest features.
            </p>
          </div>
          <button
            onClick={handleDismissPermanently}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            aria-label="Close permanently"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleUpdate} size="sm" className="flex-1 gap-2">
            <RefreshCw className="w-4 h-4" />
            Update Now
          </Button>
          <Button
            onClick={handleDismissLater}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
