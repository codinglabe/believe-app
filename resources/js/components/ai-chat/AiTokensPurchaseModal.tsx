"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { router } from "@inertiajs/react"
import { Bot, Sparkles, Loader2, Coins, CreditCard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type CreditCheckoutPackage = "addon_10k" | "addon_25k" | "addon_50k"

const TOKEN_ADDONS: Array<{
  package: CreditCheckoutPackage
  tokens: number
  priceLabel: string
  featured?: boolean
}> = [
  { package: "addon_10k", tokens: 10_000, priceLabel: "$2.00" },
  { package: "addon_25k", tokens: 25_000, priceLabel: "$4.50", featured: true },
  { package: "addon_50k", tokens: 50_000, priceLabel: "$8.00" },
]

interface AiTokensPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnRoute?: string
  onCheckoutError?: (message: string) => void
}

const contentEase = [0.22, 1, 0.36, 1] as const

type PaymentMethod = "stripe" | "believe_points"

export function AiTokensPurchaseModal({
  open,
  onOpenChange,
  returnRoute = "ai-chat.index",
  onCheckoutError,
}: AiTokensPurchaseModalProps) {
  const [processing, setProcessing] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<CreditCheckoutPackage>("addon_25k")
  /** Chosen after picking a pack — must select Stripe or Believe Points */
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

  const selectedAddon = useMemo(
    () => TOKEN_ADDONS.find((a) => a.package === selectedPackage) ?? TOKEN_ADDONS[1],
    [selectedPackage]
  )

  useEffect(() => {
    if (open) {
      setSelectedPackage("addon_25k")
      setPaymentMethod(null)
      setProcessing(false)
    }
  }, [open])

  const startStripeCheckout = () => {
    setProcessing(true)
    router.post(
      route("credits.checkout"),
      { package: selectedPackage, return_route: returnRoute },
      {
        onError: (errors) => {
          const msg =
            (typeof errors.message === "string" && errors.message) ||
            (typeof errors.error === "string" && errors.error) ||
            "Failed to start checkout. Please try again."
          onCheckoutError?.(msg)
          setProcessing(false)
        },
        onFinish: () => {
          setProcessing(false)
        },
      }
    )
  }

  const payWithBelievePoints = () => {
    setProcessing(true)
    router.post(
      route("credits.pay-believe-points"),
      { package: selectedPackage, return_route: returnRoute },
      {
        preserveScroll: true,
        onError: (errors) => {
          const msg =
            (typeof errors.message === "string" && errors.message) ||
            (typeof errors.error === "string" && errors.error) ||
            "Could not complete purchase with Believe Points. Please try again."
          onCheckoutError?.(msg)
          setProcessing(false)
        },
        onFinish: () => {
          setProcessing(false)
        },
      }
    )
  }

  const handleContinue = () => {
    if (paymentMethod === null) return
    if (paymentMethod === "believe_points") {
      payWithBelievePoints()
      return
    }
    startStripeCheckout()
  }

  const busy = processing
  const continueDisabled = paymentMethod === null || busy

  const continueLabel =
    paymentMethod === null
      ? "Choose Stripe or Believe Points"
      : paymentMethod === "believe_points"
        ? `Continue — Believe Points (${selectedAddon.tokens.toLocaleString()} tokens)`
        : `Continue — Stripe (${selectedAddon.tokens.toLocaleString()} tokens · ${selectedAddon.priceLabel})`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[min(90vh,720px)] gap-0 overflow-y-auto overflow-x-hidden rounded-2xl border p-0 shadow-2xl",
          "border-border bg-card text-card-foreground",
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
          "max-w-[calc(100%-1.5rem)] sm:max-w-lg",
          "[&_button.absolute]:top-3.5 [&_button.absolute]:right-3.5 [&_button.absolute]:rounded-full [&_button.absolute]:text-muted-foreground [&_button.absolute]:hover:bg-muted [&_button.absolute]:hover:text-foreground",
          "dark:[&_button.absolute]:text-zinc-400 dark:[&_button.absolute]:hover:bg-white/10 dark:[&_button.absolute]:hover:text-white"
        )}
      >
        <div
          className="h-1.5 w-full shrink-0 bg-gradient-to-r from-purple-600 via-violet-500 to-blue-600"
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: contentEase }}
          className="relative px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-8 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/20" />
          <div className="pointer-events-none absolute -left-12 top-24 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />

          <DialogHeader className="relative flex flex-col items-center space-y-3 text-center sm:text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-blue-500/10 shadow-inner">
              <Bot className="h-8 w-8 text-purple-600 dark:text-purple-400" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="mx-auto max-w-[26rem] space-y-1.5 text-center">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl dark:text-white">
                Need more AI power?
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground dark:text-zinc-400">
                <span className="font-medium text-foreground dark:text-zinc-200">Step 1:</span> choose a token pack.{" "}
                <span className="font-medium text-foreground dark:text-zinc-200">Step 2:</span> pay with{" "}
                <span className="font-medium">Stripe</span> or <span className="font-medium">Believe Points</span>.
              </DialogDescription>
            </div>
          </DialogHeader>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05, ease: contentEase }}
            className="relative mt-6 space-y-6"
          >
            {/* Step 1 — package */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-500">
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white dark:bg-purple-500">
                  1
                </span>
                Choose your token pack
              </legend>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {TOKEN_ADDONS.map((addon, i) => {
                  const isSelected = selectedPackage === addon.package
                  return (
                    <motion.button
                      key={addon.package}
                      type="button"
                      disabled={busy}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.04 + i * 0.04, ease: contentEase }}
                      onClick={() => setSelectedPackage(addon.package)}
                      className={cn(
                        "relative flex flex-col items-center rounded-xl border px-2 py-3 text-center transition sm:py-4",
                        "border-border bg-muted/40 hover:bg-muted/70",
                        "dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80",
                        isSelected &&
                          "border-purple-500 bg-purple-500/[0.12] shadow-md ring-2 ring-purple-500/40 dark:border-purple-500 dark:bg-purple-500/15 dark:ring-purple-500/50",
                        !isSelected &&
                          addon.featured &&
                          "border-purple-500/40 bg-purple-500/[0.06] ring-1 ring-purple-500/20 dark:border-purple-600/50"
                      )}
                    >
                      {addon.featured && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                          Popular
                        </span>
                      )}
                      <span className="text-[11px] font-bold tabular-nums text-foreground sm:text-xs dark:text-white">
                        +{addon.tokens.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground dark:text-zinc-500">tokens</span>
                      <span className="mt-2 text-sm font-bold text-purple-600 dark:text-purple-400">
                        {addon.priceLabel}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </fieldset>

            {/* Step 2 — payment */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-zinc-500">
                <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white dark:bg-purple-500">
                  2
                </span>
                How would you like to pay?
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPaymentMethod("stripe")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition sm:py-4",
                    "border-border bg-muted/30 hover:bg-muted/60",
                    "dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/70",
                    paymentMethod === "stripe" &&
                      "border-purple-500 bg-purple-500/[0.1] shadow-sm ring-2 ring-purple-500/35 dark:border-purple-500 dark:bg-purple-500/15 dark:ring-purple-500/45"
                  )}
                >
                  <CreditCard
                    className={cn(
                      "h-6 w-6",
                      paymentMethod === "stripe" ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="text-[11px] font-bold leading-tight text-foreground dark:text-white sm:text-xs">
                    Card (Stripe)
                  </span>
                  <span className="text-[10px] text-muted-foreground dark:text-zinc-500">Debit or credit</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPaymentMethod("believe_points")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition sm:py-4",
                    "border-border bg-muted/30 hover:bg-muted/60",
                    "dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/70",
                    paymentMethod === "believe_points" &&
                      "border-amber-500/80 bg-amber-500/[0.08] shadow-sm ring-2 ring-amber-500/30 dark:border-amber-500 dark:bg-amber-500/10 dark:ring-amber-500/40"
                  )}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 shadow-sm">
                    <Coins className="h-4 w-4 text-zinc-900" aria-hidden />
                  </span>
                  <span className="text-[11px] font-bold leading-tight text-foreground dark:text-white sm:text-xs">
                    Believe Points
                  </span>
                  <span className="text-[10px] text-muted-foreground dark:text-zinc-500">BIP wallet</span>
                </button>
              </div>
            </fieldset>

            <div className="border-t border-border pt-6 dark:border-zinc-800">
              <button
                type="button"
                disabled={continueDisabled}
                onClick={handleContinue}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1 rounded-xl px-4 py-3.5 text-sm font-semibold transition sm:flex-row sm:gap-2",
                  paymentMethod === null &&
                    "cursor-not-allowed bg-muted text-muted-foreground shadow-none dark:bg-zinc-800 dark:text-zinc-400",
                  paymentMethod === "believe_points" &&
                    "bg-gradient-to-r from-amber-600 to-yellow-600 font-semibold text-white shadow-lg hover:from-amber-500 hover:to-yellow-500 focus-visible:outline-amber-500 disabled:opacity-60",
                  paymentMethod === "stripe" &&
                    "bg-gradient-to-r from-purple-600 to-violet-600 font-semibold text-white shadow-lg hover:from-purple-500 hover:to-violet-500 focus-visible:outline-purple-500 disabled:opacity-60",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                    <span>
                      {paymentMethod === "believe_points"
                        ? "Purchasing with Believe Points…"
                        : "Opening Stripe checkout…"}
                    </span>
                  </>
                ) : (
                  <>
                    {paymentMethod === "believe_points" ? (
                      <Coins className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                    ) : paymentMethod === "stripe" ? (
                      <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    ) : null}
                    <span className="text-center text-[13px] sm:text-sm">{continueLabel}</span>
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground dark:text-zinc-500">
                {paymentMethod === null && "Select Card (Stripe) or Believe Points to continue."}
                {paymentMethod === "believe_points" &&
                  "Believe Points — your pack price is deducted from BIP and tokens are added immediately."}
                {paymentMethod === "stripe" &&
                  "Stripe — secure card checkout for the pack you selected above."}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
