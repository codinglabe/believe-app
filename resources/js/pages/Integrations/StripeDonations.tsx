"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, usePage } from "@inertiajs/react"
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
    email: string | null
  }
  requireConnectForPublicDonations: boolean
  stripeConfigured: boolean
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
  syncError,
  connectError,
}: Props) {
  const { errors } = usePage().props as { errors?: InertiaPageErrors }
  const [submitting, setSubmitting] = useState(false)

  const ready = organization.stripe_connect_charges_enabled && organization.stripe_connect_payouts_enabled
  const hasAccount = !!organization.stripe_connect_account_id
  const inProgress = hasAccount && !ready

  const formError = errors?.stripe ?? null
  const inlineError = connectError || formError || syncError

  const startUrl = route("integrations.stripe-connect.start")

  const handleStart = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!stripeConfigured || !organization.email) {
      e.preventDefault()
      return
    }
    setSubmitting(true)
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
          Connect Stripe Express so one-time card and US bank donations can be settled directly into your nonprofit's bank account.
          Funds flow on Stripe's rails — BIU never holds your donation money.
        </p>

        <div className="mb-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium mb-2">How a donation is split when Stripe Connect is active</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Donor pays</span> the gift amount (plus the processing fee, if they opt to cover it).
            </li>
            <li>
              <span className="font-medium text-foreground">BIU receives</span> only the processing-fee portion as a Stripe{" "}
              <code className="text-xs bg-background px-1 py-0.5 rounded border">application_fee</code> — used to offset Stripe's card fees.
            </li>
            <li>
              <span className="font-medium text-foreground">Your organization receives</span> the remaining gift amount, transferred straight to your
              connected Stripe Express account and paid out to your bank on Stripe's normal payout schedule.
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Receipts and statement descriptors still show your nonprofit (Stripe <code className="text-xs">on_behalf_of</code>) so donors see the gift
            as going to your organization, not BIU.
          </p>
        </div>

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

        {!organization.email ? (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">Add an organization email first</p>
              <p className="text-amber-800 dark:text-amber-200 mt-1">
                Stripe requires a contact email to create your Express account. Please set the organization email under{" "}
                <Link href={route("dashboard")} className="underline font-medium">
                  Settings → Profile
                </Link>{" "}
                and try again.
              </p>
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
                  <p className="font-medium">Stripe payouts enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Qualifying one-time gifts to your organization where Care Alliance splitting is not controlling settlement can route
                    through direct charges when this onboarding is active.
                  </p>
                </div>
              </div>
            ) : inProgress ? (
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
                <div className="space-y-1">
                  <p className="font-medium">Stripe onboarding partially complete</p>
                  <p className="text-sm text-muted-foreground">
                    Your Stripe account is created but Stripe still needs more information before it can charge cards
                    {organization.stripe_connect_payouts_enabled ? "" : " or send payouts"}. Click below to continue where you left off.
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
                  <p className="font-medium">Finish Stripe onboarding</p>
                  <p className="text-sm text-muted-foreground">
                    {requireConnectForPublicDonations
                      ? "This environment is configured to require Connect before accepting direct card/bank gifts to your listing."
                      : "Until onboarding is complete, donors may use the legacy platform checkout path when available."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild disabled={submitting || !stripeConfigured || !organization.email}>
                <a
                  href={startUrl}
                  onClick={handleStart}
                  aria-disabled={submitting || !stripeConfigured || !organization.email}
                  className={(!stripeConfigured || !organization.email) ? "pointer-events-none opacity-60" : ""}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
                      Redirecting…
                    </>
                  ) : ready ? (
                    "Re-open Stripe dashboard"
                  ) : hasAccount ? (
                    "Continue Stripe onboarding"
                  ) : (
                    "Continue to Stripe"
                  )}
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={route("dashboard")}>Back to dashboard</Link>
              </Button>
            </div>

            {organization.stripe_connect_account_id ? (
              <p className="text-xs text-muted-foreground font-mono break-all">
                Connected account: {organization.stripe_connect_account_id}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4">
          Need help? Make sure (1) the platform Stripe account has Connect activated at{" "}
          <a
            href="https://dashboard.stripe.com/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            dashboard.stripe.com/connect
          </a>
          , and (2) your nonprofit profile has a valid email and country set.
        </p>
      </div>
    </AppLayout>
  )
}
