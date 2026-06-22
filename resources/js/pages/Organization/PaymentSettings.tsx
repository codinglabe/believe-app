"use client"

import { Link, useForm, usePage } from "@inertiajs/react"
import SettingsLayout from "@/layouts/settings/layout"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/admin/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { cn } from "@/lib/utils"
import { showErrorToast } from "@/lib/toast"
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Gift,
  Landmark,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react"
import { QrCodeUpload } from "@/components/payments/QrCodeUpload"
import { useEffect, useMemo, useState } from "react"

interface Props {
  organization: { id: number; name: string }
  settings: {
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
    donation_wallet_info: string | null
  }
  platform: {
    stripe_configured: boolean
    paypal_configured: boolean
  }
  stripeConnect: {
    connected: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
  }
  flash?: { success?: string }
}

type BoolKey =
  | "stripe_card_enabled"
  | "stripe_ach_enabled"
  | "stripe_venmo_enabled"
  | "venmo_manual_enabled"
  | "stripe_cash_app_pay_enabled"
  | "paypal_enabled"
  | "cashapp_manual_enabled"
  | "zelle_enabled"

interface MethodDef {
  key: BoolKey
  label: string
  description: string
  icon: typeof CreditCard
  group: "stripe" | "other" | "manual"
  requiresPlatform?: "stripe" | "paypal"
  badge?: string
}

const METHODS: MethodDef[] = [
  { key: "stripe_card_enabled", label: "Credit & Debit Card", description: "Visa, Mastercard, Amex, Discover via Stripe", icon: CreditCard, group: "stripe", requiresPlatform: "stripe", badge: "Auto" },
  { key: "stripe_ach_enabled", label: "Bank Transfer (ACH)", description: "Direct US bank account payments via Stripe", icon: Landmark, group: "stripe", requiresPlatform: "stripe", badge: "Auto" },
  { key: "stripe_venmo_enabled", label: "Venmo (Stripe)", description: "Automated Venmo via Stripe Checkout", icon: Smartphone, group: "stripe", requiresPlatform: "stripe", badge: "Auto" },
  { key: "stripe_cash_app_pay_enabled", label: "Cash App Pay", description: "Cash App Pay via Stripe (not manual QR)", icon: Smartphone, group: "stripe", requiresPlatform: "stripe", badge: "Auto" },
  { key: "paypal_enabled", label: "PayPal", description: "PayPal checkout with redirect and capture", icon: Wallet, group: "other", requiresPlatform: "paypal", badge: "Auto" },
  { key: "venmo_manual_enabled", label: "Venmo (Manual)", description: "Donors pay your Venmo username — admin verifies", icon: Smartphone, group: "manual", badge: "Manual" },
  { key: "cashapp_manual_enabled", label: "Cash App (Manual)", description: "Donors pay via your cashtag or QR — admin verifies", icon: Smartphone, group: "manual", badge: "Manual" },
  { key: "zelle_enabled", label: "Zelle (Manual)", description: "Donors send via Zelle — admin verifies", icon: Landmark, group: "manual", badge: "Manual" },
]

function MethodRow({
  method,
  enabled,
  onToggle,
  platformReady,
  stripeConnectReady,
}: {
  method: MethodDef
  enabled: boolean
  onToggle: (v: boolean) => void
  platformReady: boolean
  stripeConnectReady: boolean
}) {
  const Icon = method.icon
  const blocked = method.requiresPlatform === "stripe" && !platformReady
  const stripeNeedsConnect = method.group === "stripe" && platformReady && !stripeConnectReady

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border p-4 transition-all",
        enabled
          ? "border-purple-300 bg-purple-50/60 dark:border-purple-600/50 dark:bg-purple-950/30"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/40",
        blocked && "opacity-60",
      )}
    >
      <div className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
        enabled ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">{method.label}</span>
          {method.badge && (
            <Badge variant={method.badge === "Manual" ? "secondary" : "default"} className="text-[10px]">
              {method.badge}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{method.description}</p>
        {blocked && (
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">Platform Stripe keys not configured by BIU admin.</p>
        )}
        {stripeNeedsConnect && (
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
            Connect Stripe payouts in{" "}
            <Link href={route("integrations.stripe-connect")} className="underline font-medium">
              Integrations
            </Link>{" "}
            to receive card/ACH donations directly.
          </p>
        )}
      </div>
      <Switch checked={enabled && !blocked} disabled={blocked} onCheckedChange={onToggle} />
    </div>
  )
}

