"use client"

import { ArrowRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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

type BridgeVerificationBannerProps = {
  hasSubscription: boolean
  bridgeVerification: BridgeVerificationState
  onSubscribe: () => void
  onVerify: () => void
  className?: string
}

export function BridgeVerificationBanner({
  hasSubscription,
  bridgeVerification,
  onSubscribe,
  onVerify,
  className,
}: BridgeVerificationBannerProps) {
  if (bridgeVerification.is_verified) {
    return null
  }

  const badge = statusLabel(bridgeVerification)

  return (
    <Card
      className={cn(
        "overflow-hidden border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-blue-50/80 shadow-sm dark:border-violet-500/30 dark:from-violet-950/40 dark:via-[#071225] dark:to-blue-950/30",
        className,
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
                Bridge wallet verification
              </h2>
              <Badge
                variant="secondary"
                className="border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200"
              >
                {badge}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {statusMessage(hasSubscription, bridgeVerification)}
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="h-10 shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 font-semibold text-white hover:from-purple-500 hover:to-blue-500"
          onClick={hasSubscription ? onVerify : onSubscribe}
        >
          {hasSubscription ? "Verify with Bridge" : "View subscription plans"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
