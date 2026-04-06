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
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System", href: "#" },
  { title: "BIU fee (platform)", href: "/admin/biu-fee" },
]

export default function AdminBiuFeeIndex({ sales_platform_fee_percentage }: Props) {
  const { data, setData, put, processing, errors } = useForm({
    sales_platform_fee_percentage: String(sales_platform_fee_percentage ?? 0),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("admin.biu-fee.update"))
  }

  const pct = parseFloat(data.sales_platform_fee_percentage) || 0

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="BIU fee — Admin" />
      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="w-full space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Coins className="h-3.5 w-3.5" />
            Admin · All sales modules
          </div>
          <h1 className="text-3xl font-bold text-foreground">BIU fee (platform)</h1>
          <p className="max-w-2xl text-muted-foreground">
            One percentage for every <span className="font-medium text-foreground">sales</span> module: marketplace cart subtotal, Service Hub order
            amount, course or event enrollment fee, raffle tickets (face total), gift card purchase amount, and merchant hub cash redemptions. The buyer
            still pays only the listed price plus tax/shipping where applicable — this fee is{" "}
            <span className="font-medium text-foreground">deducted on the seller / ledger side</span>, matching the workbook (platform fee + processing
            come out of margin, not added on top for the customer).
          </p>
        </div>

        <Card className="max-w-xl border-muted">
          <CardHeader>
            <CardTitle className="text-base">Example (like your workbook)</CardTitle>
            <CardDescription>
              Selling price $37.50 + tax + shipping = customer total. If this rate is ~1.87%, platform fee on the selling price is about $0.70 — shown
              in ledger, not added to checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>
              On a $100 <span className="text-foreground font-medium">sale base</span> at {pct}%: platform fee = ${((100 * pct) / 100).toFixed(2)}{" "}
              (before Stripe / transaction fees).
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales platform fee rate</CardTitle>
              <CardDescription>Percent of each module&apos;s sale base (see above). Stored once; all modules read it.</CardDescription>
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
                <p className="text-xs text-muted-foreground">Example: 1.87 for about $0.70 on a $37.50 product subtotal.</p>
                {errors.sales_platform_fee_percentage && (
                  <p className="text-sm text-red-600">{errors.sales_platform_fee_percentage}</p>
                )}
              </div>
              <Button type="submit" disabled={processing} className="gap-2">
                <Save className="h-4 w-4" />
                Save
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
