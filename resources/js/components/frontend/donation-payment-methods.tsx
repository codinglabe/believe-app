"use client"

import { CreditCard, Coins, Landmark, Lock, ChevronRight, Smartphone, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProcessingFeeRates } from "@/types"
import { Switch } from "@/components/frontend/ui/switch"
import {
  SavedPaymentMethodSelector,
  type SavedPaymentMethod,
} from "@/components/account/saved-payment-method-selector"
import { Loader2 } from "lucide-react"

export type DonationPaymentMethodId =
  | "stripe_card"
  | "stripe_ach"
  | "paypal"
  | "venmo"
  | "venmo_manual"
  | "cash_app_pay"
  | "cashapp"
  | "zelle"
  | "believe_points"

type FeePreviewRail = "card" | "bank"

interface FeePreviewFromServer {
  mode: "donor_covers" | "org_covers"
  rail?: FeePreviewRail
  base_gift_usd: number
  checkout_total_usd: number
  processing_fee_estimate: number
  estimated_net_to_org_usd: number
}

export interface DonationPaymentMethodsProps {
  paymentMethod: DonationPaymentMethodId
  onPaymentMethodChange: (method: DonationPaymentMethodId) => void
  availableMethods: Record<string, boolean>
  hasOrgSelected?: boolean
  paymentMethodsLoading?: boolean
  currentBalance: number
  canUseBelievePoints: boolean
  amount: number
  feePreviewRail: FeePreviewRail
  onFeePreviewRailChange: (rail: FeePreviewRail) => void
  donorCoversProcessingFees: boolean
  onDonorCoversChange: (v: boolean) => void
  feePreview: FeePreviewFromServer | null
  feePreviewLoading: boolean
  feePreviewCheckoutTotalsByRail: { card: number; bank: number } | null
  processingFeeRates: ProcessingFeeRates
  savedPaymentMethods: SavedPaymentMethod[]
  savedPaymentMethodId: string | null
  onSavedPaymentMethodChange: (id: string | null) => void
  paymentMethodsUrl: string
  authUser: boolean
}

const METHOD_CONFIG: {
  id: DonationPaymentMethodId
  label: string
  description: string
  icon: typeof CreditCard
  availabilityKey: string
}[] = [
  { id: "stripe_card", label: "Pay with Card", description: "Visa, Mastercard, Amex, Discover", icon: CreditCard, availabilityKey: "stripe_card" },
  { id: "stripe_ach", label: "Pay with ACH", description: "Direct bank transfer", icon: Landmark, availabilityKey: "stripe_ach" },
  { id: "paypal", label: "Pay with PayPal", description: "Secure payment with PayPal", icon: Wallet, availabilityKey: "paypal" },
  { id: "venmo", label: "Pay with Venmo", description: "Venmo via Stripe Checkout", icon: Smartphone, availabilityKey: "venmo" },
  { id: "venmo_manual", label: "Venmo (Manual)", description: "Send to org Venmo username — admin verifies", icon: Smartphone, availabilityKey: "venmo_manual" },
  { id: "cash_app_pay", label: "Cash App Pay", description: "Pay using Cash App Pay (Stripe)", icon: Smartphone, availabilityKey: "cash_app_pay" },
  { id: "cashapp", label: "Cash App", description: "Manual transfer — QR or cashtag", icon: Smartphone, availabilityKey: "cashapp" },
  { id: "zelle", label: "Zelle", description: "Manual bank transfer", icon: Landmark, availabilityKey: "zelle" },
]

function isStripeRail(method: DonationPaymentMethodId): boolean {
  return method === "stripe_card" || method === "stripe_ach"
}

