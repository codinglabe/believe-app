"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Landmark, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink, Loader2 } from "lucide-react"
import { useState } from "react"

interface Props {
  organization: {
    name: string
    stripe_connect_account_id: string | null
    stripe_connect_charges_enabled: boolean
    stripe_connect_payouts_enabled: boolean
    stripe_connect_account_type: string | null
    email: string | null
  }
  requireConnectForPublicDonations: boolean
  stripeConfigured: boolean
  connectClientConfigured: boolean
  isLegacyExpressAccount: boolean
  oauthCallbackUrl: string
  syncError: string | null
  connectError: string | null
}

interface InertiaPageErrors {
  stripe?: string
  [key: string]: string | undefined
}

export default function StripeDonations({
  organization,
  requireConnectForPublicDonations,
  stripeConfigured,
  connectClientConfigured,
  isLegacyExpressAccount,
  oauthCallbackUrl,
  syncError,
  connectError,
}: Props) {
  const { errors } = usePage().props as { errors?: InertiaPageErrors }
  const [submitting, setSubmitting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const ready = organization.stripe_connect_charges_enabled
    && organization.stripe_connect_payouts_enabled
    && !isLegacyExpressAccount
  const hasAccount = !!organization.stripe_connect_account_id
  const inProgress = hasAccount && !ready && !isLegacyExpressAccount

  const formError = errors?.stripe ?? null
  const inlineError = connectError || formError || syncError

  const startUrl = route("integrations.stripe-connect.start")

  const handleStart = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!stripeConfigured || !connectClientConfigured) {
      e.preventDefault()
      return
    }
    setSubmitting(true)
  }

  const handleDisconnect = () => {
    if (!window.confirm("Disconnect this Stripe account from BIU? You can reconnect with a Standard Stripe account afterward.")) {
      return
    }
    setDisconnecting(true)
    router.post(route("integrations.stripe-connect.disconnect"), {}, {
      onFinish: () => setDisconnecting(false),
    })
  }

  return (
    <AppLayout>
      <Head title="Stripe payouts (donations)" />
      <div className="container max-w-2xl py-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Landmark className="h-7 w-7" aria-hidden />
          Stripe payouts for donations
        </h1>
        <p className="text-muted-foreground mb-6">
          Connect your nonprofit&apos;s <strong>Standard Stripe account</strong> so one-time card and US bank donations settle directly into your bank account.
          You manage payouts, disputes, and tax documents in your own Stripe Dashboard — BIU never holds your donation money.
        </p>

        <div className="mb-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium mb-2">How a donation is split when Stripe Connect is active</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Donor pays</span> the gift amount (plus the processing fee, if they opt to cover it).
            </li>
            <li>
              <span className="font-medium text-foreground">BIU receives</span> only the processing-fee portion on the platform balance — used to offset Stripe&apos;s card fees. BIU charges <strong>no platform fee</strong> on donations.
            </li>
            <li>
              <span className="font-medium text-foreground">Your organization receives</span> 100% of the gift amount in your connected Standard Stripe account, paid out on your normal Stripe schedule.
            </li>
          </ul>
        </div>

        {isLegacyExpressAccount ? (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">Reconnect with a Standard Stripe account</p>
              <p className="text-amber-800 dark:text-amber-200 mt-1">
                This organization was linked to a legacy Stripe Express account. Disconnect below, then connect again using Standard Connect OAuth so your nonprofit owns and manages its own Stripe Dashboard.
              </p>
            </div>
          </div>
        ) : null}

        {!stripeConfigured ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-red-800 dark:text-red-200">Stripe is not configured for this site</p>
              <p className="text-red-700 dark:text-red-300 mt-1">
                The platform admin must add Stripe API keys (Admin → Payment Methods → Stripe) before any organization can connect.
              </p>
            </div>
          </div>
        ) : null}

        {stripeConfigured && !connectClientConfigured ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-red-800 dark:text-red-200">Stripe Connect client ID missing</p>
              <p className="text-red-700 dark:text-red-300 mt-1">
                The platform admin must set <code className="text-xs">STRIPE_CONNECT_CLIENT_ID</code> (from Stripe Dashboard → Connect → Settings) and register this callback URL:
              </p>
              <p className="mt-2 font-mono text-xs break-all text-red-800 dark:text-red-200">{oauthCallbackUrl}</p>
            </div>
          </div>
        ) : null}

        {inlineError ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-red-800 dark:text-red-200">Stripe could not complete the request</p>
              <p className="text-red-700 dark:text-red-300 mt-1 break-words">{inlineError}</p>
              {/connect/i.test(inlineError) ? (
                <a
                  href="https://dashboard.stripe.com/connect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 underline font-medium text-red-800 dark:text-red-200"
                >
                  Open Stripe Connect dashboard
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <Card>
          <CardContent className="pt-6 space-y-4">
            {ready ? (
              <div className="flex items-start gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium">Standard Stripe account connected</p>
                  <p className="text-sm text-muted-foreground">
                    Qualifying one-time gifts to your organization can route directly to your Stripe account. Manage payouts and settings at{" "}
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">
                      dashboard.stripe.com
                    </a>.
                  </p>
                </div>
              </div>
            ) : inProgress ? (
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <div className="space-y-1">
                  <p className="font-medium">Stripe setup in progress</p>
                  <p className="text-sm text-muted-foreground">
                    Your Standard Stripe account is linked but Stripe still needs more information before it can charge cards
                    {organization.stripe_connect_payouts_enabled ? "" : " or send payouts"}. Finish setup in your Stripe Dashboard.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    <li>
                      • Charges enabled:{" "}
                      <span className={organization.stripe_connect_charges_enabled ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                        {organization.stripe_connect_charges_enabled ? "yes" : "no"}
                      </span>
                    </li>
                    <li>
                      • Payouts enabled:{" "}
                      <span className={organization.stripe_connect_payouts_enabled ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                        {organization.stripe_connect_payouts_enabled ? "yes" : "no"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium">Connect your Standard Stripe account</p>
                  <p className="text-sm text-muted-foreground">
                    {requireConnectForPublicDonations
                      ? "This environment requires Standard Connect before accepting direct card/bank gifts to your listing."
                      : "Until connected, donors may use the legacy platform checkout path when available."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild disabled={submitting || !stripeConfigured || !connectClientConfigured}>
                <a
                  href={startUrl}
                  onClick={handleStart}
                  aria-disabled={submitting || !stripeConfigured || !connectClientConfigured}
                  className={(!stripeConfigured || !connectClientConfigured) ? "pointer-events-none opacity-60" : ""}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                      Redirecting…
                    </>
                  ) : hasAccount && !isLegacyExpressAccount ? (
                    "Reconnect Stripe account"
                  ) : (
                    "Connect Standard Stripe account"
                  )}
                </a>
              </Button>
              {hasAccount ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disconnecting}
                  onClick={handleDisconnect}
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                      Disconnecting…
                    </>
                  ) : (
                    "Disconnect"
                  )}
                </Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link href={route("dashboard")}>Back to dashboard</Link>
              </Button>
            </div>

            {organization.stripe_connect_account_id ? (
              <p className="text-xs text-muted-foreground font-mono break-all">
                Connected account: {organization.stripe_connect_account_id}
                {organization.stripe_connect_account_type ? ` (${organization.stripe_connect_account_type})` : ""}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          Platform admin: enable Connect at{" "}
          <a href="https://dashboard.stripe.com/connect" target="_blank" rel="noopener noreferrer" className="underline">
            dashboard.stripe.com/connect
          </a>
          , set <code className="text-xs">STRIPE_CONNECT_CLIENT_ID</code>, and add the OAuth redirect URI shown above.
        </p>
      </div>
    </AppLayout>
  )
}
