"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Link, usePage } from "@inertiajs/react"
import { Button } from "@/components/frontend/ui/button"

type Line = { label?: string; cents?: number }

export default function CareAllianceDonationSuccessPage() {
  const { donation } = usePage<{
    donation: { amount_cents: number; campaign_name?: string; lines?: Line[] }
  }>().props

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100)

  return (
    <FrontendLayout>
      <PageHead title="Thank you" />
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Thank you!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your donation of <strong>{fmt(donation.amount_cents)}</strong>
              {donation.campaign_name ? (
                <>
                  {" "}
                  to <strong>{donation.campaign_name}</strong>
                </>
              ) : null}{" "}
              was successful.
            </p>
            {donation.lines && donation.lines.length > 0 && (
              <ul className="text-sm border rounded divide-y">
                {donation.lines.map((line, i) => (
                  <li key={i} className="flex justify-between px-3 py-2">
                    <span>{line.label}</span>
                    <span>{fmt(line.cents ?? 0)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild className="w-full">
              <Link href="/donate">Explore more causes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </FrontendLayout>
  )
}
