"use client"

import React, { useState, FormEvent } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/admin/ui/switch"
import { Coins, Save, AlertCircle, CheckCircle2, DollarSign, TrendingUp, Users, History, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react"
import { QrCodeUpload } from "@/components/payments/QrCodeUpload"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type PaymentBoolKey =
  | "stripe_card_enabled"
  | "stripe_ach_enabled"
  | "stripe_venmo_enabled"
  | "venmo_manual_enabled"
  | "stripe_cash_app_pay_enabled"
  | "paypal_enabled"
  | "cashapp_manual_enabled"
  | "zelle_enabled"

interface PaymentSettings {
  stripe_card_enabled: boolean
  stripe_ach_enabled: boolean
  stripe_venmo_enabled: boolean
  venmo_manual_enabled: boolean
  venmo_username: string | null
  stripe_cash_app_pay_enabled: boolean
  paypal_enabled: boolean
  cashapp_manual_enabled: boolean
  zelle_enabled: boolean
  cashapp_cashtag: string | null
  cashapp_qr_image_url: string | null
  zelle_email: string | null
  zelle_phone: string | null
  payment_instructions: string | null
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Believe Points Management", href: "#" },
]

interface Purchase {
  id: number
  user: {
    id: number
    name: string
    email: string
  }
  amount: string
  points: string
  status: string
  created_at: string
  bp_status?: string
  settlement_status?: string
  settlement_date?: string | null
  settlement_reference?: string | null
  current_bp_owner?: { id: number; name: string | null; email: string | null } | null
}

interface PageProps {
  settings: {
    enabled: boolean
    min_purchase_amount: number
    max_purchase_amount: number
    brp_value: number
    platform_fee_percent: number
    processing_fee_percent: number
    free_brp_award: number
    prime_brp_award: number
    card_hold_hours: number
    ach_hold_hours: number
    supporter_pays_processing_fee: boolean
    supporter_pays_platform_fee: boolean
    payer_covers_transaction_fee: boolean
    card_settlement_business_days: number
    ach_settlement_business_days: number
    require_bridge_reserve_confirmation: boolean
  }
  statistics: {
    total_purchases: number
    total_revenue: number
    total_points_issued: number
  }
  recentPurchases: Purchase[]
  paymentSettings: PaymentSettings
  platform: {
    stripe_configured: boolean
    paypal_configured: boolean
  }
  flash?: {
    success?: string
    error?: string
  }
}

export default function AdminBelievePointsIndex({ settings, statistics, recentPurchases, paymentSettings, platform }: PageProps) {
  const { flash } = usePage().props as any
  const [formData, setFormData] = useState({
    enabled: settings.enabled,
    min_purchase_amount: settings.min_purchase_amount.toString(),
    max_purchase_amount: settings.max_purchase_amount.toString(),
    brp_value: settings.brp_value.toString(),
    platform_fee_percent: settings.platform_fee_percent.toString(),
    processing_fee_percent: settings.processing_fee_percent.toString(),
    free_brp_award: settings.free_brp_award.toString(),
    prime_brp_award: settings.prime_brp_award.toString(),
    card_hold_hours: settings.card_hold_hours.toString(),
    ach_hold_hours: settings.ach_hold_hours.toString(),
    supporter_pays_processing_fee: settings.supporter_pays_processing_fee,
    supporter_pays_platform_fee: settings.supporter_pays_platform_fee,
    payer_covers_transaction_fee: settings.payer_covers_transaction_fee ?? true,
    card_settlement_business_days: (settings.card_settlement_business_days ?? 1).toString(),
    ach_settlement_business_days: (settings.ach_settlement_business_days ?? 3).toString(),
    require_bridge_reserve_confirmation: settings.require_bridge_reserve_confirmation ?? true,
    stripe_card_enabled: paymentSettings.stripe_card_enabled,
    stripe_ach_enabled: paymentSettings.stripe_ach_enabled,
    stripe_venmo_enabled: paymentSettings.stripe_venmo_enabled,
    venmo_manual_enabled: paymentSettings.venmo_manual_enabled,
    venmo_username: paymentSettings.venmo_username ?? "",
    stripe_cash_app_pay_enabled: paymentSettings.stripe_cash_app_pay_enabled,
    paypal_enabled: paymentSettings.paypal_enabled,
    cashapp_manual_enabled: paymentSettings.cashapp_manual_enabled,
    zelle_enabled: paymentSettings.zelle_enabled,
    cashapp_cashtag: paymentSettings.cashapp_cashtag ?? "",
    zelle_email: paymentSettings.zelle_email ?? "",
    zelle_phone: paymentSettings.zelle_phone ?? "",
    payment_instructions: paymentSettings.payment_instructions ?? "",
    cashapp_qr_image: null as File | null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setFormData(prev => ({ ...prev, [field]: value }))
    } else {
      // Allow only numbers and one decimal point
      const numericValue = value.replace(/[^0-9.]/g, '')
      // Ensure only one decimal point
      const parts = numericValue.split('.')
      const formattedValue = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : numericValue

      setFormData(prev => ({
        ...prev,
        [field]: formattedValue
      }))
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const minAmount = parseFloat(formData.min_purchase_amount)
    const maxAmount = parseFloat(formData.max_purchase_amount)

    if (!formData.min_purchase_amount || isNaN(minAmount) || minAmount < 1) {
      newErrors.min_purchase_amount = "Minimum purchase amount must be at least $1"
    }
    if (!formData.max_purchase_amount || isNaN(maxAmount) || maxAmount < 1) {
      newErrors.max_purchase_amount = "Maximum purchase amount must be at least $1"
    }
    if (minAmount >= maxAmount) {
      newErrors.max_purchase_amount = "Maximum purchase amount must be greater than minimum"
    }

    const brpValue = parseFloat(formData.brp_value)
    if (!formData.brp_value || Number.isNaN(brpValue) || brpValue < 0) {
      newErrors.brp_value = "BRP value must be zero or greater"
    }
    const platformFee = parseFloat(formData.platform_fee_percent)
    if (!formData.platform_fee_percent || Number.isNaN(platformFee) || platformFee < 0 || platformFee > 100) {
      newErrors.platform_fee_percent = "Platform fee must be between 0 and 100"
    }
    const processingFee = parseFloat(formData.processing_fee_percent)
    if (!formData.processing_fee_percent || Number.isNaN(processingFee) || processingFee < 0 || processingFee > 100) {
      newErrors.processing_fee_percent = "Processing fee must be between 0 and 100"
    }
    const freeBrp = parseFloat(formData.free_brp_award)
    if (formData.free_brp_award === "" || Number.isNaN(freeBrp) || freeBrp < 0) {
      newErrors.free_brp_award = "Free member BRP award must be zero or greater"
    }
    const primeBrp = parseFloat(formData.prime_brp_award)
    if (formData.prime_brp_award === "" || Number.isNaN(primeBrp) || primeBrp < 0) {
      newErrors.prime_brp_award = "Prime member BRP award must be zero or greater"
    }
    const holdHours = parseInt(formData.card_hold_hours, 10)
    if (formData.card_hold_hours === "" || Number.isNaN(holdHours) || holdHours < 0 || holdHours > 720) {
      newErrors.card_hold_hours = "New card hold hours must be between 0 and 720"
    }
    const achHoldHours = parseInt(formData.ach_hold_hours, 10)
    if (formData.ach_hold_hours === "" || Number.isNaN(achHoldHours) || achHoldHours < 0 || achHoldHours > 720) {
      newErrors.ach_hold_hours = "ACH hold hours must be between 0 and 720"
    }
    const cardSettlementDays = parseInt(formData.card_settlement_business_days, 10)
    if (Number.isNaN(cardSettlementDays) || cardSettlementDays < 0 || cardSettlementDays > 30) {
      newErrors.card_settlement_business_days = "Card settlement days must be between 0 and 30"
    }
    const achSettlementDays = parseInt(formData.ach_settlement_business_days, 10)
    if (Number.isNaN(achSettlementDays) || achSettlementDays < 0 || achSettlementDays > 30) {
      newErrors.ach_settlement_business_days = "ACH settlement days must be between 0 and 30"
    }

    if (formData.venmo_manual_enabled && !formData.venmo_username.trim()) {
      newErrors.venmo_username = "Venmo username is required when Venmo (Manual) is enabled"
    }
    if (formData.zelle_enabled) {
      if (!formData.zelle_email.trim()) {
        newErrors.zelle_email = "Zelle email is required when Zelle is enabled"
      }
      if (!formData.zelle_phone.trim()) {
        newErrors.zelle_phone = "Zelle phone is required when Zelle is enabled"
      }
    }
    if (formData.cashapp_manual_enabled) {
      const hasCashtag = formData.cashapp_cashtag.trim().length > 0
      const hasQr = Boolean(formData.cashapp_qr_image) || Boolean(paymentSettings.cashapp_qr_image_url)
      if (!hasCashtag && !hasQr) {
        newErrors.cashapp_cashtag = "Cash App cashtag or QR code is required when Cash App (Manual) is enabled"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showErrorToast("Please fix the errors before submitting")
      return
    }

    setIsSubmitting(true)

    router.post(
      route("admin.believe-points.update"),
      {
        _method: "put",
        enabled: formData.enabled,
        min_purchase_amount: parseFloat(formData.min_purchase_amount),
        max_purchase_amount: parseFloat(formData.max_purchase_amount),
        brp_value: parseFloat(formData.brp_value),
        platform_fee_percent: parseFloat(formData.platform_fee_percent),
        processing_fee_percent: parseFloat(formData.processing_fee_percent),
        free_brp_award: parseFloat(formData.free_brp_award),
        prime_brp_award: parseFloat(formData.prime_brp_award),
        card_hold_hours: parseInt(formData.card_hold_hours, 10),
        ach_hold_hours: parseInt(formData.ach_hold_hours, 10),
        supporter_pays_processing_fee: formData.supporter_pays_processing_fee,
        supporter_pays_platform_fee: formData.supporter_pays_platform_fee,
        payer_covers_transaction_fee: formData.payer_covers_transaction_fee,
        card_settlement_business_days: parseInt(formData.card_settlement_business_days, 10),
        ach_settlement_business_days: parseInt(formData.ach_settlement_business_days, 10),
        require_bridge_reserve_confirmation: formData.require_bridge_reserve_confirmation,
        stripe_card_enabled: formData.stripe_card_enabled,
        stripe_ach_enabled: formData.stripe_ach_enabled,
        stripe_venmo_enabled: formData.stripe_venmo_enabled,
        venmo_manual_enabled: formData.venmo_manual_enabled,
        venmo_username: formData.venmo_username,
        stripe_cash_app_pay_enabled: formData.stripe_cash_app_pay_enabled,
        paypal_enabled: formData.paypal_enabled,
        cashapp_manual_enabled: formData.cashapp_manual_enabled,
        zelle_enabled: formData.zelle_enabled,
        cashapp_cashtag: formData.cashapp_cashtag,
        zelle_email: formData.zelle_email,
        zelle_phone: formData.zelle_phone,
        payment_instructions: formData.payment_instructions,
        ...(formData.cashapp_qr_image ? { cashapp_qr_image: formData.cashapp_qr_image } : {}),
      },
      {
        forceFormData: true,
        onSuccess: () => {
          showSuccessToast("Believe Points settings updated successfully")
          setFormData((prev) => ({ ...prev, cashapp_qr_image: null }))
          setIsSubmitting(false)
        },
        onError: (errors) => {
          setErrors(errors as Record<string, string>)
          showErrorToast("Failed to update settings. Please check the errors.")
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

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Believe Points Management" />
      <div className="m-3 md:m-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Believe Points Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Configure the Believe Points system. Supporters and organizations can purchase Believe Points through Stripe.
          </p>
        </div>

        {/* Success/Error Messages */}
        {flash?.success && (
          <Alert className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-200">
              {flash.success}
            </AlertDescription>
          </Alert>
        )}

        {flash?.error && (
          <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {flash.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_purchases}</div>
              <p className="text-xs text-muted-foreground">Completed transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(statistics.total_revenue)}</div>
              <p className="text-xs text-muted-foreground">From all purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Issued</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPoints(statistics.total_points_issued)}</div>
              <p className="text-xs text-muted-foreground">Believe Points distributed</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Believe Points Settings
            </CardTitle>
            <CardDescription>
              Configure the Believe Points purchase system, rewards, fees, and settlement rules for the Add Believe Points flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base font-semibold">
                    Enable Believe Points
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow supporters and organizations to purchase Believe Points
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => handleChange("enabled", checked)}
                  disabled={isSubmitting}
                />
              </div>

              <Separator />

              {/* Purchase Limits */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min_purchase_amount" className="text-base font-semibold">
                    Minimum Purchase Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="min_purchase_amount"
                      type="text"
                      value={formData.min_purchase_amount}
                      onChange={(e) => handleChange("min_purchase_amount", e.target.value)}
                      className={cn(
                        "h-12 text-lg pl-10",
                        errors.min_purchase_amount && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="10.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.min_purchase_amount && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.min_purchase_amount}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Minimum amount users can spend to purchase Believe Points
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_purchase_amount" className="text-base font-semibold">
                    Maximum Purchase Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="max_purchase_amount"
                      type="text"
                      value={formData.max_purchase_amount}
                      onChange={(e) => handleChange("max_purchase_amount", e.target.value)}
                      className={cn(
                        "h-12 text-lg pl-10",
                        errors.max_purchase_amount && "border-red-500 focus-visible:ring-red-500"
                      )}
                      placeholder="10000.00"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.max_purchase_amount && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.max_purchase_amount}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Maximum amount users can spend in a single purchase
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Purchase Rewards &amp; Fees</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure BRP value, platform fee, the flat BRP reward per purchase by membership tier, who pays the fees, and the card/ACH hold periods for the Add Believe Points purchase flow.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg sm:col-span-2 bg-muted/20">
                    <div className="min-w-0 pr-4">
                      <Label htmlFor="payer_covers_transaction_fee" className="text-sm font-medium">Purchaser Covers Transaction Fee</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        When on, the supporter is charged enough to cover Believe Points, the payment processing fee, and the platform fee.
                      </p>
                    </div>
                    <Switch
                      id="payer_covers_transaction_fee"
                      checked={formData.payer_covers_transaction_fee}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          payer_covers_transaction_fee: checked,
                          supporter_pays_processing_fee: checked,
                          supporter_pays_platform_fee: checked,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg sm:col-span-2">
                    <div className="min-w-0 pr-4">
                      <Label htmlFor="supporter_pays_platform_fee" className="text-sm font-medium">Supporter Pays Platform Fee</Label>
                      <p className="text-xs text-muted-foreground mt-1">When on, the BIU platform fee is added on top of the supporter's BP amount. When off, BIU absorbs it.</p>
                    </div>
                    <Switch
                      id="supporter_pays_platform_fee"
                      checked={formData.supporter_pays_platform_fee}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, supporter_pays_platform_fee: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg sm:col-span-2">
                    <div className="min-w-0 pr-4">
                      <Label htmlFor="supporter_pays_processing_fee" className="text-sm font-medium">Supporter Pays Processing Fee</Label>
                      <p className="text-xs text-muted-foreground mt-1">When on, the Stripe payment processing fee is added on top so BIU receives the full BP value. When off, BIU absorbs it.</p>
                    </div>
                    <Switch
                      id="supporter_pays_processing_fee"
                      checked={formData.supporter_pays_processing_fee}
                      disabled={isSubmitting}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, supporter_pays_processing_fee: checked }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brp_value">BRP Value (USD)</Label>
                    <Input
                      id="brp_value"
                      type="text"
                      value={formData.brp_value}
                      onChange={(e) => handleChange("brp_value", e.target.value)}
                      className={cn(errors.brp_value && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.brp_value && <p className="text-sm text-red-600">{errors.brp_value}</p>}
                    <p className="text-xs text-muted-foreground">Default: $0.005 per BRP</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform_fee_percent">Platform Fee (%)</Label>
                    <Input
                      id="platform_fee_percent"
                      type="text"
                      value={formData.platform_fee_percent}
                      onChange={(e) => handleChange("platform_fee_percent", e.target.value)}
                      className={cn(errors.platform_fee_percent && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.platform_fee_percent && <p className="text-sm text-red-600">{errors.platform_fee_percent}</p>}
                    <p className="text-xs text-muted-foreground">Applied to BP purchase amount. Default: 1%</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processing_fee_percent">Processing Fee (%)</Label>
                    <Input
                      id="processing_fee_percent"
                      type="text"
                      value={formData.processing_fee_percent}
                      onChange={(e) => handleChange("processing_fee_percent", e.target.value)}
                      className={cn(errors.processing_fee_percent && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.processing_fee_percent && <p className="text-sm text-red-600">{errors.processing_fee_percent}</p>}
                    <p className="text-xs text-muted-foreground">Legacy estimate only. The processing fee charged to supporters is now derived from actual Stripe rates so BIU nets the full BP value.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="free_brp_award">Free Member BRP per Transaction</Label>
                    <Input
                      id="free_brp_award"
                      type="text"
                      value={formData.free_brp_award}
                      onChange={(e) => handleChange("free_brp_award", e.target.value)}
                      className={cn(errors.free_brp_award && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.free_brp_award && <p className="text-sm text-red-600">{errors.free_brp_award}</p>}
                    <p className="text-xs text-muted-foreground">BRP earned per qualifying BP purchase for Free (non-Prime) supporters. Default: 5 BRP per transaction.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prime_brp_award">Prime / Org BRP per Transaction</Label>
                    <Input
                      id="prime_brp_award"
                      type="text"
                      value={formData.prime_brp_award}
                      onChange={(e) => handleChange("prime_brp_award", e.target.value)}
                      className={cn(errors.prime_brp_award && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.prime_brp_award && <p className="text-sm text-red-600">{errors.prime_brp_award}</p>}
                    <p className="text-xs text-muted-foreground">BRP earned per qualifying BP purchase for Prime supporters. Default: 10 BRP per transaction.</p>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="card_hold_hours">New Card Security Hold (hours)</Label>
                    <Input
                      id="card_hold_hours"
                      type="text"
                      value={formData.card_hold_hours}
                      onChange={(e) => handleChange("card_hold_hours", e.target.value.replace(/[^0-9]/g, ""))}
                      className={cn(errors.card_hold_hours && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.card_hold_hours && <p className="text-sm text-red-600">{errors.card_hold_hours}</p>}
                    <p className="text-xs text-muted-foreground">
                      Extra security hold for BP bought with a new card, on top of Stripe settlement. Use 0 for none.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ach_hold_hours">ACH Extra Hold (hours)</Label>
                    <Input
                      id="ach_hold_hours"
                      type="text"
                      value={formData.ach_hold_hours}
                      onChange={(e) => handleChange("ach_hold_hours", e.target.value.replace(/[^0-9]/g, ""))}
                      className={cn(errors.ach_hold_hours && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.ach_hold_hours && <p className="text-sm text-red-600">{errors.ach_hold_hours}</p>}
                    <p className="text-xs text-muted-foreground">
                      Extra hold after ACH settlement before BP becomes Available. Use 0 to release on settlement.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card_settlement_business_days">Card Settlement Business Days</Label>
                    <Input
                      id="card_settlement_business_days"
                      type="text"
                      value={formData.card_settlement_business_days}
                      onChange={(e) => handleChange("card_settlement_business_days", e.target.value.replace(/[^0-9]/g, ""))}
                      className={cn("max-w-xs", errors.card_settlement_business_days && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.card_settlement_business_days && (
                      <p className="text-sm text-red-600">{errors.card_settlement_business_days}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ach_settlement_business_days">ACH Settlement Business Days</Label>
                    <Input
                      id="ach_settlement_business_days"
                      type="text"
                      value={formData.ach_settlement_business_days}
                      onChange={(e) => handleChange("ach_settlement_business_days", e.target.value.replace(/[^0-9]/g, ""))}
                      className={cn("max-w-xs", errors.ach_settlement_business_days && "border-red-500")}
                      disabled={isSubmitting}
                    />
                    {errors.ach_settlement_business_days && (
                      <p className="text-sm text-red-600">{errors.ach_settlement_business_days}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4 sm:col-span-2">
                    <div className="space-y-0.5 pr-4">
                      <Label htmlFor="require_bridge_reserve_confirmation" className="text-base font-semibold">
                        Require Bridge Reserve Confirmation
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        BP becomes Available only after Stripe funds are ready and BIU reserve confirms the transfer.
                      </p>
                    </div>
                    <Switch
                      id="require_bridge_reserve_confirmation"
                      checked={formData.require_bridge_reserve_confirmation}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, require_bridge_reserve_confirmation: checked }))
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Methods */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Purchase Payment Methods</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose which payment options supporters and organizations can use when buying Believe Points — same model as organization donation payments.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    { key: "stripe_card_enabled" as PaymentBoolKey, label: "Credit & Debit Card", icon: CreditCard, needsStripe: true },
                    { key: "stripe_ach_enabled" as PaymentBoolKey, label: "Bank Transfer (ACH)", icon: Landmark, needsStripe: true },
                    { key: "stripe_venmo_enabled" as PaymentBoolKey, label: "Venmo (Stripe)", icon: Smartphone, needsStripe: true },
                    { key: "stripe_cash_app_pay_enabled" as PaymentBoolKey, label: "Cash App Pay", icon: Smartphone, needsStripe: true },
                    { key: "paypal_enabled" as PaymentBoolKey, label: "PayPal", icon: Wallet, needsPaypal: true },
                    { key: "venmo_manual_enabled" as PaymentBoolKey, label: "Venmo (Manual)", icon: Smartphone },
                    { key: "cashapp_manual_enabled" as PaymentBoolKey, label: "Cash App (Manual)", icon: Smartphone },
                    { key: "zelle_enabled" as PaymentBoolKey, label: "Zelle (Manual)", icon: Landmark },
                  ]).map(({ key, label, icon: Icon, needsStripe, needsPaypal }) => {
                    const blocked = (needsStripe && !platform.stripe_configured) || (needsPaypal && !platform.paypal_configured)
                    return (
                      <div key={key} className={cn("flex items-center justify-between p-3 border rounded-lg", blocked && "opacity-60")}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm font-medium truncate">{label}</span>
                        </div>
                        <Switch
                          checked={formData[key] && !blocked}
                          disabled={blocked || isSubmitting}
                          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, [key]: checked }))}
                        />
                      </div>
                    )
                  })}
                </div>

                {(formData.cashapp_manual_enabled || formData.zelle_enabled || formData.venmo_manual_enabled) && (
                  <div className="space-y-4 rounded-lg border border-dashed p-4">
                    {formData.venmo_manual_enabled && (
                      <div>
                        <Label htmlFor="venmo_username">Venmo username <span className="text-red-500">*</span></Label>
                        <Input
                          id="venmo_username"
                          className={cn("mt-1 max-w-md", errors.venmo_username && "border-red-500")}
                          placeholder="@BelieveInUnity"
                          value={formData.venmo_username}
                          onChange={(e) => setFormData((prev) => ({ ...prev, venmo_username: e.target.value }))}
                          disabled={isSubmitting}
                        />
                        {errors.venmo_username && (
                          <p className="mt-1 text-sm text-red-600">{errors.venmo_username}</p>
                        )}
                      </div>
                    )}
                    {formData.cashapp_manual_enabled && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="cashtag">Cash App cashtag <span className="text-muted-foreground text-xs">(or QR →)</span></Label>
                          <Input
                            id="cashtag"
                            className={cn("mt-1", errors.cashapp_cashtag && "border-red-500")}
                            placeholder="$BelieveInUnity"
                            value={formData.cashapp_cashtag}
                            onChange={(e) => setFormData((prev) => ({ ...prev, cashapp_cashtag: e.target.value }))}
                            disabled={isSubmitting}
                          />
                          {errors.cashapp_cashtag && (
                            <p className="mt-1 text-sm text-red-600">{errors.cashapp_cashtag}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="cashapp_qr">QR code image <span className="text-muted-foreground text-xs">(or cashtag ←)</span></Label>
                          <QrCodeUpload
                            id="cashapp_qr"
                            className="mt-1"
                            existingUrl={paymentSettings.cashapp_qr_image_url}
                            file={formData.cashapp_qr_image}
                            onChange={(file) => setFormData((prev) => ({ ...prev, cashapp_qr_image: file }))}
                            disabled={isSubmitting}
                            error={errors.cashapp_qr_image}
                          />
                        </div>
                      </div>
                    )}
                    {formData.zelle_enabled && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="zelle_email">Zelle email <span className="text-red-500">*</span></Label>
                          <Input
                            id="zelle_email"
                            type="email"
                            className={cn("mt-1", errors.zelle_email && "border-red-500")}
                            value={formData.zelle_email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, zelle_email: e.target.value }))}
                            disabled={isSubmitting}
                          />
                          {errors.zelle_email && (
                            <p className="mt-1 text-sm text-red-600">{errors.zelle_email}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="zelle_phone">Zelle phone <span className="text-red-500">*</span></Label>
                          <Input
                            id="zelle_phone"
                            className={cn("mt-1", errors.zelle_phone && "border-red-500")}
                            value={formData.zelle_phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, zelle_phone: e.target.value }))}
                            disabled={isSubmitting}
                          />
                          {errors.zelle_phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.zelle_phone}</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="payment_instructions">Instructions for buyers (optional)</Label>
                      <Textarea
                        id="payment_instructions"
                        className="mt-1"
                        rows={3}
                        placeholder="Include memo text or special instructions…"
                        value={formData.payment_instructions}
                        onChange={(e) => setFormData((prev) => ({ ...prev, payment_instructions: e.target.value }))}
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Manual methods require admin verification before points are credited. Review pending payments under Admin → Manual Payment Verification.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Information Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How It Works
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Believe Points are platform credits purchased through enabled payment methods (Stripe, PayPal, Venmo, Cash App, Zelle)</li>
                  <li>Points credit as Processing BP after payment; they become Available BP after settlement</li>
                  <li>Processing BP can be donated; wallet, marketplace, and gift cards use Available BP only</li>
                  <li>Both supporters and organizations can purchase Believe Points</li>
                  <li>Purchase history is tracked for all transactions</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Purchases
            </CardTitle>
            <CardDescription>
              Latest Believe Points purchase transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No purchases yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>BP Status</TableHead>
                    <TableHead>Settlement</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{purchase.user.name}</div>
                          <div className="text-sm text-muted-foreground">{purchase.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                      <TableCell>{formatPoints(purchase.points)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {purchase.bp_status ?? "processing"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            variant={
                              purchase.settlement_status === "available"
                                ? "default"
                                : purchase.settlement_status === "failed" || purchase.settlement_status === "reversed"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="capitalize"
                          >
                            {purchase.settlement_status ?? purchase.status}
                          </Badge>
                          {purchase.settlement_reference && (
                            <p className="max-w-[140px] truncate text-xs text-muted-foreground" title={purchase.settlement_reference}>
                              {purchase.settlement_reference}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {purchase.current_bp_owner?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(purchase.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

