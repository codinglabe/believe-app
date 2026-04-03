"use client"

import React, { useState, useEffect, useRef, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import ProfileLayout from "@/components/frontend/layout/user-profile-layout"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Coins,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  History,
  TrendingUp,
  RefreshCw,
  FileText,
  CreditCard,
  Landmark,
  Gift,
  Loader2,
  Receipt,
  CircleHelp,
} from "lucide-react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Purchase {
  id: number
  amount: string
  points: string
  status: string
  created_at: string
  source?: string
  failure_code?: string | null
  failure_message?: string | null
}

interface AutoReplenishProps {
  enabled: boolean
  threshold: number | null
  amount: number | null
  has_payment_method: boolean
  card_brand: string | null
  card_last4: string | null
  last_replenish_at: string | null
}

/** Matches `BelievePointController@index` `feePreview` (buyer pays gross-up like donate “cover fees”). */
interface BelievePointsFeePreview {
  mode: "buyer_covers"
  rail: "card" | "bank"
  base_gift_usd: number
  checkout_total_usd: number
  processing_fee_estimate: number
  card_processing_fee_usd: number
  ach_processing_fee_usd: number
  bank_reward_points: number
  believe_points_credit_usd: number
}

interface PageProps {
  currentBalance: number
  minPurchaseAmount: number
  maxPurchaseAmount: number
  purchases: {
    data: Purchase[]
    links: any
    meta: any
  }
  auth?: { user?: { role?: string } }
  feePreview?: BelievePointsFeePreview | null
  autoReplenish?: AutoReplenishProps
  flash?: {
    success?: string
    error?: string
    info?: string
  }
}

const defaultAutoReplenish: AutoReplenishProps = {
  enabled: false,
  threshold: null,
  amount: null,
  has_payment_method: false,
  card_brand: null,
  card_last4: null,
  last_replenish_at: null,
}

