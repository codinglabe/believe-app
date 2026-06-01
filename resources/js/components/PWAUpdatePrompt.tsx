"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isLivestockDomain } from "@/lib/livestock-domain"
import {
  activateWaitingServiceWorker,
  fetchServerAppVersion,
  initStoredAppVersion,
  markPwaUpdateComplete,
  reloadForPwaUpdate,
  runPwaUpdateCheck,
  silentlyActivateIfAcknowledged,
  startPwaUpdateListeners,
} from "@/lib/pwa-update"
import { registerServiceWorker } from "@/pwa/register-service-worker"

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const checkForPendingDeploy = useCallback(async () => {
    const { updateAvailable } = await runPwaUpdateCheck()
    setShowUpdate(updateAvailable)
  }, [])

  useEffect(() => {
    if (isLivestockDomain() || !("serviceWorker" in navigator) || import.meta.env.DEV) {
      return
    }

    initStoredAppVersion()

    void registerServiceWorker().then(async () => {
      await silentlyActivateIfAcknowledged()
      await checkForPendingDeploy()
    })

    const stopListeners = startPwaUpdateListeners(() => {
      void checkForPendingDeploy()
    })

    return () => {
      stopListeners()
    }
  }, [checkForPendingDeploy])

  const handleUpdate = async () => {
    setIsUpdating(true)

    try {
      const server = await fetchServerAppVersion()
      if (server?.version) {
        markPwaUpdateComplete(server.version)
      }

      const reg = await navigator.serviceWorker.getRegistration("/")
      if (reg?.waiting) {
        await activateWaitingServiceWorker(reg)
      } else if (reg) {
        await reg.update().catch(console.error)
        if (reg.waiting) {
          await activateWaitingServiceWorker(reg)
        }
      }

      reloadForPwaUpdate()
    } catch (error) {
      console.error("[PWA] Update failed:", error)
      const server = await fetchServerAppVersion()
      markPwaUpdateComplete(server?.version ?? null)
      reloadForPwaUpdate()
    }
  }

  if (isLivestockDomain() || !showUpdate) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950 dark:to-blue-950">
            <RefreshCw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              New Update Available
            </h3>

            <p className="mb-5 text-sm text-slate-600 dark:text-slate-400">
              A new version of Believe In Unity is ready. Tap reload to update instantly without reinstalling the app.
            </p>

            <Button
              type="button"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
              {isUpdating ? "Updating..." : "Reload Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
