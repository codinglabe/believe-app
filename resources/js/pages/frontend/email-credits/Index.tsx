"use client"

import { useState } from "react"
import { Head, Link, usePage } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import UnityMeetLayout from "@/layouts/UnityMeetLayout"
import { PageHead } from "@/components/frontend/PageHead"
import { cn } from "@/lib/utils"
import { postStripeCheckoutRedirect } from "@/lib/stripe-checkout-post"
import { ArrowLeft, Loader2, Mail } from "lucide-react"

interface EmailPackage {
  id: number
  name: string
  description: string | null
  emails_count: number
  price: number
  purchasable: boolean
}

interface Props {
  emailStats: {
    emails_included: number
    emails_used: number
    emails_left: number
  }
  emailPackages: EmailPackage[]
  stripeMinCheckoutUsd: number
  returnRoute: string
  returnId: number | null
}

export default function EmailCreditsIndex({
  emailStats,
  emailPackages,
  stripeMinCheckoutUsd,
  returnRoute,
  returnId,
}: Props) {
  const { success, error, errors } = usePage<{
    success?: string
    error?: string
    errors?: { message?: string }
  }>().props
  const purchasablePackages = emailPackages.filter((pkg) => pkg.purchasable)
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    purchasablePackages[0]?.id ?? null
  )
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const backHref =
    returnRoute === "livestreams.supporter.show" || returnRoute === "livestreams.supporter.ready"
      ? returnId
        ? route(returnRoute, returnId)
        : route("livestreams.supporter.index")
      : route(returnRoute)

  const purchase = async () => {
    if (!selectedPackageId) {
      return
    }

    setPurchasing(true)
    setPurchaseError(null)

    const result = await postStripeCheckoutRedirect(route("email-credits.purchase"), {
      package_id: selectedPackageId,
      return_route: returnRoute,
      return_id: returnId ?? undefined,
    })

    if (!result.ok) {
      setPurchaseError(result.message)
      setPurchasing(false)
    }
  }

  const usagePercent =
    emailStats.emails_included > 0
      ? Math.min(100, Math.round((emailStats.emails_used / emailStats.emails_included) * 100))
      : 0

  return (
    <UnityMeetLayout>
      <PageHead
        title="Email credits"
        description="Buy prepaid email credits for Unity Meet invitations."
      />
      <Head title="Email credits" />

      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-purple-200 bg-gradient-to-r from-purple-600/10 to-blue-600/10 dark:border-purple-500/20">
          <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Email credits</h1>
                <p className="text-sm text-muted-foreground">
                  Each Unity Meet invitation uses one email credit.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-6">
          {success ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
              {success}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {errors?.message ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errors.message}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your balance</CardTitle>
              <CardDescription>Included in your plan plus any packs you purchase.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-4">
                  <p className="text-2xl font-bold tabular-nums">{emailStats.emails_left.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Left</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-4">
                  <p className="text-2xl font-bold tabular-nums">{emailStats.emails_used.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Used</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-4">
                  <p className="text-2xl font-bold tabular-nums">{emailStats.emails_included.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Included</p>
                </div>
              </div>
              {emailStats.emails_included > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Usage</span>
                    <span>{usagePercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all",
                        usagePercent >= 100 && "from-amber-500 to-orange-500"
                      )}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buy email credits</CardTitle>
              <CardDescription>Select a pack and pay securely with card.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailPackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No email packages are available right now. Please check back later.
                </p>
              ) : purchasablePackages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No packs meet Stripe&apos;s ${stripeMinCheckoutUsd.toFixed(2)} minimum charge. Contact support or try again later.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {emailPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => {
                          if (pkg.purchasable) {
                            setSelectedPackageId(pkg.id)
                          }
                        }}
                        disabled={!pkg.purchasable}
                        className={cn(
                          "w-full rounded-xl border-2 p-4 text-left transition-all",
                          !pkg.purchasable && "cursor-not-allowed opacity-60",
                          selectedPackageId === pkg.id
                            ? "border-purple-500 bg-purple-500/5 dark:border-purple-400"
                            : "border-border hover:border-purple-300 dark:hover:border-purple-500/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              +{pkg.emails_count.toLocaleString()} email{pkg.emails_count === 1 ? "" : "s"}
                            </p>
                            <p className="text-sm text-muted-foreground">{pkg.name}</p>
                            {!pkg.purchasable ? (
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                Below ${stripeMinCheckoutUsd.toFixed(2)} card minimum — choose a larger pack.
                              </p>
                            ) : null}
                            {pkg.description ? (
                              <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>
                            ) : null}
                          </div>
                          <p className="text-xl font-bold tabular-nums">${pkg.price.toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {purchaseError ? (
                    <p className="text-sm text-destructive">{purchaseError}</p>
                  ) : null}
                  <Button
                    type="button"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                    disabled={!selectedPackageId || purchasing || purchasablePackages.length === 0}
                    onClick={purchase}
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redirecting to checkout…
                      </>
                    ) : (
                      "Pay with card"
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UnityMeetLayout>
  )
}