export function DonationPaymentMethods({
  paymentMethod,
  onPaymentMethodChange,
  availableMethods,
  hasOrgSelected = false,
  paymentMethodsLoading = false,
  currentBalance,
  canUseBelievePoints,
  amount,
  feePreviewRail,
  onFeePreviewRailChange,
  donorCoversProcessingFees,
  onDonorCoversChange,
  feePreview,
  feePreviewLoading,
  feePreviewCheckoutTotalsByRail,
  processingFeeRates,
  savedPaymentMethods,
  savedPaymentMethodId,
  onSavedPaymentMethodChange,
  paymentMethodsUrl,
  authUser,
}: DonationPaymentMethodsProps) {
  const selectMethod = (id: DonationPaymentMethodId) => {
    onPaymentMethodChange(id)
    if (id === "stripe_card") onFeePreviewRailChange("card")
    if (id === "stripe_ach") onFeePreviewRailChange("bank")
    if (!isStripeRail(id)) onSavedPaymentMethodChange(null)
  }

  return (
    <div className="p-5 space-y-3">
      {!hasOrgSelected && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
          Select a nonprofit organization first to see which payment methods they accept.
        </div>
      )}

      {hasOrgSelected && paymentMethodsLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-slate-600/80 dark:text-white/60">
          <Loader2 className="h-5 w-5 animate-spin shrink-0" />
          <span>Loading payment methods…</span>
        </div>
      )}

      {hasOrgSelected && !paymentMethodsLoading && METHOD_CONFIG.every((m) => !availableMethods[m.availabilityKey]) && (
        <div className="rounded-xl border border-purple-200/60 bg-purple-50/40 p-4 text-sm text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-100">
          This organization has not enabled any payment methods yet. They can configure options under{" "}
          <strong>Settings → Donation Payments</strong>.
        </div>
      )}

      {METHOD_CONFIG.map(({ id, label, description, icon: Icon, availabilityKey }) => {
        if (!hasOrgSelected || !availableMethods[availabilityKey]) return null
        const selected = paymentMethod === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => selectMethod(id)}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
              selected
                ? "border-purple-600 bg-purple-50 text-purple-900 shadow-sm dark:border-purple-500 dark:bg-purple-950/40 dark:text-white"
                : "border-purple-100/80 bg-white/70 hover:border-purple-400 text-gray-800 dark:border-purple-800/30 dark:bg-white/[0.04] dark:text-white",
            )}
          >
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-slate-900 dark:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{label}</div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-slate-600/70 dark:text-white/60">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>{description}</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-600/50 shrink-0 dark:text-white/50" />
          </button>
        )
      })}

      {isStripeRail(paymentMethod) && amount > 0 && (
        <div className="rounded-xl border border-purple-100/80 bg-gradient-to-br from-purple-50/40 to-blue-50/30 p-4 space-y-3 dark:border-purple-800/25 dark:from-purple-950/25 dark:to-blue-950/20">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Make Full Impact</div>
              <p className="text-xs text-slate-600/85 dark:text-white/60 mt-0.5 leading-snug">
                Cover fees so 100% of your donation goes to the nonprofit.
              </p>
            </div>
            <Switch checked={donorCoversProcessingFees} onCheckedChange={onDonorCoversChange} />
          </div>
          {feePreviewLoading && !feePreview ? (
            <div className="flex items-center justify-center gap-2 py-4 text-slate-600/80 dark:text-white/60">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span>Loading fee preview…</span>
            </div>
          ) : null}
          {feePreview ? (
            <div className={cn("text-xs space-y-1.5", feePreviewLoading && "opacity-60")}>
              <div className="flex justify-between font-semibold text-slate-900 dark:text-white">
                <span>Total Charged</span>
                <span className="tabular-nums">${feePreview.checkout_total_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600/90 dark:text-white/65">
                <span>Processing Fees</span>
                <span className="tabular-nums">${feePreview.processing_fee_estimate.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
          {authUser && (
            <SavedPaymentMethodSelector
              methods={savedPaymentMethods}
              rail={feePreviewRail}
              value={savedPaymentMethodId}
              onChange={onSavedPaymentMethodChange}
              manageHref={paymentMethodsUrl}
              className="text-xs"
            />
          )}
          <p className="text-[11px] text-slate-500 dark:text-white/50">
            Card: {(processingFeeRates.card_percent * 100).toFixed(1)}% + ${processingFeeRates.card_fixed_usd.toFixed(2)}; ACH: {(processingFeeRates.ach_percent * 100).toFixed(1)}% capped at ${processingFeeRates.ach_fee_cap_usd.toFixed(2)}.
          </p>
        </div>
      )}

      {(paymentMethod === "cashapp" || paymentMethod === "zelle" || paymentMethod === "venmo_manual") && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
          After clicking &quot;Make My Impact&quot;, you&apos;ll see payment instructions. Transfer manually, then confirm payment. An admin will verify and you&apos;ll receive +5 BRP (Believe Reward Points).
        </div>
      )}

      {hasOrgSelected && !paymentMethodsLoading && availableMethods.believe_points !== false && (
        <button
          type="button"
          onClick={() => {
            if (!canUseBelievePoints) return
            selectMethod("believe_points")
          }}
          disabled={!canUseBelievePoints}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all",
            paymentMethod === "believe_points"
              ? "border-purple-600 bg-purple-50 text-purple-900 shadow-sm dark:border-purple-500 dark:bg-purple-950/40 dark:text-white"
              : "border-purple-100/80 bg-white/70 hover:border-purple-400 text-gray-800 dark:border-purple-800/30 dark:bg-white/[0.04] dark:text-white",
            !canUseBelievePoints && "opacity-60 cursor-not-allowed",
          )}
        >
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{currentBalance.toLocaleString()} Believe Points</div>
            <div className="text-sm text-slate-600/70 dark:text-white/60">Use your Believe Points balance</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-600/50 shrink-0 dark:text-white/50" />
        </button>
      )}
    </div>
  )
}
