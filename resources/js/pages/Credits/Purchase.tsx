"use client"

import { useEffect } from "react"
import AccountContextLayout from "@/layouts/account-context-layout"
import { Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Coins, History, Sparkles, Video } from "lucide-react"

export type PurchaseHistoryRow = {
  id: number
  created_at: string
  amount_usd: number
  status: string
  payment_method: string | null
  wallet: "credits" | "ai_media_studio"
  quantity: number
  summary: string
  package: string | null
}

export default function CreditsPurchase({
  context,
  aiMediaStudioCredits,
  mediaStudioPacks,
  activeWallet,
  purchaseHistory,
}: {
  context: "organization" | "supporter"
  aiMediaStudioCredits: number
  mediaStudioPacks: Record<string, { usd: number; credits: number }>
  activeWallet: string
  purchaseHistory: PurchaseHistoryRow[]
}) {
  const { success, error, info } = usePage<{
    success?: string
    error?: string
    info?: string
  }>().props

  const studioHref = route("ai-media-studio.index")

  const checkout = (packageKey: string, returnRoute: string) => {
    router.post(route("credits.checkout"), { package: packageKey, return_route: returnRoute })
  }

  const backHref =
    activeWallet === "ai_media_studio"
      ? studioHref
      : context === "supporter"
        ? route("user.profile.index")
        : route("dashboard")

  const backLabel =
    activeWallet === "ai_media_studio"
      ? "← AI Media Studio"
      : context === "supporter"
        ? "← Profile"
        : "← Dashboard"

  const studioRefId = "purchase-ai-media-studio"

  useEffect(() => {
    if (activeWallet === "ai_media_studio") {
      document.getElementById(studioRefId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [activeWallet])

  const formatWhen = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))
    } catch {
      return iso
    }
  }

  const payLabel = (method: string | null) => {
    if (!method) return "—"
    if (method === "stripe") return "Card (Stripe)"
    if (method === "believe_points") return "Believe Points"
    return method
  }

  const statusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === "completed")
      return (
        <Badge variant="default" className="font-normal">
          Completed
        </Badge>
      )
    if (s === "pending")
      return (
        <Badge variant="secondary" className="font-normal">
          Pending
        </Badge>
      )
    return (
      <Badge variant="outline" className="font-normal capitalize">
        {status}
      </Badge>
    )
  }

  const walletLabel = (w: PurchaseHistoryRow["wallet"]) =>
    w === "ai_media_studio" ? "AI Media Studio" : "Wallet credits"

  const quantityLabel = (row: PurchaseHistoryRow) => {
    if (row.quantity < 1) return "—"
    return row.wallet === "ai_media_studio" ? `${row.quantity} video credit(s)` : `${row.quantity.toLocaleString()} credits`
  }

  return (
    <AccountContextLayout
      context={context}
      title="AI Top Up"
      description="Buy AI Media Studio video credits securely, then return to your library."
    >
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" asChild className="w-fit -ml-2">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <Link href={studioHref}>
              <Video className="mr-2 h-4 w-4" />
              Open AI Media Studio
            </Link>
          </Button>
        </div>

        {success ? (
          <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
            {success}
          </p>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        {info ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            {info}
          </p>
        ) : null}

        <div className="mx-auto max-w-xl">
          <Card
            id={studioRefId}
            className={`relative overflow-hidden border-2 transition-shadow ${
              activeWallet === "ai_media_studio"
                ? "border-violet-500/50 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/20"
                : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/12 via-transparent to-transparent" />
            <CardHeader className="relative space-y-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    AI Media Studio
                  </CardTitle>
                  <CardDescription className="text-base leading-snug">
                    Short-form video generation (OpenAI + fal.ai). One credit is reserved when you queue a video.
                  </CardDescription>
                </div>
              </div>
              <div className="rounded-2xl border bg-card/80 px-4 py-4 backdrop-blur-sm">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Your balance</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums tracking-tight">{aiMediaStudioCredits}</span>
                  <span className="text-muted-foreground text-sm font-medium">video credits</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-3 pt-2">
              <p className="text-muted-foreground text-xs sm:text-sm">Choose a pack — checkout opens in a secure window, then sends you back to AI Media Studio.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(mediaStudioPacks).map(([key, pack]) => (
                  <Button
                    key={key}
                    type="button"
                    className="h-auto min-h-[3rem] flex-col gap-0.5 py-3 sm:flex-col"
                    onClick={() => checkout(key, "ai-media-studio.index")}
                  >
                    <span className="text-base font-semibold">{pack.credits} credits</span>
                    <span className="text-xs font-normal opacity-90">${Number(pack.usd).toFixed(2)}</span>
                  </Button>
                ))}
              </div>
              <Button variant="secondary" className="w-full" asChild>
                <Link href={studioHref}>
                  <Video className="mr-2 h-4 w-4" />
                  Back to AI Media Studio
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Purchase history
            </CardTitle>
            <CardDescription>Stripe and in-app credit purchases linked to your account (most recent first).</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            {purchaseHistory.length === 0 ? (
              <p className="text-muted-foreground px-6 pb-6 text-sm sm:px-0">No purchases yet. When you complete a top-up, it will appear here.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border sm:border-0 sm:rounded-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[140px]">Date</TableHead>
                      <TableHead className="min-w-[120px]">Pool</TableHead>
                      <TableHead className="hidden md:table-cell">Detail</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="hidden sm:table-cell">Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm">{formatWhen(row.created_at)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5 text-sm">
                            {row.wallet === "ai_media_studio" ? (
                              <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                            ) : (
                              <Coins className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {walletLabel(row.wallet)}
                          </span>
                          <p className="text-muted-foreground mt-0.5 text-xs md:hidden">{quantityLabel(row)}</p>
                        </TableCell>
                        <TableCell className="hidden max-w-[220px] truncate text-sm md:table-cell" title={row.summary}>
                          <span className="text-muted-foreground">{quantityLabel(row)}</span>
                          {row.package ? (
                            <span className="text-muted-foreground block text-xs">Pack: {row.package}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">${row.amount_usd.toFixed(2)}</TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">{payLabel(row.payment_method)}</TableCell>
                        <TableCell className="text-center">{statusBadge(row.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountContextLayout>
  )
}
