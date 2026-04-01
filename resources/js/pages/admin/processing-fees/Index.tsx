"use client"

import { Head, useForm } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"
import type { BreadcrumbItem, ProcessingFeeRates } from "@/types"

interface Props {
  rates: ProcessingFeeRates
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "System Management", href: "#" },
  { title: "Stripe processing fees", href: "/admin/processing-fees" },
]

export default function AdminProcessingFeesIndex({ rates }: Props) {
  const { data, setData, put, processing, errors } = useForm({
    card_percent: String(rates.card_percent),
    card_fixed_usd: String(rates.card_fixed_usd),
    ach_percent: String(rates.ach_percent),
    ach_fee_cap_usd: String(rates.ach_fee_cap_usd),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    put(route("admin.processing-fees.update"))
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Stripe processing fees - Admin" />
      <div className="w-full space-y-6 p-4 sm:p-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stripe processing fee estimates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1.5 w-full">
            Configure the card and ACH fee model used across the app for previews and totals (donations, raffles, node
            sales, and other Stripe card flows). Values should match your Stripe pricing (e.g. 2.9% + $0.30 for cards,
            0.8% capped at $5 for ACH in the US). Only administrators can change these.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="flex min-w-0 flex-col">
              <CardHeader>
                <CardTitle>Card (credit / debit)</CardTitle>
                <CardDescription>
                  Approximate fee: (charge × percent) + fixed amount per charge. Used wherever the app estimates card
                  processing cost.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card_percent">Percent (decimal)</Label>
                  <Input
                    id="card_percent"
                    type="number"
                    step="0.0001"
                    min={0}
                    max={0.2}
                    value={data.card_percent}
                    onChange={(e) => setData("card_percent", e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: 0.029 = 2.9%. Enter as a decimal, not as 2.9.
                  </p>
                  {errors.card_percent && <p className="text-sm text-red-600">{errors.card_percent}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card_fixed_usd">Fixed fee (USD per charge)</Label>
                  <Input
                    id="card_fixed_usd"
                    type="number"
                    step="0.01"
                    min={0}
                    max={25}
                    value={data.card_fixed_usd}
                    onChange={(e) => setData("card_fixed_usd", e.target.value)}
                    className="font-mono"
                  />
                  {errors.card_fixed_usd && <p className="text-sm text-red-600">{errors.card_fixed_usd}</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="flex min-w-0 flex-col">
              <CardHeader>
                <CardTitle>Bank (ACH / US bank debit)</CardTitle>
                <CardDescription>
                  Percent of charge, capped at a maximum fee per charge. Used for ACH-style fee estimates (e.g. donate flow
                  bank option).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ach_percent">Percent (decimal)</Label>
                  <Input
                    id="ach_percent"
                    type="number"
                    step="0.0001"
                    min={0}
                    max={0.1}
                    value={data.ach_percent}
                    onChange={(e) => setData("ach_percent", e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Example: 0.008 = 0.8%.</p>
                  {errors.ach_percent && <p className="text-sm text-red-600">{errors.ach_percent}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ach_fee_cap_usd">Fee cap (USD per charge)</Label>
                  <Input
                    id="ach_fee_cap_usd"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={data.ach_fee_cap_usd}
                    onChange={(e) => setData("ach_fee_cap_usd", e.target.value)}
                    className="font-mono"
                  />
                  {errors.ach_fee_cap_usd && <p className="text-sm text-red-600">{errors.ach_fee_cap_usd}</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={processing} className="gap-2">
              <Save className="h-4 w-4" />
              {processing ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
