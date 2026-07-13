import React, { useState } from "react"
import { Head, Link, router, useForm, usePage } from "@inertiajs/react"
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from "@/components/merchant-ui"
import { MerchantButton } from "@/components/merchant-ui"
import { MerchantInput } from "@/components/merchant-ui"
import { MerchantLabel } from "@/components/merchant-ui"
import { MerchantDashboardLayout } from "@/components/merchant"
import { AlertCircle, CheckCircle2, ExternalLink, Landmark, Loader2, Wallet } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

interface Readiness {
  preferred_payout_method: string | null
  preferred_payout_method_label: string | null
  stripe: {
    connected: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    account_type: string | null
    is_legacy_express: boolean
    ready: boolean
  }
  paypal: {
    connected: boolean
    payouts_enabled: boolean
    email: string | null
    connected_at: string | null
  }
  payout_ready: boolean
}

interface Props {
  merchant: { name: string; business_name: string | null; email: string }
  readiness: Readiness
  availableMethods: Array<{ value: string; label: string }>
  stripeConfigured: boolean
  paypalConfigured: boolean
  modules: string[]
  connectError: string | null
  isLegacyExpressAccount: boolean
}

export default function MerchantPayoutSettings({
  merchant,
  readiness,
  availableMethods,
  stripeConfigured,
  paypalConfigured,
  modules,
  connectError,
  isLegacyExpressAccount,
}: Props) {
  const { flash } = usePage().props as { flash?: { success?: string; error?: string } }
  const [stripeSubmitting, setStripeSubmitting] = useState(false)

  const preferredForm = useForm({
    preferred_payout_method: readiness.preferred_payout_method ?? "",
  })

  const paypalForm = useForm({
    paypal_payout_email: readiness.paypal.email ?? merchant.email ?? "",
  })

  React.useEffect(() => {
    if (flash?.success) showSuccessToast(flash.success)
    if (flash?.error) showErrorToast(flash.error)
  }, [flash?.success, flash?.error])

  const moduleLabels = modules.map((m) =>
    m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  )

  const savePreferred = (e: React.FormEvent) => {
    e.preventDefault()
    preferredForm.patch(route("merchant.payouts.preferred-method"), {
      preserveScroll: true,
      onSuccess: () => showSuccessToast("Preferred payout method updated."),
      onError: () => showErrorToast("Could not update payout method."),
    })
  }

  const connectPayPal = (e: React.FormEvent) => {
    e.preventDefault()
    paypalForm.post(route("merchant.payouts.paypal.connect"), {
      preserveScroll: true,
      onSuccess: () => showSuccessToast("PayPal payout email saved."),
      onError: () => showErrorToast("Could not save PayPal email."),
    })
  }

  const disconnectPayPal = () => {
    if (!confirm("Remove PayPal payout connection?")) return
    router.post(route("merchant.payouts.paypal.disconnect"), {}, {
      preserveScroll: true,
      onSuccess: () => showSuccessToast("PayPal disconnected."),
    })
  }

  const startStripe = () => {
    if (!stripeConfigured || isLegacyExpressAccount) return
    setStripeSubmitting(true)
    window.location.href = route("merchant.payouts.stripe-connect.start")
  }

  const disconnectStripe = () => {
    if (!confirm("Disconnect this Stripe account? You can reconnect with a Standard Stripe account afterward.")) {
      return
    }
    router.post(route("merchant.payouts.stripe-connect.disconnect"), {}, {
      preserveScroll: true,
      onSuccess: () => showSuccessToast("Stripe disconnected."),
    })
  }

  const displayName = merchant.business_name || merchant.name

  return (
    <>
      <Head title="Payout Settings" />
      <MerchantDashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Payout settings</h1>
            <p className="text-gray-400">
              Choose how {displayName} receives payouts for {moduleLabels.join(", ")}.
            </p>
          </div>

          {connectError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {connectError}
            </div>
          ) : null}

          <MerchantCard>
            <MerchantCardHeader>
              <MerchantCardTitle className="text-white">Preferred payout method</MerchantCardTitle>
            </MerchantCardHeader>
            <MerchantCardContent>
              <form onSubmit={savePreferred} className="space-y-4">
                <div>
                  <MerchantLabel htmlFor="preferred_payout_method">Method</MerchantLabel>
                  <select
                    id="preferred_payout_method"
                    value={preferredForm.data.preferred_payout_method}
                    onChange={(e) => preferredForm.setData("preferred_payout_method", e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-[#2563EB]/30 bg-black/50 px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select a method…</option>
                    {availableMethods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <MerchantButton type="submit" disabled={preferredForm.processing || !preferredForm.data.preferred_payout_method}>
                  Save preference
                </MerchantButton>
              </form>

              {readiness.payout_ready ? (
                <div className="flex items-start gap-2 text-green-400 mt-4 pt-4 border-t border-[#2563EB]/20">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p className="text-sm">Ready via {readiness.preferred_payout_method_label}.</p>
                </div>
              ) : readiness.preferred_payout_method ? (
                <div className="flex items-start gap-2 text-amber-300 mt-4 pt-4 border-t border-[#2563EB]/20">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm">Complete setup for your selected method below.</p>
                </div>
              ) : null}
            </MerchantCardContent>
          </MerchantCard>

          <div className="grid gap-4 md:grid-cols-2">
            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-[#2563EB]" />
                  Stripe Connect
                </MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent className="space-y-4">
                <p className="text-sm text-gray-400">
                  Bank payouts via a Standard Stripe account — you manage your own Stripe Dashboard.
                </p>
                {isLegacyExpressAccount || readiness.stripe.is_legacy_express ? (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    This merchant is linked to a legacy Express Stripe account. Disconnect below, then connect again with Standard Connect.
                  </div>
                ) : null}
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>Charges: {readiness.stripe.charges_enabled ? "yes" : "no"}</li>
                  <li>Payouts: {readiness.stripe.payouts_enabled ? "yes" : "no"}</li>
                  {readiness.stripe.account_type ? (
                    <li>Account type: {readiness.stripe.account_type}</li>
                  ) : null}
                </ul>
                {!stripeConfigured ? (
                  <p className="text-xs text-red-400">Stripe is not configured on this platform.</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <MerchantButton
                    type="button"
                    onClick={startStripe}
                    disabled={stripeSubmitting || !stripeConfigured || isLegacyExpressAccount || readiness.stripe.is_legacy_express}
                  >
                    {stripeSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {readiness.stripe.ready ? "Manage Stripe" : "Connect Standard Stripe"}
                    <ExternalLink className="h-3.5 w-3.5 ml-2" />
                  </MerchantButton>
                  {readiness.stripe.connected ? (
                    <MerchantButton type="button" variant="outline" onClick={disconnectStripe}>
                      Disconnect
                    </MerchantButton>
                  ) : null}
                </div>
              </MerchantCardContent>
            </MerchantCard>

            <MerchantCard>
              <MerchantCardHeader>
                <MerchantCardTitle className="text-white flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-[#2563EB]" />
                  PayPal Business
                </MerchantCardTitle>
              </MerchantCardHeader>
              <MerchantCardContent>
                <form onSubmit={connectPayPal} className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Receive payouts to your PayPal Business email.
                  </p>
                  {!paypalConfigured ? (
                    <p className="text-xs text-red-400">PayPal is not configured on this platform.</p>
                  ) : null}
                  <div>
                    <MerchantLabel htmlFor="paypal_payout_email">PayPal Business email</MerchantLabel>
                    <MerchantInput
                      id="paypal_payout_email"
                      type="email"
                      value={paypalForm.data.paypal_payout_email}
                      onChange={(e) => paypalForm.setData("paypal_payout_email", e.target.value)}
                      className="mt-1"
                      disabled={!paypalConfigured}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <MerchantButton type="submit" disabled={paypalForm.processing || !paypalConfigured}>
                      {readiness.paypal.payouts_enabled ? "Update" : "Connect"}
                    </MerchantButton>
                    {readiness.paypal.payouts_enabled ? (
                      <MerchantButton type="button" variant="outline" onClick={disconnectPayPal}>
                        Disconnect
                      </MerchantButton>
                    ) : null}
                  </div>
                </form>
              </MerchantCardContent>
            </MerchantCard>
          </div>

          <p className="text-xs text-gray-500">
            Bridge is planned as a future payout option and is not available yet.{" "}
            <Link href={route("merchant.settings")} className="text-[#60A5FA] hover:underline">
              Back to settings
            </Link>
          </p>
        </div>
      </MerchantDashboardLayout>
    </>
  )
}
