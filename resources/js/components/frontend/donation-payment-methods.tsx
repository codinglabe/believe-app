"use client"

import {
  CreditCard,
  Coins,
  Landmark,
  Lock,
  Smartphone,
  Wallet,
  Loader2,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProcessingFeeRates } from "@/types"
import { Switch } from "@/components/frontend/ui/switch"
import {
  SavedPaymentMethodSelector,
  type SavedPaymentMethod,
} from "@/components/account/saved-payment-method-selector"

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
  availableBalance?: number
  processingBalance?: number
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

type MethodGroup = "instant" | "manual"

const METHOD_CONFIG: {
  id: DonationPaymentMethodId
  shortLabel: string
  label: string
  description: string
  icon: typeof CreditCard
  availabilityKey: string
  group: MethodGroup
}[] = [
  {
    id: "stripe_card",
    shortLabel: "Card",
    label: "Pay with Card",
    description: "Visa, Mastercard, Amex, Discover",
    icon: CreditCard,
    availabilityKey: "stripe_card",
    group: "instant",
  },
  {
    id: "stripe_ach",
    shortLabel: "Bank",
    label: "Pay with ACH",
    description: "Direct bank transfer (ACH)",
    icon: Landmark,
    availabilityKey: "stripe_ach",
    group: "instant",
  },
  {
    id: "paypal",
    shortLabel: "PayPal",
    label: "Pay with PayPal",
    description: "Secure payment with PayPal",
    icon: Wallet,
    availabilityKey: "paypal",
    group: "instant",
  },
  {
    id: "venmo",
    shortLabel: "Venmo",
    label: "Pay with Venmo",
    description: "Venmo via Stripe Checkout",
    icon: Smartphone,
    availabilityKey: "venmo",
    group: "instant",
  },
  {
    id: "cash_app_pay",
    shortLabel: "Cash App",
    label: "Cash App Pay",
    description: "Cash App Pay via Stripe",
    icon: Smartphone,
    availabilityKey: "cash_app_pay",
    group: "instant",
  },
  {
    id: "venmo_manual",
    shortLabel: "Venmo",
    label: "Venmo (Manual)",
    description: "Send to org Venmo — admin verifies",
    icon: Smartphone,
    availabilityKey: "venmo_manual",
    group: "manual",
  },
  {
    id: "cashapp",
    shortLabel: "Cash App",
    label: "Cash App",
    description: "Manual transfer — QR or cashtag",
    icon: Smartphone,
    availabilityKey: "cashapp",
    group: "manual",
  },
  {
    id: "zelle",
    shortLabel: "Zelle",
    label: "Zelle",
    description: "Manual bank transfer",
    icon: Landmark,
    availabilityKey: "zelle",
    group: "manual",
  },
]

const GROUP_META: { id: MethodGroup; title: string; hint: string }[] = [
  { id: "instant", title: "Pay instantly", hint: "Secure online checkout" },
  { id: "manual", title: "Manual transfer", hint: "Send payment, then confirm" },
]

function isStripeRail(method: DonationPaymentMethodId): boolean {
  return method === "stripe_card" || method === "stripe_ach"
}

function isManualMethod(method: DonationPaymentMethodId): boolean {
  return method === "cashapp" || method === "zelle" || method === "venmo_manual"
}

function PaymentMethodTile({
  shortLabel,
  icon: Icon,
  selected,
  disabled,
  onClick,
  badge,
}: {
  shortLabel: string
  icon: typeof CreditCard
  selected: boolean
  disabled?: boolean
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-center transition-all",
        selected
          ? "border-purple-600 bg-purple-50 text-purple-900 shadow-sm ring-2 ring-purple-600/20 dark:border-purple-500 dark:bg-purple-950/50 dark:text-white dark:ring-purple-400/25"
          : "border-purple-100/80 bg-white/70 text-gray-800 hover:border-purple-300 hover:bg-purple-50/40 dark:border-purple-800/30 dark:bg-white/[0.04] dark:text-white dark:hover:border-purple-600/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {selected && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-white dark:bg-purple-500">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
      {badge && (
        <span className="absolute -top-1.5 left-1/2 max-w-[calc(100%-0.5rem)] -translate-x-1/2 truncate rounded-full bg-slate-700 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white dark:bg-slate-600">
          {badge}
        </span>
      )}
      <Icon className={cn("h-5 w-5 shrink-0", selected ? "text-purple-700 dark:text-purple-300" : "text-slate-600 dark:text-white/70")} />
      <span className="text-[11px] font-semibold leading-tight sm:text-xs">{shortLabel}</span>
    </button>
  )
}