export default function OrganizationPaymentSettings({
  organization,
  settings,
  platform,
  stripeConnect,
  flash,
}: Props) {
  const pageFlash = usePage().props.flash as { success?: string } | undefined
  const successMessage = flash?.success ?? pageFlash?.success
  const [showSaved, setShowSaved] = useState(false)

  const { data, setData, post, processing, recentlySuccessful, errors } = useForm({
    stripe_card_enabled: settings.stripe_card_enabled,
    stripe_ach_enabled: settings.stripe_ach_enabled,
    stripe_venmo_enabled: settings.stripe_venmo_enabled,
    venmo_manual_enabled: settings.venmo_manual_enabled,
    venmo_username: settings.venmo_username ?? "",
    stripe_cash_app_pay_enabled: settings.stripe_cash_app_pay_enabled,
    paypal_enabled: settings.paypal_enabled,
    cashapp_manual_enabled: settings.cashapp_manual_enabled,
    zelle_enabled: settings.zelle_enabled,
    cashapp_cashtag: settings.cashapp_cashtag ?? "",
    cashapp_qr_image: null as File | null,
    zelle_email: settings.zelle_email ?? "",
    zelle_phone: settings.zelle_phone ?? "",
    donation_wallet_info: settings.donation_wallet_info ?? "",
  })

  const enabledCount = useMemo(
    () => METHODS.filter((m) => data[m.key]).length,
    [data],
  )

  const stripeConnectReady = stripeConnect.charges_enabled && stripeConnect.payouts_enabled

  useEffect(() => {
    if (recentlySuccessful || successMessage) {
      setShowSaved(true)
      setData("cashapp_qr_image", null)
      const t = window.setTimeout(() => setShowSaved(false), 4000)
      return () => clearTimeout(t)
    }
  }, [recentlySuccessful, successMessage, setData])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    if (data.venmo_manual_enabled && !data.venmo_username.trim()) {
      showErrorToast("Venmo username is required when Venmo (Manual) is enabled.")
      return
    }
    if (data.zelle_enabled) {
      if (!data.zelle_email.trim()) {
        showErrorToast("Zelle email is required when Zelle is enabled.")
        return
      }
      if (!data.zelle_phone.trim()) {
        showErrorToast("Zelle phone is required when Zelle is enabled.")
        return
      }
    }
    if (data.cashapp_manual_enabled) {
      const hasCashtag = data.cashapp_cashtag.trim().length > 0
      const hasQr = Boolean(data.cashapp_qr_image) || Boolean(settings.cashapp_qr_image_url)
      if (!hasCashtag && !hasQr) {
        showErrorToast("Cash App cashtag or QR code is required when Cash App (Manual) is enabled.")
        return
      }
    }

    post(route("organization.payment-settings.update"), { forceFormData: true, preserveScroll: true })
  }

  const toggle = (key: BoolKey, value: boolean) => setData(key, value)

  return (
    <SettingsLayout
      activeTab="donation-payments"
      pageTitle="Donation Payments"
      pageSubtitle={`Choose which payment methods donors can use when giving to ${organization.name}.`}
    >
      <form onSubmit={submit} className="space-y-6">
        {(showSaved || successMessage) && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage ?? "Settings saved successfully."}
          </div>
        )}

        {/* Summary strip */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-purple-200/60 dark:border-purple-800/40">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{enabledCount}</div>
              <div className="text-sm text-muted-foreground">Methods enabled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {platform.stripe_configured ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium text-sm">Stripe {platform.stripe_configured ? "ready" : "not configured"}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Platform-wide keys (BIU admin)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {stripeConnectReady ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium text-sm">
                  {stripeConnectReady ? "Stripe Connect active" : "Stripe Connect needed"}
                </span>
              </div>
              {!stripeConnectReady && (
                <Link
                  href={route("integrations.stripe-connect")}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-purple-600 hover:underline dark:text-purple-400"
                >
                  Set up payouts <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border border-purple-200/50 bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:border-purple-800/40 dark:from-purple-950/40 dark:to-blue-950/30">
          <div className="flex items-start gap-3">
            <Gift className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-purple-900 dark:text-purple-100">BRP reward</p>
              <p className="text-purple-800/80 dark:text-purple-200/80 mt-0.5">
                Every successful donation gives donors <strong>+5 BRP (Believe Reward Points)</strong>, regardless of payment method.
              </p>
            </div>
          </div>
        </div>

        {/* Automated methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Automated payments</CardTitle>
            <CardDescription>
              Stripe and PayPal confirm automatically via webhooks. Donors complete checkout on BIU.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {METHODS.filter((m) => m.group !== "manual").map((method) => (
              <MethodRow
                key={method.key}
                method={method}
                enabled={data[method.key]}
                onToggle={(v) => toggle(method.key, v)}
                platformReady={
                  method.requiresPlatform === "paypal"
                    ? platform.paypal_configured
                    : platform.stripe_configured
                }
                stripeConnectReady={stripeConnectReady}
              />
            ))}
            {!platform.paypal_configured && data.paypal_enabled && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                PayPal is enabled but platform PayPal credentials are not set. Contact BIU admin.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Manual methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manual verification</CardTitle>
            <CardDescription>
              Donors transfer outside BIU, confirm payment, and upload a receipt. BIU admin approves before rewards are issued.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {METHODS.filter((m) => m.group === "manual").map((method) => (
              <MethodRow
                key={method.key}
                method={method}
                enabled={data[method.key]}
                onToggle={(v) => toggle(method.key, v)}
                platformReady
                stripeConnectReady={stripeConnectReady}
              />
            ))}

            {(data.cashapp_manual_enabled || data.zelle_enabled || data.venmo_manual_enabled) && (
              <div className="mt-6 space-y-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 dark:border-gray-600 dark:bg-gray-900/30">
                {data.venmo_manual_enabled && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Venmo setup (manual)
                    </h3>
                    <div>
                      <Label htmlFor="venmo_username">Venmo username <span className="text-red-500">*</span></Label>
                      <Input
                        id="venmo_username"
                        className={cn("mt-1 max-w-md", errors.venmo_username && "border-red-500")}
                        placeholder="@YourOrganization"
                        value={data.venmo_username}
                        onChange={(e) => setData("venmo_username", e.target.value)}
                      />
                      {errors.venmo_username && (
                        <p className="mt-1 text-sm text-red-600">{errors.venmo_username}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Donors will send payment to this Venmo handle and confirm manually.
                      </p>
                    </div>
                  </div>
                )}

                {data.cashapp_manual_enabled && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Smartphone className="h-4 w-4" /> Cash App setup
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="cashtag">Cashtag <span className="text-muted-foreground text-xs">(or QR →)</span></Label>
                        <Input
                          id="cashtag"
                          className={cn("mt-1", errors.cashapp_cashtag && "border-red-500")}
                          placeholder="$YourOrganization"
                          value={data.cashapp_cashtag}
                          onChange={(e) => setData("cashapp_cashtag", e.target.value)}
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
                          existingUrl={settings.cashapp_qr_image_url}
                          file={data.cashapp_qr_image}
                          onChange={(file) => setData("cashapp_qr_image", file)}
                          error={errors.cashapp_qr_image}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {data.zelle_enabled && (
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Landmark className="h-4 w-4" /> Zelle setup
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="zelle_email">Zelle email <span className="text-red-500">*</span></Label>
                        <Input
                          id="zelle_email"
                          type="email"
                          className={cn("mt-1", errors.zelle_email && "border-red-500")}
                          placeholder="donations@yourorg.org"
                          value={data.zelle_email}
                          onChange={(e) => setData("zelle_email", e.target.value)}
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
                          placeholder="+1 (555) 123-4567"
                          value={data.zelle_phone}
                          onChange={(e) => setData("zelle_phone", e.target.value)}
                        />
                        {errors.zelle_phone && (
                          <p className="mt-1 text-sm text-red-600">{errors.zelle_phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="wallet_info">Instructions for donors (optional)</Label>
                  <Textarea
                    id="wallet_info"
                    className="mt-1"
                    rows={3}
                    placeholder="Include memo text, business name, or special instructions…"
                    value={data.donation_wallet_info}
                    onChange={(e) => setData("donation_wallet_info", e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Changes apply immediately on the{" "}
            <Link href={route("donate")} className="text-purple-600 underline dark:text-purple-400">
              public donate page
            </Link>
            .
          </p>
          <Button
            type="submit"
            disabled={processing}
            className="min-w-[140px] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save payment settings"
            )}
          </Button>
        </div>
      </form>
    </SettingsLayout>
  )
}
