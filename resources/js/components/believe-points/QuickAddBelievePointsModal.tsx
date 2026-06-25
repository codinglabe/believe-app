"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { router } from "@inertiajs/react"
import {
  Coins,
  CreditCard,
  DollarSign,
  Landmark,
  Loader2,
  ArrowRight,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { showErrorToast } from "@/lib/toast"
import type { SavedPaymentMethod } from "@/components/account/saved-payment-method-selector"

export interface BelievePointsFeePreview {
  bp_amount_usd: number
  platform_fee_usd: number
  processing_fee_usd: number
  checkout_total_usd: number
  brp_earned: number
  bp_availability: string
  platform_fee_percent: number
  processing_fee_percent: number
}

interface PurchaseSettings {
  /** Flat BRP awarded per purchase for the current buyer's membership tier. */
  brp_award: number
  card_hold_hours: number
}

interface QuickAddBelievePointsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  savedPaymentMethodId: string
  paymentRail: "card" | "bank"
  paymentMethods: SavedPaymentMethod[]
  minPurchaseAmount: number
  maxPurchaseAmount: number
  purchaseSettings: PurchaseSettings
  currentBalance?: number
  feePreview?: BelievePointsFeePreview | null
  /** Current page URL used for partial fee-preview reloads (payment methods or believe-points). */
  feePreviewUrl: string
  paymentSavedMessage?: string
}

const PRESET_AMOUNTS = [10, 25, 50, 100, 250]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function methodLabel(method: SavedPaymentMethod): string {
  if (method.type === "us_bank_account") {
    return `${method.bank_name ?? "Bank"} •••• ${method.last4 ?? "????"}`
  }
  const brand = method.brand
    ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
    : "Card"
  return `${brand} •••• ${method.last4 ?? "????"}`
}

