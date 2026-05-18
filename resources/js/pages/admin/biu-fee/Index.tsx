"use client"

import { Head, Link, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BreadcrumbItem } from "@/types"
import { Coins, Save } from "lucide-react"

interface Props {
  sales_platform_fee_percentage: number
  marketplace_printify_organization_fee_percentage: number
  marketplace_merchant_pool_fee_percentage: number
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System", href: "#" },
  { title: "BIU fee (platform)", href: "/admin/biu-fee" },
]

export default function AdminBiuFeeIndex({
  sales_platform_fee_percentage,
  marketplace_printify_organization_fee_percentage,
  marketplace_merchant_pool_fee_percentage,
}: Props) {
  const { data, setData, put, processing, errors } = useForm({
    sales_platform_fee_percentage: String(sales_platform_fee_percentage ?? 0),
    marketplace_printify_organization_fee_percentage: String(
      marketplace_printify_organization_fee_percentage ?? 0,
    ),
    marketplace_merchant_pool_fee_percentage: String(marketplace_merchant_pool_fee_percentage ?? 0),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("admin.biu-fee.update"))
  }

  const salesPct = parseFloat(data.sales_platform_fee_percentage) || 0
  const printifyOrgPct = parseFloat(data.marketplace_printify_organization_fee_percentage) || 0
  const merchantPoolPct = parseFloat(data.marketplace_merchant_pool_fee_percentage) || 0

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="BIU fee — Admin" />
      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="w-full space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Coins className="h-3.5 w-3.5" />
            Admin · Platform fees
          </div>
          <h1 className="text-3xl font-bold text-foreground">BIU fee (platform)</h1>
          <p className="max-w-2xl text-muted-foreground">
            <span className="font-medium text-foreground">Marketplace checkout</span> charges supporters a platform fee on each line&apos;s subtotal: one
            rate for Printify and organization catalog goods, and another for merchant marketplace items and organization-adopted merchant pool listings.
            Mixed carts combine both.{" "}
            <span className="font-medium text-foreground">Other sales modules</span> (Service Hub, courses, raffles, gift cards, merchant hub cash) use the
            global sales rate below on each module&apos;s sale base.
          </p>
        </div>

        <Card className="max-w-xl border-muted">
          <CardHeader>
            <CardTitle className="text-base">Quick reference</CardTitle>
            <CardDescription>Example on a $100 sale base before Stripe / transaction fees.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Global sales @ {salesPct}% → ${((100 * salesPct) / 100).toFixed(2)} platform fee.
            </p>
            <p>
              Marketplace Printify/org @ {printifyOrgPct}% on $60 of lines → ${((60 * printifyOrgPct) / 100).toFixed(2)}; merchant/pool @ {merchantPoolPct}%
              on $40 → ${((40 * merchantPoolPct) / 100).toFixed(2)} (total ${((60 * printifyOrgPct) / 100 + (40 * merchantPoolPct) / 100).toFixed(2)}).
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace — Printify &amp; organization goods</CardTitle>
              <CardDescription>
                Applies to organization storefront catalog lines (Printify or manual) that are not merchant-pool listings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="marketplace_printify_organization_fee_percentage">Percent (%)</Label>
                <Input
                  id="marketplace_printify_organization_fee_percentage"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={data.marketplace_printify_organization_fee_percentage}
                  onChange={(e) => setData("marketplace_printify_organization_fee_percentage", e.target.value)}
                  className="font-mono max-w-xs"
                />
                {errors.marketplace_printify_organization_fee_percentage && (
                  <p className="text-sm text-red-600">{errors.marketplace_printify_organization_fee_percentage}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketplace — Merchant &amp; merchant pool</CardTitle>
              <CardDescription>
                Applies to direct merchant marketplace SKUs, organization pool adoptions, catalog rows linked to a merchant pool product, and{" "}
                <span className="font-medium text-foreground">Merchant Hub offer</span> cash checkouts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="marketplace_merchant_pool_fee_percentage">Percent (%)</Label>
                <Input
                  id="marketplace_merchant_pool_fee_percentage"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={data.marketplace_merchant_pool_fee_percentage}
                  onChange={(e) => setData("marketplace_merchant_pool_fee_percentage", e.target.value)}
                  className="font-mono max-w-xs"
                />
                {errors.marketplace_merchant_pool_fee_percentage && (
                  <p className="text-sm text-red-600">{errors.marketplace_merchant_pool_fee_percentage}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Global sales platform fee</CardTitle>
              <CardDescription>
                Service Hub orders, course or event fees, raffle ticket face totals, gift card purchases, merchant hub cash redemptions — not marketplace
                cart lines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sales_platform_fee_percentage">Percent (%)</Label>
                <Input
                  id="sales_platform_fee_percentage"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={data.sales_platform_fee_percentage}
                  onChange={(e) => setData("sales_platform_fee_percentage", e.target.value)}
                  className="font-mono max-w-xs"
                />
                {errors.sales_platform_fee_percentage && (
                  <p className="text-sm text-red-600">{errors.sales_platform_fee_percentage}</p>
                )}
              </div>
              <Button type="submit" disabled={processing} className="gap-2">
                <Save className="h-4 w-4" />
                Save all
              </Button>
            </CardContent>
          </Card>
        </form>

        <p className="text-sm text-muted-foreground">
          Service Hub <span className="font-medium text-foreground">Stripe / Believe Points transaction</span> rates and monthly ad fee stay on{" "}
          <Link href="/settings/service-hub" className="text-primary underline-offset-4 hover:underline">
            Service hub settings
          </Link>
          .
        </p>
      </div>
    </AppLayout>
  )
}
