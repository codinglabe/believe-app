"use client"

import { ArrowRight, Shield, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BridgeVerificationState } from "@/lib/bridge-verification"

function isApproved(status: string): boolean {
  return status === "approved" || status === "verified"
}

function statusLabel(bridgeVerification: BridgeVerificationState): string {
  const { kyb_status, kyc_status } = bridgeVerification
  if (
    ["rejected", "paused", "offboarded"].includes(kyb_status) ||
    ["rejected", "paused", "offboarded"].includes(kyc_status)
  ) {
    return "Needs attention"
  }
  if (
    ["under_review", "awaiting_questionnaire", "awaiting_ubo", "incomplete"].includes(kyb_status) ||
    ["under_review", "awaiting_questionnaire", "awaiting_ubo", "incomplete"].includes(kyc_status)
  ) {
    return "In progress"
  }
  if (isApproved(kyb_status) && !isApproved(kyc_status)) {
    return "KYC required"
  }
  return "Required"
}

function statusMessage(hasSubscription: boolean, bridgeVerification: BridgeVerificationState): string {
  if (!hasSubscription) {
    return "Subscribe to unlock your nonprofit wallet, then complete Bridge business verification and identity (KYC) to receive donations and manage payouts."
  }

  const { kyb_status, kyc_status } = bridgeVerification

  if (isApproved(kyb_status) && !isApproved(kyc_status)) {
    return "Business details are in progress. Complete control-person identity verification (KYC) in Bridge to finish wallet setup."
  }

  switch (kyb_status) {
    case "under_review":
    case "awaiting_questionnaire":
    case "awaiting_ubo":
      return "Your Bridge business verification is being reviewed. Open wallet setup to complete any remaining KYC steps."
    case "rejected":
    case "paused":
    case "offboarded":
      return "Bridge could not approve verification yet. Open wallet setup to review requirements and resubmit."
    default:
      return "Your subscription is active. Complete Bridge business verification and KYC to activate wallet payouts and donation deposits."
  }
}

type BridgeVerificationRequiredModalProps = {
  isOpen: boolean
  onClose?: () => void
  blocking?: boolean
  hasSubscription: boolean
  bridgeVerification: BridgeVerificationState
  onSubscribe?: () => void
  onVerify: () => void
  onManageSubscription?: () => void
}

export function BridgeVerificationRequiredModal({
  isOpen,
  onClose,
  blocking = false,
  hasSubscription,
  bridgeVerification,
  onSubscribe,
  onVerify,
  onManageSubscription,
}: BridgeVerificationRequiredModalProps) {
  if (!isOpen || bridgeVerification.is_verified) {
    return null
  }

  const badge = statusLabel(bridgeVerification)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={blocking ? undefined : onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            {!blocking && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg"
              >
                <Shield className="h-12 w-12 text-white" />
              </motion.div>

              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center text-2xl font-bold text-foreground"
                >
                  Bridge wallet verification
                </motion.h2>
                <Badge
                  variant="secondary"
                  className="border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200"
                >
                  {badge}
                </Badge>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8 text-center text-base leading-relaxed text-muted-foreground"
              >
                {statusMessage(hasSubscription, bridgeVerification)}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-col gap-3"
              >
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full bg-gradient-to-r from-purple-600 to-blue-600 font-semibold text-white hover:from-purple-500 hover:to-blue-500"
                  onClick={hasSubscription ? onVerify : onSubscribe ?? onVerify}
                >
                  {hasSubscription ? "Verify with Bridge" : "View subscription plans"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {blocking && hasSubscription && onManageSubscription && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full"
                    onClick={onManageSubscription}
                  >
                    Manage or cancel subscription
                  </Button>
                )}
                {!blocking && onClose && (
                  <Button type="button" variant="ghost" size="lg" className="h-11 w-full" onClick={onClose}>
                    Remind me later
                  </Button>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