export function QuickAddBelievePointsModal({
  open,
  onOpenChange,
  savedPaymentMethodId,
  paymentRail,
  paymentMethods,
  minPurchaseAmount,
  maxPurchaseAmount,
  purchaseSettings,
  currentBalance,
  feePreview,
  feePreviewUrl,
  paymentSavedMessage,
}: QuickAddBelievePointsModalProps) {
  const presets = useMemo(
    () => PRESET_AMOUNTS.filter((a) => a >= minPurchaseAmount && a <= maxPurchaseAmount),
    [minPurchaseAmount, maxPurchaseAmount],
  )

  const defaultAmount = presets.includes(25)
    ? "25"
    : presets[0] != null
      ? String(presets[0])
      : String(minPurchaseAmount)

  const [amount, setAmount] = useState(defaultAmount)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feePreviewLoading, setFeePreviewLoading] = useState(false)
  const feePreviewSkipRef = useRef(true)

  const savedMethod = useMemo(
    () => paymentMethods.find((m) => m.id === savedPaymentMethodId) ?? null,
    [paymentMethods, savedPaymentMethodId],
  )

  const amountNum = parseFloat(amount)
  const validAmount =
    amount !== "" && !Number.isNaN(amountNum) && amountNum >= minPurchaseAmount && amountNum <= maxPurchaseAmount

  const isBank = paymentRail === "bank"
  const paymentMethod = isBank ? "stripe_ach" : "stripe_card"
  const brpAward = feePreview?.brp_earned ?? purchaseSettings.brp_award
  const holdLabel =
    purchaseSettings.card_hold_hours === 1
      ? "after 1-hour security review"
      : `after ${purchaseSettings.card_hold_hours}-hour security review`

  useEffect(() => {
    if (!open) return
    setAmount(defaultAmount)
    setPolicyAccepted(false)
    setIsSubmitting(false)
    feePreviewSkipRef.current = true
  }, [open, defaultAmount, savedPaymentMethodId])

  useEffect(() => {
    if (!open || !validAmount) return
    if (feePreviewSkipRef.current) {
      feePreviewSkipRef.current = false
      return
    }

    const t = window.setTimeout(() => {
      setFeePreviewLoading(true)
      router.get(
        feePreviewUrl,
        {
          fee_preview_amount: amountNum,
          fee_preview_rail: paymentRail,
        },
        {
          preserveScroll: true,
          preserveState: true,
          replace: true,
          only: ["feePreview"],
          onFinish: () => setFeePreviewLoading(false),
          onCancel: () => setFeePreviewLoading(false),
        },
      )
    }, 300)

    return () => window.clearTimeout(t)
  }, [open, amount, amountNum, validAmount, paymentRail, feePreviewUrl])

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    const formatted =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : numericValue
    setAmount(formatted)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validAmount) {
      showErrorToast(
        `Enter an amount between ${formatCurrency(minPurchaseAmount)} and ${formatCurrency(maxPurchaseAmount)}.`,
      )
      return
    }
    if (!policyAccepted) {
      showErrorToast("Accept the Believe Points Policy to continue.")
      return
    }

    setIsSubmitting(true)
    router.post(
      route("believe-points.purchase"),
      {
        amount: amountNum,
        payment_method: paymentMethod,
        payment_rail: paymentRail,
        saved_payment_method_id: savedPaymentMethodId,
      },
      {
        onError: () => {
          showErrorToast("Could not start your Believe Points purchase. Please try again.")
          setIsSubmitting(false)
        },
        onFinish: () => setIsSubmitting(false),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,680px)] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-violet-500 to-blue-600" aria-hidden />

        <form onSubmit={handleSubmit} className="space-y-0">
          <DialogHeader className="space-y-2 px-5 pb-2 pt-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white">
                <Coins className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-lg">Quick add Believe Points</DialogTitle>
                <DialogDescription className="text-sm">
                  {paymentSavedMessage ?? "Your payment method is saved. Add BP now with one tap."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-5 py-3 sm:px-6">
            {savedMethod && (
              <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/50">
                {isBank ? (
                  <Landmark className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <CreditCard className="h-4 w-4 shrink-0 text-purple-600" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Paying with
                  </p>
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {methodLabel(savedMethod)}
                  </p>
                </div>
              </div>
            )}

            {currentBalance != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Current balance:{" "}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {formatPoints(currentBalance)} BP
                </span>
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose amount</Label>
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium tabular-nums transition-colors",
                        parseFloat(amount) === preset
                          ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/40 dark:text-white"
                          : "border-gray-200 bg-white text-gray-800 hover:border-purple-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white",
                      )}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="h-11 pl-9 font-medium tabular-nums"
                  placeholder="Custom amount"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatCurrency(minPurchaseAmount)} – {formatCurrency(maxPurchaseAmount)} · 1 BP = $1 USD
              </p>
            </div>

            {validAmount && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3 dark:border-purple-800 dark:bg-purple-950/25">
                <p className="text-xs font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
                  You receive
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums text-purple-900 dark:text-purple-100">
                  {formatPoints(amountNum)} BP
                </p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  Earn {formatPoints(brpAward)} BRP · BP available{" "}
                  {isBank ? "after ACH settlement" : holdLabel}
                </p>
              </div>
            )}

            {feePreview && validAmount && (
              <div
                className={cn(
                  "rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40",
                  feePreviewLoading && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-300">
                  <span>Total charged</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatCurrency(feePreview.checkout_total_usd)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Includes platform fee ({feePreview.platform_fee_percent}%) and processing fee ({feePreview.processing_fee_percent}%)
                </p>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
              <Checkbox
                id="quick-add-bp-policy"
                checked={policyAccepted}
                onCheckedChange={(checked) => setPolicyAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="quick-add-bp-policy" className="cursor-pointer text-xs leading-relaxed">
                I agree to the Believe Points Policy. BP are platform credits only — not cash — with
                limited refunds for unused BP within 7 days.
              </Label>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-gray-200 px-5 py-4 sm:flex-col sm:px-6 dark:border-gray-700">
            <Button
              type="submit"
              disabled={isSubmitting || !validAmount || !policyAccepted}
              className="h-11 w-full bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  Add Believe Points
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-600 dark:text-gray-300"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Not now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const QUICK_ADD_STRIP_KEYS = ["open_quick_add_bp", "quick_add_pm", "quick_add_rail"] as const

export type QuickAddBelievePointsPrompt = {
  savedPaymentMethodId: string
  paymentRail: "card" | "bank"
} | null

/** Read quick-add URL params once on mount and strip them from the address bar. */
export function readQuickAddBelievePointsPrompt(): QuickAddBelievePointsPrompt {
  if (typeof window === "undefined") return null

  const params = new URLSearchParams(window.location.search)
  if (params.get("open_quick_add_bp") !== "1") return null

  const pmId = params.get("quick_add_pm")
  const rail = params.get("quick_add_rail")
  if (!pmId || (rail !== "card" && rail !== "bank")) return null

  let changed = false
  for (const key of QUICK_ADD_STRIP_KEYS) {
    if (params.has(key)) {
      params.delete(key)
      changed = true
    }
  }
  if (changed) {
    const qs = params.toString()
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash
    window.history.replaceState({}, "", next)
  }

  return { savedPaymentMethodId: pmId, paymentRail: rail }
}

/** Pick a saved Stripe method for quick BP purchase (preferred → default → first card → first bank). */
export function resolveQuickAddPaymentMethod(
  methods: SavedPaymentMethod[],
  preferredId?: string | null,
): { id: string; rail: "card" | "bank" } | null {
  const railFor = (method: SavedPaymentMethod): "card" | "bank" =>
    method.type === "us_bank_account" ? "bank" : "card"

  if (preferredId) {
    const preferred = methods.find((m) => m.id === preferredId)
    if (preferred) {
      return { id: preferred.id, rail: railFor(preferred) }
    }
  }

  const defaultMethod = methods.find((m) => m.is_default)
  if (defaultMethod) {
    return { id: defaultMethod.id, rail: railFor(defaultMethod) }
  }

  const firstCard = methods.find((m) => m.type === "card")
  if (firstCard) {
    return { id: firstCard.id, rail: "card" }
  }

  const firstBank = methods.find((m) => m.type === "us_bank_account")
  if (firstBank) {
    return { id: firstBank.id, rail: "bank" }
  }

  return null
}
