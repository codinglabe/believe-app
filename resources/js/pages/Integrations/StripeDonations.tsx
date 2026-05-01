"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link } from "@inertiajs/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Landmark, CheckCircle2, AlertCircle } from "lucide-react"

interface Props {
  organization: {
    name: string
    stripe_connect_account_id: string | null
    stripe_connect_charges_enabled: boolean
    stripe_connect_payouts_enabled: boolean
  }
  requireConnectForPublicDonations: boolean
}

export default function StripeDonations({ organization, requireConnectForPublicDonations }: Props) {
  const ready = organization.stripe_connect_charges_enabled && organization.stripe_connect_payouts_enabled

  return (
    <AppLayout>
      <Head title="Stripe payouts (donations)" />
      <div className="container max-w-2xl py-8">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Landmark className="h-7 w-7" aria-hidden />
          Stripe payouts for donations
        </h1>
        <p className="text-muted-foreground mb-6">
          Connect Stripe Express so one-time card and US bank donations can be charged directly to your nonprofit. Funds are settled and
          paid out by Stripe; BIU logs each gift without taking a donation platform fee. Processing fees may still apply.
        </p>
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
              <Button asChild>
                <a href={route("integrations.stripe-connect.start")}>Continue to Stripe</a>
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
      </div>
    </AppLayout>
  )
}