export default function BelievePointsIndex({
  currentBalance,
  minPurchaseAmount,
  maxPurchaseAmount,
  purchases,
  autoReplenish: autoReplenishProp,
}: PageProps) {
  const autoReplenish = { ...defaultAutoReplenish, ...autoReplenishProp }
  const page = usePage<PageProps>()
  const { flash, auth, feePreview: feePreviewProp } = page.props
  const feePreview = feePreviewProp ?? null
  const isSupporter = auth?.user?.role === 'user' || !auth?.user?.role
  const [formData, setFormData] = useState({
    amount: "",
    policyAccepted: false,
  })
  const [paymentRail, setPaymentRail] = useState<"bank" | "card">("bank")
  const [feePreviewLoading, setFeePreviewLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)
  const [arState, setArState] = useState({
    enabled: autoReplenish.enabled,
    threshold:
      autoReplenish.threshold != null && !Number.isNaN(autoReplenish.threshold)
        ? String(autoReplenish.threshold)
        : "",
    amount:
      autoReplenish.amount != null && !Number.isNaN(autoReplenish.amount)
        ? String(autoReplenish.amount)
        : "",
    policyAccepted: false,
  })
  const [arSubmitting, setArSubmitting] = useState(false)

  const believePointsFeePreviewSkipRef = useRef(true)

  /** Inertia partial reload: feePreview from backend (same pattern as /donate). */
  useEffect(() => {
    if (believePointsFeePreviewSkipRef.current) {
      believePointsFeePreviewSkipRef.current = false
      return
    }
    const t = window.setTimeout(() => {
      const q: Record<string, string | number> = {}
      const raw = formData.amount.trim()
      const n = parseFloat(raw)
      const inRange =
        raw !== "" && !Number.isNaN(n) && n >= minPurchaseAmount && n <= maxPurchaseAmount
      if (inRange) {
        q.fee_preview_amount = n
        q.fee_preview_rail = paymentRail
      }
      setFeePreviewLoading(true)
      router.get(route("believe-points.index"), q, {
        preserveScroll: true,
        preserveState: true,
        replace: true,
        only: ["feePreview"],
        onFinish: () => setFeePreviewLoading(false),
        onCancel: () => setFeePreviewLoading(false),
      })
    }, 300)
    return () => window.clearTimeout(t)
  }, [formData.amount, paymentRail, minPurchaseAmount, maxPurchaseAmount])

  useEffect(() => {
    setArState({
      enabled: autoReplenish.enabled,
      threshold:
        autoReplenish.threshold != null && !Number.isNaN(autoReplenish.threshold)
          ? String(autoReplenish.threshold)
          : "",
      amount:
        autoReplenish.amount != null && !Number.isNaN(autoReplenish.amount)
          ? String(autoReplenish.amount)
          : "",
      policyAccepted: false,
    })
  }, [
    autoReplenish.enabled,
    autoReplenish.threshold,
    autoReplenish.amount,
    autoReplenish.has_payment_method,
  ])

  const amountNum = parseFloat(formData.amount)
  const validPurchaseAmount =
    formData.amount !== "" &&
    !Number.isNaN(amountNum) &&
    amountNum >= minPurchaseAmount &&
    amountNum <= maxPurchaseAmount

  const handleChange = (value: string) => {
    // Allow only numbers and one decimal point
    const numericValue = value.replace(/[^0-9.]/g, '')
    // Ensure only one decimal point
    const parts = numericValue.split('.')
    const formattedValue = parts.length > 2
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue

    setFormData({ amount: formattedValue })

    // Clear error
    if (errors.amount) {
      setErrors({})
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const amount = parseFloat(formData.amount)

    if (!formData.amount || isNaN(amount) || amount < minPurchaseAmount) {
      newErrors.amount = `Minimum purchase amount is $${minPurchaseAmount.toFixed(2)}`
    }
    if (amount > maxPurchaseAmount) {
      newErrors.amount = `Maximum purchase amount is $${maxPurchaseAmount.toFixed(2)}`
    }
    if (!formData.policyAccepted) {
      newErrors.policyAccepted = 'You must accept the Points Policy to proceed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const saveAutoReplenish = (e: FormEvent) => {
    e.preventDefault()
    if (arState.enabled) {
      if (!autoReplenish.has_payment_method) {
        showErrorToast("Add a saved card before enabling auto top-up.")
        return
      }
      const th = parseFloat(arState.threshold)
      const amt = parseFloat(arState.amount)
      if (arState.threshold === "" || Number.isNaN(th) || th < 0) {
        showErrorToast("Enter a valid threshold (0 or higher).")
        return
      }
      if (arState.amount === "" || Number.isNaN(amt) || amt < minPurchaseAmount || amt > maxPurchaseAmount) {
        showErrorToast(
          `Top-up amount must be between ${formatCurrency(minPurchaseAmount)} and ${formatCurrency(maxPurchaseAmount)}.`
        )
        return
      }
      if (!arState.policyAccepted) {
        showErrorToast("Accept the auto top-up terms to continue.")
        return
      }
    }

    setArSubmitting(true)
    router.post(
      route("believe-points.auto-replenish.settings"),
      arState.enabled
        ? {
            enabled: true,
            threshold: parseFloat(arState.threshold),
            amount: parseFloat(arState.amount),
            auto_replenish_policy_accepted: true,
          }
        : { enabled: false },
      {
        preserveScroll: true,
        onFinish: () => setArSubmitting(false),
        onError: () => {
          showErrorToast("Could not save auto top-up settings.")
          setArSubmitting(false)
        },
      }
    )
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showErrorToast("Please fix the errors before submitting")
      return
    }

    setIsSubmitting(true)

    router.post(
      route("believe-points.purchase"),
      {
        amount: parseFloat(formData.amount),
        payment_rail: paymentRail,
      },
      {
        onError: (errors) => {
          setErrors(errors as Record<string, string>)
          showErrorToast("Failed to process purchase. Please check the errors.")
          setIsSubmitting(false)
        },
        onFinish: () => {
          setIsSubmitting(false)
        },
      }
    )
  }

  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatPoints = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return "0"
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  const content = (
    <>
      <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
        <div className="space-y-3">
          {flash?.success && (
            <Alert className="border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/25">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">{flash.success}</AlertDescription>
            </Alert>
          )}
          {flash?.error && (
            <Alert className="border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/25">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-900 dark:text-red-100">{flash.error}</AlertDescription>
            </Alert>
          )}
          {flash?.info && (
            <Alert className="border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/25">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">{flash.info}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 space-y-6 sm:space-y-8 lg:col-span-8">
            <Card className="border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm sm:h-14 sm:w-14">
                      <Coins className="h-6 w-6 sm:h-7 sm:w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Balance
                      </p>
                      <p className="mt-0.5 text-3xl font-bold tracking-tight text-gray-900 tabular-nums dark:text-white sm:text-4xl">
                        {formatPoints(currentBalance)}
                      </p>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                        ≈ {formatCurrency(currentBalance)} in Believe Points (1:1 with USD)
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full shrink-0 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/80 sm:w-auto"
                    onClick={() => router.visit(route("believe-points.refunds"))}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refunds
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white px-0 py-0 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <CardHeader className="border-b border-gray-200 bg-gray-50/80 px-4 pb-5 pt-5 dark:border-gray-700 dark:bg-gray-900/40 sm:px-6 sm:pb-6 sm:pt-6">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm ring-4 ring-purple-500/10 dark:ring-purple-400/15">
                    <DollarSign className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4 sm:gap-y-2">
                      <CardTitle className="text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                        Purchase Believe Points
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="w-fit shrink-0 border-gray-300 bg-white/80 font-normal text-gray-600 dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-300"
                      >
                        Secure checkout · Stripe
                      </Badge>
                    </div>
                    <CardDescription className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      Pick <span className="font-medium text-gray-800 dark:text-gray-200">Bank</span> or{" "}
                      <span className="font-medium text-gray-800 dark:text-gray-200">Card</span> below. You receive 1
                      Believe Point per $1 USD. Bank (ACH) checkout earns Merchant Hub reward points; card does not.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Step 1
                      </p>
                      <Label
                        htmlFor="amount"
                        className="text-base font-semibold text-gray-900 dark:text-white"
                      >
                        Amount
                      </Label>
                    </div>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="amount"
                        type="text"
                        value={formData.amount}
                        onChange={(e) => handleChange(e.target.value)}
                        className={cn(
                          "h-14 border-2 border-gray-300 bg-white pl-10 text-xl font-medium tabular-nums text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/25 dark:border-gray-500 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus-visible:border-purple-400 dark:focus-visible:ring-purple-400/30",
                          errors.amount &&
                            "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30 dark:border-red-500",
                        )}
                        placeholder="0.00"
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.amount}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Allowed range {formatCurrency(minPurchaseAmount)} – {formatCurrency(maxPurchaseAmount)}
                    </p>
                  </div>

                  <div className="space-y-4 p-4 sm:p-6">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Step 2
                      </p>
                      <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">Payment method</p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        ACH is cheaper for us to process. Paying by bank also earns Merchant Hub reward points on your
                        purchase.
                      </p>
                    </div>
                    <Tabs
                      value={paymentRail}
                      onValueChange={(v) => setPaymentRail(v as "bank" | "card")}
                      className="w-full"
                    >
                      <TabsList className="grid h-auto min-h-12 w-full grid-cols-2 gap-1 rounded-lg border-2 border-gray-300 bg-gray-100 p-1 dark:border-gray-600 dark:bg-gray-800">
                        <TabsTrigger
                          value="bank"
                          className="gap-1.5 rounded-md px-2 py-2.5 text-xs text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-md dark:text-gray-200 dark:data-[state=active]:bg-gray-950 dark:data-[state=active]:text-white sm:gap-2 sm:px-3 sm:text-sm"
                        >
                          <Landmark className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="min-w-0 text-left leading-tight">
                            <span className="sm:hidden">Bank</span>
                            <span className="hidden sm:inline">Bank (ACH)</span>
                          </span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="card"
                          className="gap-1.5 rounded-md px-2 py-2.5 text-xs text-gray-700 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-md dark:text-gray-200 dark:data-[state=active]:bg-gray-950 dark:data-[state=active]:text-white sm:gap-2 sm:px-3 sm:text-sm"
                        >
                          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                          Card
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent
                        value="bank"
                        className="mt-3 rounded-lg border border-purple-200 bg-purple-50/80 px-4 py-3 text-sm focus-visible:outline-none dark:border-purple-800 dark:bg-purple-950/30"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <Badge className="w-fit border-0 bg-purple-600 text-white hover:bg-purple-600">
                            Recommended
                          </Badge>
                          <p className="text-gray-700 dark:text-gray-200">
                            Lower processing fees · Earns Merchant Hub reward points ($1 = 0.10) on this purchase
                          </p>
                        </div>
                      </TabsContent>
                      <TabsContent
                        value="card"
                        className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus-visible:outline-none dark:border-gray-600 dark:bg-gray-800/60"
                      >
                        <p className="text-gray-700 dark:text-gray-200">
                          Pay with debit or credit card. No Merchant Hub reward bonus on card checkout.
                        </p>
                      </TabsContent>
                    </Tabs>
                    <p className="flex items-start gap-1.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                      <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      <span>
                        Stripe Checkout will only show{" "}
                        {paymentRail === "bank" ? "US bank account (ACH)" : "card"} for this purchase.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-5 bg-gray-50 p-4 sm:p-6 dark:bg-gray-900/35">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Summary
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">Fees &amp; what you get</p>
                    </div>

                  {feePreview && (
                    <div
                      className={cn(
                        "relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800",
                        feePreviewLoading && "opacity-60",
                      )}
                    >
                      {feePreviewLoading && (
                        <div className="absolute right-3 top-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Updating
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                        <Receipt className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        Checkout total (you pay processing)
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        The amount you type is how many Believe Points you receive. Stripe checkout includes an estimated
                        processing add-on so pricing matches card vs bank rates (same model as covering fees on donations).
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <li className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
                          <span>Believe Points credit</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {formatCurrency(feePreview.base_gift_usd)}
                          </span>
                        </li>
                        <li className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
                          <span>Est. processing add-on ({paymentRail === "bank" ? "ACH" : "card"})</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                            {formatCurrency(feePreview.processing_fee_estimate)}
                          </span>
                        </li>
                        <li className="flex flex-wrap justify-between gap-2 pt-0.5">
                          <span className="font-medium text-gray-900 dark:text-white">Total charged in Stripe</span>
                          <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                            {formatCurrency(feePreview.checkout_total_usd)}
                          </span>
                        </li>
                      </ul>
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        Modeled Stripe fee on that {paymentRail === "bank" ? "ACH" : "card"} charge (informational):{" "}
                        <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">
                          {formatCurrency(
                            paymentRail === "bank"
                              ? feePreview.ach_processing_fee_usd
                              : feePreview.card_processing_fee_usd,
                          )}
                        </span>
                        .
                      </p>
                      {paymentRail === "bank" && (
                        <div className="mt-3 flex items-start gap-3 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-3 text-sm dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                            <Gift className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Reward points with bank payment</p>
                            <p className="text-gray-600 dark:text-gray-300">
                              For this amount you&apos;ll earn{" "}
                              <span className="font-semibold tabular-nums text-blue-800 dark:text-blue-200">
                                {feePreview.bank_reward_points.toLocaleString("en-US", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })}
                              </span>{" "}
                              reward points ($1 = 0.10 reward points). These credit your Merchant Hub balance. Card
                              checkout does not include this bonus.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {validPurchaseAmount && (
                    <div className="flex flex-col gap-4 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-purple-800 dark:from-purple-950/25 dark:to-pink-950/25">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300">
                          You receive
                        </p>
                        <p className="mt-1 break-words text-2xl font-bold tracking-tight text-purple-800 tabular-nums dark:text-purple-200 sm:text-3xl">
                          {formatPoints(amountNum)}{" "}
                          <span className="text-base font-semibold text-purple-600/90 dark:text-purple-300/90 sm:text-lg">
                            Believe Points
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                          1:1 with the amount you enter above (points credit; checkout total may be higher with fees)
                        </p>
                      </div>
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center self-start rounded-full bg-purple-500 text-white shadow-sm sm:h-14 sm:w-14 sm:self-center">
                        <Coins className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800/80">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <CircleHelp className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                      Quick facts
                    </h4>
                    <ul className="mt-3 grid gap-2 text-xs text-gray-600 sm:text-sm dark:text-gray-300">
                      <li className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                        <span>1 Believe Point = $1 USD for donations and eligible purchases on Believe.</span>
                      </li>
                      <li className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                        <span>
                          Bank (ACH) usually has a lower add-on than card; bank checkout earns Merchant Hub reward points
                          ($1 = 0.10) on the points amount.
                        </span>
                      </li>
                      <li className="flex gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                        <span>Points usually credit when Stripe confirms; bank debits can take a few business days.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-5 p-4 sm:p-6">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Step 3
                    </p>
                    <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">Agree &amp; pay</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/40">
                      <Checkbox
                        id="policy-accept"
                        checked={formData.policyAccepted}
                        onCheckedChange={(checked) => {
                          setFormData({ ...formData, policyAccepted: checked === true })
                          if (errors.policyAccepted) {
                            setErrors({ ...errors, policyAccepted: '' })
                          }
                        }}
                        className="mt-1 size-5 min-h-5 min-w-5"
                      />
                      <div className="flex-1 space-y-2">
                        <Label
                          htmlFor="policy-accept"
                          className="cursor-pointer text-sm font-medium text-gray-900 dark:text-white"
                        >
                          I have read and agree to the Believe Points Policy
                        </Label>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <p className="font-semibold">Summary:</p>
                          <p>Points are platform credits used only inside Believe. They are not money, cannot be cashed out, and never interact with wallets or bank accounts. Limited refunds available within 7 days for unused points only.</p>
                          <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
                            <DialogTrigger asChild>
                              <button
                                type="button"
                                className="mt-1 font-medium text-purple-600 hover:underline dark:text-purple-400"
                                onClick={(e) => {
                                  e.preventDefault()
                                  setPolicyDialogOpen(true)
                                }}
                              >
                                <FileText className="h-3 w-3 inline mr-1" />
                                Read Full Policy
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
                              <DialogHeader>
                                <DialogTitle>Believe Platform – Points Policy</DialogTitle>
                                <DialogDescription>
                                  Please read and understand the complete Points Policy before purchasing.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6 text-sm">
                                <div>
                                  <h3 className="font-semibold text-base mb-2">1. Purpose of Points</h3>
                                  <p className="text-muted-foreground">
                                    Points are closed‑loop platform credits issued by Believe for use only within the Believe website ecosystem. Points are designed to enable purchases, donations, and organizational activity on the platform and are not a substitute for money.
                                  </p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">2. Nature of Points</h3>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Points are not money, not cash, and not legal tender.</li>
                                    <li>Points do not represent a bank account, wallet balance, or stored monetary value.</li>
                                    <li>Points do not exist within the Believe wallet, virtual account, debit card, or Bridge‑powered payment system.</li>
                                  </ul>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">3. How Points Are Obtained</h3>
                                  <p className="text-muted-foreground mb-2">Points may be obtained by:</p>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside mb-2">
                                    <li>Purchasing Points directly on the Believe website</li>
                                    <li>Receiving Points through promotions, grants, or organizational programs</li>
                                    <li>Receiving Points as part of nonprofit or platform initiatives</li>
                                  </ul>
                                  <p className="text-muted-foreground font-semibold">Points cannot:</p>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Be purchased using wallet balances</li>
                                    <li>Be funded via Believe wallet balances, virtual accounts, or Bridge (purchases on this page use Stripe card or US bank)</li>
                                    <li>Be transferred from or to the Believe wallet system</li>
                                  </ul>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">4. Permitted Uses of Points</h3>
                                  <p className="text-muted-foreground mb-2">Points may be used to:</p>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Purchase products or services available on the Believe website</li>
                                    <li>Donate to qualified nonprofit organizations</li>
                                    <li>Allocate to churches or nonprofit organizations</li>
                                    <li>Enable organizational barter between verified organizations</li>
                                    <li>Purchase gift cards or benefits available within the Believe ecosystem only</li>
                                  </ul>
                                  <p className="text-muted-foreground mt-2">Points have no use outside the Believe platform.</p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">5. Prohibited Uses</h3>
                                  <p className="text-muted-foreground mb-2">Points may not be:</p>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Withdrawn as cash</li>
                                    <li>Redeemed for U.S. dollars or cryptocurrency</li>
                                    <li>Converted into wallet balances or bank funds</li>
                                    <li>Transferred peer‑to‑peer between individual users</li>
                                    <li>Sold, traded, or exchanged on secondary markets</li>
                                    <li>Converted into open‑loop prepaid instruments (e.g., Visa or Mastercard gift cards)</li>
                                  </ul>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">6. Separation From Wallet & Payments</h3>
                                  <p className="text-muted-foreground">
                                    Believe operates a separate financial wallet system for real money transactions. Points never interact with wallets, virtual accounts, debit cards, or cash‑out features. Wallet funds cannot be used to acquire Points. Points cannot be converted into wallet balances. Points and wallet funds are independent systems.
                                  </p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">7. Purchase Limits</h3>
                                  <p className="text-muted-foreground">
                                    Believe may impose reasonable limits on per‑transaction point purchases, monthly point purchases, and maximum point balances. Higher limits may be available to verified organizations. Limits exist to ensure Points function as usage credits, not stored value.
                                  </p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">8. Expiration & Forfeiture</h3>
                                  <p className="text-muted-foreground">
                                    Points may carry an expiration date. Unused Points may expire after a defined period. Expired Points may be forfeited or reallocated to platform or nonprofit programs. Expiration terms are disclosed prior to purchase.
                                  </p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">9. Refund Policy</h3>
                                  <p className="text-muted-foreground mb-2">Points are generally non‑refundable. Limited refunds may be granted:</p>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Only for unused Points</li>
                                    <li>Within a short timeframe (e.g., 7–14 days)</li>
                                    <li>At Believe's discretion</li>
                                    <li>Returned to the original payment method</li>
                                  </ul>
                                  <p className="text-muted-foreground mt-2">Refunds are treated as purchase reversals, not redemptions.</p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">10. Donations Using Points</h3>
                                  <p className="text-muted-foreground">
                                    When Points are given to a qualified nonprofit, the transfer is treated as a charitable donation. Donations are irrevocable. Donors receive no goods or services in exchange. Donation receipts may reflect the defined face value of Points, or a non‑cash contribution description, as applicable.
                                  </p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">11. No Ownership or Investment Rights</h3>
                                  <p className="text-muted-foreground mb-2">Points do not represent:</p>
                                  <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>Ownership</li>
                                    <li>Equity</li>
                                    <li>Profit participation</li>
                                    <li>Revenue share</li>
                                    <li>Investment or appreciation</li>
                                  </ul>
                                  <p className="text-muted-foreground mt-2">Points provide no financial return.</p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">12. Abuse, Enforcement & Termination</h3>
                                  <p className="text-muted-foreground">
                                    Believe reserves the right to suspend or terminate Points access for abuse or misuse, revoke Points obtained through fraud or policy violations, and modify or discontinue the Points program at any time.
                                  </p>
                                </div>

                                <div>
                                  <h3 className="font-semibold text-base mb-2">13. Modifications to This Policy</h3>
                                  <p className="text-muted-foreground">
                                    Believe may update this policy periodically. Material changes will be communicated where required.
                                  </p>
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                                  <h3 className="font-semibold text-base mb-2">Plain‑English Summary</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Points are platform credits used only inside Believe. They are not money, cannot be cashed out, and never interact with wallets or bank accounts.
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setPolicyDialogOpen(false)}
                                >
                                  Close
                                </Button>
                                <Button
                                  onClick={() => {
                                    setFormData({ ...formData, policyAccepted: true })
                                    setPolicyDialogOpen(false)
                                    if (errors.policyAccepted) {
                                      setErrors({ ...errors, policyAccepted: '' })
                                    }
                                  }}
                                >
                                  I Understand & Accept
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                    {errors.policyAccepted && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.policyAccepted}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.amount || !!errors.amount || !formData.policyAccepted}
                    className="h-auto min-h-12 w-full rounded-lg bg-purple-600 px-4 py-3 text-base font-semibold leading-snug text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-500 sm:py-3.5"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        Purchase Believe Points
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-dashed border-gray-300 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-800/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-900 dark:text-white">Auto top-up</CardTitle>
                    <CardDescription className="text-xs leading-snug text-gray-600 dark:text-gray-300">
                      Optional — we charge your saved card when you drop below a threshold (1:1 points). Max once per hour.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  If a charge shows <span className="font-medium text-gray-900 dark:text-white">failed</span>, use{" "}
                  <span className="font-medium text-gray-900 dark:text-white">Replace saved card</span> so your bank can
                  approve off-session payments (e.g. 3D Secure).
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center sm:w-auto"
                    onClick={() => router.visit(route("believe-points.auto-replenish.setup"))}
                  >
                    <CreditCard className="mr-2 h-4 w-4 shrink-0" />
                    {autoReplenish.has_payment_method ? "Replace saved card" : "Add saved card"}
                  </Button>
                  {autoReplenish.has_payment_method && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive sm:w-auto"
                      onClick={() => {
                        if (!confirm("Remove saved card and turn off auto top-up?")) return
                        router.post(route("believe-points.auto-replenish.remove-payment"), {}, { preserveScroll: true })
                      }}
                    >
                      Remove card
                    </Button>
                  )}
                </div>
                {autoReplenish.has_payment_method && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Saved:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(autoReplenish.card_brand || "Card").toUpperCase()} ···· {autoReplenish.card_last4 || "????"}
                    </span>
                  </p>
                )}
                {autoReplenish.last_replenish_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Last top-up: {new Date(autoReplenish.last_replenish_at).toLocaleString()}
                  </p>
                )}
                <form onSubmit={saveAutoReplenish} className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800/60">
                    <Checkbox
                      id="ar-enabled"
                      checked={arState.enabled}
                      onCheckedChange={(checked) => setArState((s) => ({ ...s, enabled: checked === true }))}
                      className="mt-1 size-5 min-h-5 min-w-5"
                    />
                    <Label htmlFor="ar-enabled" className="cursor-pointer text-sm font-medium leading-snug">
                      Enable automatic top-up when my balance is at or below the threshold
                    </Label>
                  </div>
                  {arState.enabled && (
                    <>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ar-threshold">When balance ≤</Label>
                          <div className="relative">
                            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                            <Input
                              id="ar-threshold"
                              className="h-11 border-2 border-gray-300 bg-white pl-9 font-medium tabular-nums text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/25 dark:border-gray-500 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus-visible:border-purple-400 dark:focus-visible:ring-purple-400/30"
                              value={arState.threshold}
                              onChange={(e) =>
                                setArState((s) => ({ ...s, threshold: e.target.value.replace(/[^0-9.]/g, "") }))
                              }
                              placeholder="e.g. 25"
                              disabled={arSubmitting}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ar-amount">Top-up amount</Label>
                          <div className="relative">
                            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                            <Input
                              id="ar-amount"
                              className="h-11 border-2 border-gray-300 bg-white pl-9 font-medium tabular-nums text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/25 dark:border-gray-500 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus-visible:border-purple-400 dark:focus-visible:ring-purple-400/30"
                              value={arState.amount}
                              onChange={(e) =>
                                setArState((s) => ({ ...s, amount: e.target.value.replace(/[^0-9.]/g, "") }))
                              }
                              placeholder="e.g. 50"
                              disabled={arSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Between {formatCurrency(minPurchaseAmount)} and {formatCurrency(maxPurchaseAmount)}.
                      </p>
                      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800/60">
                        <Checkbox
                          id="ar-policy"
                          checked={arState.policyAccepted}
                          onCheckedChange={(checked) =>
                            setArState((s) => ({ ...s, policyAccepted: checked === true }))
                          }
                          className="mt-1 size-5 min-h-5 min-w-5"
                        />
                        <Label htmlFor="ar-policy" className="cursor-pointer text-sm leading-snug">
                          I authorize Believe to charge my saved card for automatic top-ups. Failed charges turn auto
                          top-up off until I add a card again.
                        </Label>
                      </div>
                    </>
                  )}
                  <Button
                    type="submit"
                    disabled={arSubmitting}
                    variant="secondary"
                    className="h-auto min-h-10 w-full rounded-lg px-4 py-2.5 sm:w-auto"
                  >
                    {arSubmitting ? "Saving…" : "Save auto top-up settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <aside className="min-w-0 lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white px-0 py-0 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <CardHeader className="border-b border-gray-200 px-4 pb-4 pt-5 dark:border-gray-700 sm:px-6 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                  <History className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  Recent purchases
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Your latest Believe Point purchases
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
                {purchases.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-950/50">
                      <Coins className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">No purchases yet</p>
                    <p className="mt-1 max-w-[220px] text-xs text-gray-500 dark:text-gray-400">
                      Complete a purchase to see it listed here.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {purchases.data.map((purchase) => (
                      <li
                        key={purchase.id}
                        className="rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-800/80"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatPoints(purchase.points)} Points
                            </span>
                            {purchase.source === "auto_replenish" && (
                              <Badge variant="outline" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          {getStatusBadge(purchase.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                          <span>{formatCurrency(purchase.amount)}</span>
                          <span>
                            {new Date(purchase.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {purchase.status === "failed" && purchase.failure_message && (
                          <p className="mt-2 text-xs leading-snug text-destructive">
                            {purchase.failure_message}
                            {purchase.failure_code ? ` (${purchase.failure_code})` : ""}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  )

  if (isSupporter) {
    return (
      <>
        <Head title="Believe Points" />
        <ProfileLayout title="Believe Points" description="Purchase and manage your Believe Points. 1 Believe Point = $1 USD">
          {content}
        </ProfileLayout>
      </>
    )
  }

  // For organizations and admins, use AppSidebarLayout
  return (
    <AppSidebarLayout>
      <Head title="Believe Points" />
      <div className="m-3 min-w-0 space-y-6 md:m-6">
        <div className="mx-auto max-w-6xl border-b border-gray-200 pb-5 dark:border-gray-700 sm:pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">Believe Points</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Buy platform credits (1 Point = $1 USD) for donations and eligible purchases. Card or bank checkout via
            Stripe.
          </p>
        </div>
        {content}
      </div>
    </AppSidebarLayout>
  )
}

