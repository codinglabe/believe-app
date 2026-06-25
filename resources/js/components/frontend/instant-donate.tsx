"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Building2,
  Check,
  CreditCard,
  HandHeart,
  Landmark,
  Loader2,
  Search,
  Shield,
  X,
  Zap,
} from "lucide-react"
import { Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/frontend/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/frontend/ui/avatar"
import { cn } from "@/lib/utils"
import type { ProcessingFeeRates } from "@/types"
import {
  filterMethodsForRail,
  labelForMethod,
  type SavedPaymentMethod,
} from "@/components/account/saved-payment-method-selector"

/** Minimal cause shape shared with the donate page. */
export interface InstantDonateCause {
  id: string
  kind: "organization" | "care_alliance"
  organization_id: number
  name: string
  description?: string
  image: string | null
  care_alliance_id?: number
}

/** Payload posted to the existing donation store endpoint. */
export interface InstantDonatePayload {
  organization_id: number
  recipient_kind: "organization" | "care_alliance"
  care_alliance_id?: number
  amount: number
  frequency: "one-time"
  payment_method: "stripe_card" | "stripe_ach"
  donor_covers_processing_fees: boolean
  donation_fee_rail: "card" | "bank"
  saved_payment_method_id?: string
}

interface InstantDonateProps {
  /** All causes the user can quickly pick from (primary, secondary, donated). */
  causes: InstantDonateCause[]
  /** Resolved default recipient (usually the supporter's primary organization). */
  defaultCause?: InstantDonateCause
  savedPaymentMethods: SavedPaymentMethod[]
  paymentMethodsUrl: string
  processingFeeRates: ProcessingFeeRates
  isSubmitting: boolean
  submissionError?: string | null
  onBack: () => void
  onDonate: (payload: InstantDonatePayload) => void
}

const INSTANT_AMOUNTS = [10, 25, 50, 100]

const CARD =
  "rounded-2xl border border-purple-200/50 bg-white/80 shadow-lg shadow-purple-600/[0.08] backdrop-blur-xl text-gray-900 dark:border-purple-700/35 dark:bg-purple-950/35 dark:shadow-purple-950/25 dark:text-white"

const formatUsd = (value: number) =>
  value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Client-side estimate of what the donor is charged when they cover processing fees.
 * The authoritative total is recomputed server-side at checkout; this is for display only.
 */
function estimateCheckoutTotal(
  gift: number,
  rail: "card" | "bank",
  donorCovers: boolean,
  rates: ProcessingFeeRates,
): number {
  if (gift <= 0 || !donorCovers) return gift
  if (rail === "bank") {
    const uncapped = gift / (1 - rates.ach_percent)
    const cappedFee = rates.ach_fee_cap_usd
    return Math.min(uncapped, gift + cappedFee)
  }
  return (gift + rates.card_fixed_usd) / (1 - rates.card_percent)
}

function CauseAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase()
  const usableSrc = typeof src === "string" && src.trim() !== "" ? src.trim() : undefined
  return (
    <Avatar className={cn("shrink-0 rounded-md", className)}>
      <AvatarImage src={usableSrc} alt="" className="object-cover" />
      <AvatarFallback className="rounded-md bg-purple-100 text-purple-800 text-sm font-semibold dark:bg-purple-900/40 dark:text-purple-100">
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}

function SummaryRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-600 dark:text-white/60">{label}</span>
      <span
        className={cn(
          "text-right font-medium",
          emphasize ? "text-purple-700 dark:text-purple-300" : "text-slate-900 dark:text-white",
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function InstantDonate({
  causes,
  defaultCause,
  savedPaymentMethods,
  paymentMethodsUrl,
  processingFeeRates,
  isSubmitting,
  submissionError,
  onBack,
  onDonate,
}: InstantDonateProps) {
  const defaultSavedMethod = useMemo(
    () => savedPaymentMethods.find((m) => m.is_default) ?? savedPaymentMethods[0] ?? null,
    [savedPaymentMethods],
  )

  const [selectedCauseId, setSelectedCauseId] = useState<string | null>(defaultCause?.id ?? null)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25)
  const [customAmount, setCustomAmount] = useState("")
  const [savedPaymentMethodId, setSavedPaymentMethodId] = useState<string | null>(
    defaultSavedMethod?.id ?? null,
  )
  const [makeImpactPay, setMakeImpactPay] = useState(true)

  const [editOrg, setEditOrg] = useState(false)
  const [editPayment, setEditPayment] = useState(false)
  const [orgSearch, setOrgSearch] = useState("")

  const selectedCause = useMemo(
    () => causes.find((c) => c.id === selectedCauseId) ?? defaultCause,
    [causes, selectedCauseId, defaultCause],
  )

  const selectedSavedMethod = useMemo(
    () => savedPaymentMethods.find((m) => m.id === savedPaymentMethodId) ?? null,
    [savedPaymentMethods, savedPaymentMethodId],
  )

  const rail: "card" | "bank" = selectedSavedMethod?.type === "us_bank_account" ? "bank" : "card"

  const giftAmount = selectedAmount ?? (Number.parseFloat(customAmount) || 0)
  const checkoutTotal = estimateCheckoutTotal(giftAmount, rail, makeImpactPay, processingFeeRates)

  const paymentLabel = selectedSavedMethod
    ? labelForMethod(selectedSavedMethod)
    : "New card at checkout"

  const filteredCauses = useMemo(() => {
    const q = orgSearch.trim().toLowerCase()
    if (!q) return causes
    return causes.filter((c) => c.name.toLowerCase().includes(q))
  }, [causes, orgSearch])

  const canDonate = Boolean(selectedCause?.organization_id) && giftAmount > 0 && !isSubmitting

  const handleDonate = () => {
    if (!selectedCause?.organization_id || giftAmount <= 0) return
    onDonate({
      organization_id: selectedCause.organization_id,
      recipient_kind: selectedCause.kind,
      care_alliance_id:
        selectedCause.kind === "care_alliance" ? selectedCause.care_alliance_id : undefined,
      amount: giftAmount,
      frequency: "one-time",
      payment_method: rail === "bank" ? "stripe_ach" : "stripe_card",
      donor_covers_processing_fees: makeImpactPay,
      donation_fee_rail: rail,
      saved_payment_method_id: savedPaymentMethodId ?? undefined,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-xl space-y-5"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
          Review &amp; Confirm
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Make an Immediate Impact
        </h1>
        <p className="mx-auto max-w-md text-sm text-slate-600 dark:text-white/70">
          Your donation will be processed instantly with your default settings.
        </p>
      </div>

      {/* Default settings cards */}
      <div className={cn(CARD, "divide-y divide-purple-100/70 dark:divide-purple-800/30 overflow-hidden")}>
        {/* Organization */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Organization</p>
              <p className="truncate text-sm text-slate-600 dark:text-white/60">
                {selectedCause?.name ?? "No default organization"}
              </p>
            </div>
            {causes.length > 0 && (
              <button
                type="button"
                onClick={() => setEditOrg((v) => !v)}
                className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {editOrg ? "Done" : "Edit"}
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {editOrg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500/70" />
                    <Input
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      placeholder="Search your organizations..."
                      className="h-10 pl-10"
                    />
                  </div>
                  <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {filteredCauses.length === 0 ? (
                      <p className="px-1 py-2 text-sm text-slate-500 dark:text-white/50">
                        No organizations found.
                      </p>
                    ) : (
                      filteredCauses.map((cause) => {
                        const active = cause.id === selectedCauseId
                        return (
                          <button
                            key={cause.id}
                            type="button"
                            onClick={() => {
                              setSelectedCauseId(cause.id)
                              setEditOrg(false)
                              setOrgSearch("")
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                              active
                                ? "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/40"
                                : "border-transparent hover:bg-purple-50/70 dark:hover:bg-purple-900/30",
                            )}
                          >
                            <CauseAvatar name={cause.name} src={cause.image} className="h-8 w-8" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">
                              {cause.name}
                            </span>
                            {active && <Check className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-300" />}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Payment method */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {rail === "bank" ? <Landmark className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Payment Method</p>
              <p className="truncate text-sm text-slate-600 dark:text-white/60">{paymentLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditPayment((v) => !v)}
              className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {editPayment ? "Done" : "Edit"}
            </button>
          </div>
          <AnimatePresence initial={false}>
            {editPayment && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-1.5">
                  {[...filterMethodsForRail(savedPaymentMethods, "card"), ...filterMethodsForRail(savedPaymentMethods, "bank")].map(
                    (method) => {
                      const Icon = method.type === "us_bank_account" ? Landmark : CreditCard
                      const active = method.id === savedPaymentMethodId
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            setSavedPaymentMethodId(method.id)
                            setEditPayment(false)
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            active
                              ? "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/40"
                              : "border-border hover:bg-muted/50 dark:border-white/15 dark:hover:bg-white/5",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate">{labelForMethod(method)}</span>
                          {method.is_default && (
                            <span className="text-xs text-muted-foreground">Default</span>
                          )}
                          {active && <Check className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-300" />}
                        </button>
                      )
                    },
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSavedPaymentMethodId(null)
                      setEditPayment(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      savedPaymentMethodId === null
                        ? "border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/40"
                        : "border-border hover:bg-muted/50 dark:border-white/15 dark:hover:bg-white/5",
                    )}
                  >
                    <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">Use a new card at checkout</span>
                  </button>
                  <a
                    href={paymentMethodsUrl}
                    className="block px-1 pt-1 text-xs text-slate-500 underline-offset-2 hover:underline dark:text-white/50"
                  >
                    Manage payment methods
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Make Impact Pay */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
              <HandHeart className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Make Impact Pay</p>
              <p className="truncate text-sm text-slate-600 dark:text-white/60">
                {makeImpactPay ? "On — you cover processing fees" : "Off"}
              </p>
            </div>
            <Switch
              checked={makeImpactPay}
              onCheckedChange={setMakeImpactPay}
              aria-label="Make Impact Pay — cover processing fees"
            />
          </div>
        </div>
      </div>

      {/* Choose amount */}
      <div className={cn(CARD, "p-4 space-y-3")}>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Choose Amount</p>
          <p className="text-xs text-slate-500 dark:text-white/50">
            Pick a quick amount or enter a custom value.
          </p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {INSTANT_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setSelectedAmount(amount)
                setCustomAmount("")
              }}
              className={cn(
                "rounded-xl border-2 py-2.5 text-center text-sm font-bold transition-all",
                selectedAmount === amount
                  ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/40 dark:text-white"
                  : "border-purple-100/80 bg-white/80 text-gray-800 hover:border-purple-400 dark:border-purple-800/30 dark:bg-white/[0.04] dark:text-white",
              )}
            >
              ${amount}
            </button>
          ))}
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 dark:text-white/50">
              $
            </span>
            <input
              type="number"
              min={1}
              placeholder="Other"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value)
                setSelectedAmount(null)
              }}
              className={cn(
                "h-full w-full rounded-xl border-2 pl-5 pr-1 text-center text-sm font-semibold outline-none transition-all",
                selectedAmount === null && customAmount
                  ? "border-purple-600 bg-purple-50 text-purple-900 dark:border-purple-500 dark:bg-purple-950/40 dark:text-white"
                  : "border-purple-100/80 bg-white/80 text-gray-800 focus:border-purple-400 dark:border-purple-800/30 dark:bg-white/[0.04] dark:text-white",
              )}
            />
          </div>
        </div>
      </div>

      {/* Donation summary */}
      <div className={cn(CARD, "p-4 space-y-2.5")}>
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Donation Summary</p>
        <SummaryRow label="Organization" value={selectedCause?.name ?? "—"} />
        <SummaryRow label="Payment Method" value={paymentLabel} />
        <SummaryRow label="Make Impact Pay" value={makeImpactPay ? "On" : "Off"} />
        <div className="my-1 border-t border-purple-100/70 dark:border-purple-800/30" />
        <SummaryRow label="You Donate" value={`$${formatUsd(giftAmount)}`} emphasize />
        <SummaryRow
          label={makeImpactPay ? "Total (incl. fees)" : "Total"}
          value={`$${formatUsd(checkoutTotal)}`}
          emphasize
        />
      </div>

      {submissionError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300/60 bg-red-50/80 p-3 dark:border-red-400/30 dark:bg-red-500/20">
          <X className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{submissionError}</p>
        </div>
      )}

      {/* CTA */}
      <div className="space-y-2">
        <Button
          size="lg"
          onClick={handleDonate}
          disabled={!canDonate}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-purple-600 to-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-500/20 hover:from-purple-700 hover:to-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" /> Donate ${formatUsd(giftAmount)} Instantly
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-white/50">
          <Shield className="h-3.5 w-3.5" /> Secure · Fast · Impactful
        </p>
      </div>
    </motion.div>
  )
}
