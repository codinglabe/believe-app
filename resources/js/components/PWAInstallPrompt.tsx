"use client"

import { useEffect, useState } from "react"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Check if user has dismissed the prompt permanently
    const isDismissedPermanently = localStorage.getItem("pwaPromptDismissed") === "true"
    if (isDismissedPermanently) {
      return
    }

    // Check if "Later" was clicked and 1 day hasn't passed yet
    const laterDismissed = localStorage.getItem("pwaPromptLater")
    if (laterDismissed) {
      const dismissedTime = parseInt(laterDismissed)
      const oneDayInMs = 24 * 60 * 60 * 1000 // 1 day in milliseconds
      if (Date.now() - dismissedTime < oneDayInMs) {
        return
      } else {
        // Remove the "later" flag if it's been more than 1 day
        localStorage.removeItem("pwaPromptLater")
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      console.log("[PWA] App installed successfully")
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      // Clear any dismissal flags when app is installed
      localStorage.removeItem("pwaPromptDismissed")
      localStorage.removeItem("pwaPromptLater")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("[PWA] User accepted installation")
        setIsInstalled(true)
        // Clear dismissal flags when user installs
        localStorage.removeItem("pwaPromptDismissed")
        localStorage.removeItem("pwaPromptLater")
      } else {
        console.log("[PWA] User dismissed installation")
      }

      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (error) {
      console.error("[PWA] Installation error:", error)
    }
  }

  const handleDismissLater = () => {
    // Store current time for "Later" dismissal (show again after 1 day)
    localStorage.setItem("pwaPromptLater", Date.now().toString())
    setShowPrompt(false)
  }

  const handleDismissPermanently = () => {
    // Store permanent dismissal flag
    localStorage.setItem("pwaPromptDismissed", "true")
    setShowPrompt(false)
  }

  if (isInstalled || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Install App</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Add this app to your home screen for quick access.
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
          <Button onClick={handleInstall} size="sm" className="flex-1 gap-2">
            <Download className="w-4 h-4" />
            Install
          </Button>
          <Button
            onClick={handleDismissLater}
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
