"use client"

import { useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Button } from "@/components/frontend/ui/button"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Link, router, usePage } from "@inertiajs/react"
import axios from "axios"
import toast from "react-hot-toast"

type Line = {
  type: string
  label: string
  cents: number
  percent_bps: number
}

export default function CareAllianceDonatePage() {
  const { alliance, campaign, auth } = usePage<{
    alliance: { id: number; name: string; slug: string }
    campaign: { id: number; name: string; description: string | null }
    auth?: { user?: unknown }
    seo?: { title?: string }
  }>().props

  const [amount, setAmount] = useState("25")
  const [lines, setLines] = useState<Line[] | null>(null)
  const [loading, setLoading] = useState(false)

  const preview = async () => {
    const dollars = Number.parseFloat(amount)
    if (Number.isNaN(dollars) || dollars < 1) {
      toast.error("Enter at least $1.00")
      return
    }
    const amountCents = Math.round(dollars * 100)
    setLoading(true)
    try {
      const { data } = await axios.post(
        `/care-alliance/${alliance.slug}/campaigns/${campaign.id}/preview`,
        { amount_cents: amountCents },
        {
          headers: {
            "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "",
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        }
      )
      if (data.success) {
        setLines(data.lines)
      } else {
        toast.error(data.message ?? "Preview failed")
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message ?? "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  const checkout = () => {
    const dollars = Number.parseFloat(amount)
    if (Number.isNaN(dollars) || dollars < 1) {
      toast.error("Enter at least $1.00")
      return
    }
    const amountCents = Math.round(dollars * 100)
    if (!auth?.user) {
      toast.error("Please log in to complete your donation")
      router.visit(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    router.post(`/care-alliance/${alliance.slug}/campaigns/${campaign.id}/checkout`, { amount_cents: amountCents })
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100)

  return (
    <FrontendLayout>
      <PageHead title={`Donate — ${campaign.name}`} />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-muted-foreground">{alliance.name}</p>
            {campaign.description && <p className="mt-2 text-sm">{campaign.description}</p>}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your gift</CardTitle>
              <CardDescription>Review the split before you pay (rule: visible before donation).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amt">Amount (USD)</Label>
                <Input id="amt" type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={() => void preview()} disabled={loading}>
                Show breakdown
              </Button>

              {lines && lines.length > 0 && (
                <div className="rounded-lg border">
                  <div className="px-3 py-2 text-sm font-medium border-b bg-muted/40">Breakdown</div>
                  <ul className="divide-y">
                    {lines.map((line, i) => (
                      <li key={i} className="flex justify-between px-3 py-2 text-sm">
                        <span>{line.label}</span>
                        <span>{fmt(line.cents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="button" className="w-full" onClick={() => checkout()} disabled={!lines}>
                Continue to payment
              </Button>
              {!auth?.user && (
                <p className="text-xs text-muted-foreground text-center">
                  <Link href="/login" className="underline">
                    Sign in
                  </Link>{" "}
                  to pay with card.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </FrontendLayout>
  )
}
