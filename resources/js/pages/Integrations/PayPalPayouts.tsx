"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, useForm, usePage } from "@inertiajs/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Wallet } from "lucide-react"

interface Props {
  organization: { name: string }
  paypal: {
    connected: boolean
    payouts_enabled: boolean
    email: string | null
    connected_at: string | null
  }
  paypalConfigured: boolean
  preferredPayoutMethod: string | null
}

export default function PayPalPayouts({
  organization,
  paypal,
  paypalConfigured,
  preferredPayoutMethod,
}: Props) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }

  const form = useForm({
    paypal_payout_email: paypal.email ?? "",
  })

  const connect = (e: React.FormEvent) => {
    e.preventDefault()
    form.post(route("integrations.paypal-payouts.connect"), { preserveScroll: true })
  }

  const disconnect = () => {
    if (!confirm("Remove PayPal payout connection?")) return
    form.post(route("integrations.paypal-payouts.disconnect"), { preserveScroll: true })
  }

  return (
    <AppLayout>
      <Head title="PayPal payouts" />
      <div className="container max-w-2xl py-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Wallet className="h-7 w-7" aria-hidden />
          PayPal Business payouts
        </h1>
        <p className="text-muted-foreground mb-6">
          Connect the PayPal Business account where {organization.name} should receive payouts for Marketplace,
          Merchant Hub, Courses, and Events.
        </p>

        {flash?.success ? (
          <div className="mb-4 rounded-md border border-green-300 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-200">
            {flash.success}
          </div>
        ) : null}
        {flash?.error ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
            {flash.error}
          </div>
        ) : null}

        {!paypalConfigured ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200">
              PayPal is not configured for this site. The platform admin must add PayPal API keys before organizations can connect.
            </p>
          </div>
        ) : null}

        {preferredPayoutMethod !== "paypal" ? (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            PayPal is connected but not selected as your preferred payout method.{" "}
            <Link href={route("integrations.payout-settings")} className="underline font-medium">
              Update payout settings
            </Link>
          </div>
        ) : null}

        <Card>
          <CardContent className="pt-6 space-y-4">
            {paypal.payouts_enabled ? (
              <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">PayPal payouts enabled</p>
                  <p className="text-sm text-muted-foreground break-all">{paypal.email}</p>
                  {paypal.connected_at ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Connected {new Date(paypal.connected_at).toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">
                  Enter the email address for your PayPal Business account. This must be a verified PayPal Business account that can receive payouts.
                </p>
              </div>
            )}

            <form onSubmit={connect} className="space-y-4">
              <div>
                <Label htmlFor="paypal_payout_email">PayPal Business email</Label>
                <Input
                  id="paypal_payout_email"
                  type="email"
                  value={form.data.paypal_payout_email}
                  onChange={(e) => form.setData("paypal_payout_email", e.target.value)}
                  placeholder="finance@yourorganization.org"
                  className="mt-1"
                  disabled={!paypalConfigured}
                />
                {form.errors.paypal_payout_email ? (
                  <p className="text-sm text-red-600 mt-1">{form.errors.paypal_payout_email}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={form.processing || !paypalConfigured}>
                  {form.processing ? "Saving…" : paypal.payouts_enabled ? "Update email" : "Connect PayPal"}
                </Button>
                {paypal.payouts_enabled ? (
                  <Button type="button" variant="outline" onClick={disconnect} disabled={form.processing}>
                    Disconnect
                  </Button>
                ) : null}
                <Button variant="outline" asChild>
                  <Link href={route("integrations.payout-settings")}>Back to payout settings</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          When BIU settles funds for your organization, we check your preferred payout method and send the payout through PayPal Payouts to this email address.
        </p>
      </div>
    </AppLayout>
  )
}
