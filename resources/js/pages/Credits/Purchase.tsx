"use client"

import AppLayout from "@/layouts/app-layout"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreditsPurchase({
  currentCredits,
  aiMediaStudioCredits,
  price,
  credits,
  mediaStudioPacks,
  activeWallet,
}: {
  currentCredits: number
  aiMediaStudioCredits: number
  price: number
  credits: number
  mediaStudioPacks: Record<string, { usd: number; credits: number }>
  activeWallet: string
}) {
  const { success, error } = usePage<{ success?: string; error?: string }>().props

  const checkout = (packageKey: string, returnRoute: string) => {
    router.post(route("credits.checkout"), { package: packageKey, return_route: returnRoute })
  }

  return (
    <AppLayout>
      <Head title="Buy credits" />
      <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href={route("dashboard")}>← Dashboard</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Wallet credits power AI Chat and related features. AI Media Studio uses its own credit pool for short-form
            video generation (OpenAI + fal.ai).
          </p>
        </div>

        {success ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">{success}</p>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <Card data-active={activeWallet === "ai_media_studio" ? "1" : undefined}>
          <CardHeader>
            <CardTitle>AI Media Studio</CardTitle>
            <CardDescription>
              Balance: <strong>{aiMediaStudioCredits}</strong> video credit(s) · used when you queue a generation
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(mediaStudioPacks).map(([key, pack]) => (
              <Button key={key} type="button" variant="secondary" onClick={() => checkout(key, "ai-media-studio.create")}>
                {pack.credits} credits — ${Number(pack.usd).toFixed(2)}
              </Button>
            ))}
            <Button variant="outline" asChild>
              <Link href={route("ai-media-studio.create")}>Back to AI Media Studio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet credits (AI Chat &amp; tools)</CardTitle>
            <CardDescription>
              Balance: <strong>{currentCredits.toLocaleString()}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Legacy top-up: pay <strong>${price}</strong> and receive <strong>{credits.toLocaleString()}</strong>{" "}
              wallet credits (existing behaviour).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => checkout("addon_10k", "ai-chat.index")}>
                +10k — $2
              </Button>
              <Button type="button" onClick={() => checkout("addon_25k", "ai-chat.index")}>
                +25k — $4.50
              </Button>
              <Button type="button" onClick={() => checkout("addon_50k", "ai-chat.index")}>
                +50k — $8
              </Button>
              <Button variant="outline" asChild>
                <Link href={route("ai-chat.index")}>AI Chat</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