export function DonationPaymentMethods({
  paymentMethod,
  onPaymentMethodChange,
  availableMethods,
  hasOrgSelected = false,
  paymentMethodsLoading = false,
  currentBalance,
  availableBalance,
  processingBalance = 0,
  canUseBelievePoints,
  amount,
  feePreviewRail,
  onFeePreviewRailChange,
  donorCoversProcessingFees,
  onDonorCoversChange,
  feePreview,
  feePreviewLoading,
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

  const visibleMethods = METHOD_CONFIG.filter(
    (m) => hasOrgSelected && availableMethods[m.availabilityKey],
  )
  const selectedConfig = METHOD_CONFIG.find((m) => m.id === paymentMethod)
  const SelectedIcon = selectedConfig?.icon
  const showBelievePoints =
    hasOrgSelected && !paymentMethodsLoading && availableMethods.believe_points !== false
  const noMethodsAvailable =
    hasOrgSelected &&
    !paymentMethodsLoading &&
    visibleMethods.length === 0 &&
    !showBelievePoints
  const selectedMethodAvailable =
    paymentMethod === "believe_points"
      ? showBelievePoints
      : Boolean(selectedConfig && availableMethods[selectedConfig.availabilityKey])

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {!hasOrgSelected && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
          Select a nonprofit organization first to see which payment methods they accept.
        </div>
      )}

      {hasOrgSelected && paymentMethodsLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-600/80 dark:text-white/60">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          <span className="text-sm">Loading payment methods…</span>
        </div>
      )}

      {noMethodsAvailable && (
        <div className="rounded-xl border border-purple-200/60 bg-purple-50/40 p-4 text-sm text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/30 dark:text-purple-100">
          This organization has not enabled any payment methods yet. They can configure options under{" "}
          <strong>Settings → Donation Payments</strong>.
        </div>
      )}

      {hasOrgSelected && !paymentMethodsLoading && visibleMethods.length > 0 && (
        <div className="space-y-4">
          {GROUP_META.map(({ id, title, hint }) => {
            const groupMethods = visibleMethods.filter((m) => m.group === id)
            if (groupMethods.length === 0) return null

            return (
              <section key={id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
                    {title}
                  </p>
                  <p className="hidden text-[11px] text-slate-400 sm:block dark:text-white/40">{hint}</p>
                </div>
                <div
                  className={cn(
                    "grid gap-2",
                    groupMethods.length >= 4
                      ? "grid-cols-3 sm:grid-cols-4"
                      : groupMethods.length === 3
                        ? "grid-cols-3"
                        : groupMethods.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-1 max-w-[9rem]",
                  )}
                >
                  {groupMethods.map(({ id: methodId, shortLabel, icon, group }) => {
                    const badge = group === "manual" ? "Manual" : undefined
                    return (
                      <PaymentMethodTile
                        key={methodId}
                        shortLabel={shortLabel}
                        icon={icon}
                        selected={paymentMethod === methodId}
                        badge={badge}
                        onClick={() => selectMethod(methodId)}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {showBelievePoints && (
        <section className="space-y-2">
          <p className="px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
            Platform balance
          </p>
          <button
            type="button"
            onClick={() => canUseBelievePoints && selectMethod("believe_points")}
            disabled={!canUseBelievePoints}
            aria-pressed={paymentMethod === "believe_points"}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3",
              paymentMethod === "believe_points"
                ? "border-purple-600 bg-purple-50 text-purple-900 shadow-sm ring-2 ring-purple-600/20 dark:border-purple-500 dark:bg-purple-950/50 dark:text-white"
                : "border-purple-100/80 bg-white/70 hover:border-purple-300 dark:border-purple-800/30 dark:bg-white/[0.04] dark:text-white",
              !canUseBelievePoints && "cursor-not-allowed opacity-60",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {currentBalance.toLocaleString()} Believe Points
              </p>
              <p className="text-xs text-slate-600/80 dark:text-white/55">
                {canUseBelievePoints
                  ? "Total balance (Processing + Available)"
                  : "Insufficient balance for this amount"}
              </p>
              {(availableBalance !== undefined || processingBalance > 0) && (
                <p className="mt-1 text-[11px] leading-snug text-slate-600/75 dark:text-white/50">
                  Available: {(availableBalance ?? currentBalance).toLocaleString()} BP
                  {processingBalance > 0
                    ? ` · Processing: ${processingBalance.toLocaleString()} BP`
                    : ""}
                </p>
              )}
            </div>
            {paymentMethod === "believe_points" && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
          </button>
        </section>
      )}

      {hasOrgSelected && !paymentMethodsLoading && selectedMethodAvailable && selectedConfig && SelectedIcon && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-white/10">
              <SelectedIcon className="h-4 w-4 text-slate-700 dark:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedConfig.label}</p>
              <p className="mt-0.5 flex items-start gap-1 text-xs leading-snug text-slate-600 dark:text-white/60">
                <Lock className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                <span>{selectedConfig.description}</span>
              </p>
            </div>
          </div>

          {isStripeRail(paymentMethod) && amount > 0 && (
            <div className="mt-3 space-y-3 border-t border-slate-200/70 pt-3 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Make Full Impact</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-white/55">
                    Cover fees so 100% goes to the nonprofit.
                  </p>
                </div>
                <Switch checked={donorCoversProcessingFees} onCheckedChange={onDonorCoversChange} />
              </div>

              {feePreviewLoading && !feePreview ? (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading fee preview…
                </div>
              ) : null}

              {feePreview ? (
                <div
                  className={cn(
                    "grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-white/5",
                    feePreviewLoading && "opacity-60",
                  )}
                >
                  <span className="text-slate-600 dark:text-white/60">Total charged</span>
                  <span className="text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                    ${feePreview.checkout_total_usd.toFixed(2)}
                  </span>
                  <span className="text-slate-600 dark:text-white/60">Processing fees</span>
                  <span className="text-right tabular-nums text-slate-700 dark:text-white/75">
                    ${feePreview.processing_fee_estimate.toFixed(2)}
                  </span>
                </div>
              ) : null}

              {authUser && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-slate-700 dark:text-white/75">Saved payment</p>
                  <SavedPaymentMethodSelector
                    methods={savedPaymentMethods}
                    rail={feePreviewRail}
                    value={savedPaymentMethodId}
                    onChange={onSavedPaymentMethodChange}
                    manageHref={paymentMethodsUrl}
                    variant="compact"
                  />
                </div>
              )}

              <p className="text-[10px] leading-snug text-slate-500 dark:text-white/45">
                Card: {(processingFeeRates.card_percent * 100).toFixed(1)}% + $
                {processingFeeRates.card_fixed_usd.toFixed(2)} · ACH:{" "}
                {(processingFeeRates.ach_percent * 100).toFixed(1)}% (max $
                {processingFeeRates.ach_fee_cap_usd.toFixed(2)})
              </p>
            </div>
          )}

          {isManualMethod(paymentMethod) && (
            <p className="mt-3 border-t border-amber-200/60 pt-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800/40 dark:text-amber-100">
              After clicking &quot;Make My Impact&quot;, you&apos;ll get payment instructions. Transfer manually,
              confirm, and an admin will verify — you&apos;ll receive +5 BRP.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
