"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { router, usePage } from "@inertiajs/react"
import { WalletPopup } from "@/components/WalletPopup"
import { BridgeVerificationRequiredModal } from "@/components/organization/BridgeVerificationRequiredModal"
import {
  DEFAULT_BRIDGE_VERIFICATION,
  isBridgeVerificationGateActive,
  parseBridgeVerificationStatus,
  type BridgeVerificationState,
} from "@/lib/bridge-verification"

type SharedPageProps = {
  auth?: {
    user?: {
      id?: number
      role?: string
      current_plan_id?: number | null
      organization?: { name?: string } | null
    } | null
    roles?: string[]
  }
  bridgeVerification?: BridgeVerificationState | null
}

function isAllowedPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/care-alliance/dashboard" ||
    pathname === "/plans" ||
    pathname.startsWith("/plans/")
  )
}

function isOnPlansPage(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const pathname = window.location.pathname
  return pathname === "/plans" || pathname.startsWith("/plans/")
}

export function BridgeVerificationGate() {
  const { props } = usePage<SharedPageProps>()
  const auth = props.auth
  const sharedBridge = props.bridgeVerification

  const [bridgeStatus, setBridgeStatus] = useState<BridgeVerificationState>(
    parseBridgeVerificationStatus(sharedBridge ?? DEFAULT_BRIDGE_VERIFICATION),
  )
  const [showModal, setShowModal] = useState(false)
  const [showWalletPopup, setShowWalletPopup] = useState(false)
  const autoPromptedRef = useRef(false)

  const gateActive = isBridgeVerificationGateActive(auth, bridgeStatus)
  const hasSubscription = Boolean(auth?.user?.current_plan_id)
  const organizationName = auth?.user?.organization?.name

  const refreshBridgeStatus = useCallback(async () => {
    try {
      const response = await fetch(`/wallet/bridge/status?t=${Date.now()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        cache: "no-cache",
      })

      const data = response.ok ? await response.json() : null
      setBridgeStatus(parseBridgeVerificationStatus(data))
    } catch {
      setBridgeStatus(DEFAULT_BRIDGE_VERIFICATION)
    }
  }, [])

  useEffect(() => {
    setBridgeStatus(parseBridgeVerificationStatus(sharedBridge ?? DEFAULT_BRIDGE_VERIFICATION))
  }, [sharedBridge])

  useEffect(() => {
    if (!gateActive) {
      setShowModal(false)
      setShowWalletPopup(false)
      autoPromptedRef.current = false
      return
    }

    void refreshBridgeStatus()
  }, [gateActive, auth?.user?.id, refreshBridgeStatus])

  useEffect(() => {
    if (!gateActive || autoPromptedRef.current) {
      return
    }

    autoPromptedRef.current = true

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("verify_bridge") === "1") {
        setShowModal(true)
        setShowWalletPopup(true)
        params.delete("verify_bridge")
        const nextQuery = params.toString()
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
        window.history.replaceState({}, "", nextUrl)
        return
      }
    }

    setShowModal(true)
  }, [gateActive])

  useEffect(() => {
    if (!gateActive) {
      return
    }

    return router.on("before", (event) => {
      if (typeof window === "undefined") {
        return
      }

      let targetPath = window.location.pathname
      try {
        const visitUrl = event.detail.visit.url
        targetPath = new URL(visitUrl, window.location.origin).pathname
      } catch {
        // Keep current path fallback.
      }

      if (isAllowedPath(targetPath)) {
        return
      }

      event.preventDefault()
      setShowModal(true)
    })
  }, [gateActive])

  if (!gateActive || isOnPlansPage()) {
    return null
  }

  return (
    <>
      {!showWalletPopup && (
        <div
          className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      )}

      <BridgeVerificationRequiredModal
        isOpen={showModal && !showWalletPopup}
        blocking
        hasSubscription={hasSubscription}
        bridgeVerification={bridgeStatus}
        onVerify={() => {
          setShowModal(false)
          setShowWalletPopup(true)
        }}
        onManageSubscription={() => router.visit("/plans")}
      />

      <WalletPopup
        isOpen={showWalletPopup}
        onClose={() => {
          setShowWalletPopup(false)
          setShowModal(true)
          void refreshBridgeStatus()
        }}
        organizationName={organizationName}
      />
    </>
  )
}
