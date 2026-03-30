"use client"

import { useEffect, useMemo, useState } from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { PageHead } from "@/components/frontend/PageHead"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Skeleton } from "@/components/frontend/ui/skeleton"
import { Link, router, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"
import toast from "react-hot-toast"
import { Building2, Heart, Landmark, Sparkles } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const PRESET_AMOUNTS = [25, 50, 100, 250] as const

/** Brand gradient: purple → blue */
const GRADIENT_BRAND = "bg-gradient-to-r from-purple-600 to-blue-600"
const GRADIENT_BTN = cn(
  GRADIENT_BRAND,
  "text-white shadow-md shadow-purple-500/25 ring-2 ring-white/40 dark:from-purple-500 dark:to-blue-500 dark:ring-purple-300/30",
)
const GRADIENT_CTA = cn(
  "btn-animate h-11 w-full border-0 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:brightness-110 hover:shadow-xl hover:shadow-purple-500/35 dark:from-purple-500 dark:to-blue-500",
  GRADIENT_BRAND,
)
const GRADIENT_SOFT =
  "bg-gradient-to-br from-purple-50/90 via-background to-blue-50/80 dark:from-purple-950/30 dark:via-background dark:to-blue-950/25"

type Line = {
  type: "organization" | "alliance"
  label: string
  cents: number
  percent_bps: number
}

function formatInitialAmountFromCents(cents: number): string {
  const n = cents / 100
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100)
}

function formatPercentBps(bps: number) {
  const pct = bps / 100
  if (Number.isInteger(pct)) return `${pct}%`
  return `${pct.toFixed(2).replace(/\.?0+$/, "")}%`
}

function presetMatchesAmount(dollars: number, presetDollars: number): boolean {
  if (Number.isNaN(dollars)) return false
  return Math.round(dollars * 100) === presetDollars * 100
}

function SplitBreakdownSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-purple-200/60 bg-card/80 shadow-sm dark:border-purple-900/40"
      role="status"
      aria-label="Loading breakdown"
    >
      <div className="flex items-center justify-between border-b border-border/80 bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-3 py-2.5 dark:from-purple-500/12 dark:to-blue-500/12">
        <Skeleton className="h-4 w-36 bg-gradient-to-r from-muted to-muted/60" />
        <Skeleton className="h-4 w-14 bg-gradient-to-r from-muted to-muted/60" />
      </div>
      <ul className="divide-y divide-border/60 p-1" role="presentation">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex gap-3 px-3 py-3">
            <Skeleton className="mt-0.5 h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-purple-200/80 to-blue-200/80 dark:from-purple-900/50 dark:to-blue-900/50" />
            <div className="min-w-0 flex-1 space-y-2 py-0.5">
              <Skeleton className="h-3.5 w-[min(100%,14rem)] max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0 self-center" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CareAllianceDonatePage() {
  const reduceMotion = useReducedMotion()
  const page = usePage<{
    alliance: { id: number; name: string; slug: string }
    campaign: { id: number; slug: string; name: string; description: string | null }
    donation_amount_cents: number
    lines: Line[]
    split_error: string | null
    campaign_has_splits: boolean
    checkout_disabled_as_alliance_owner?: boolean
    auth?: { user?: unknown }
    seo?: { title?: string }
  }>()

  const {
    alliance,
    campaign,
    auth,
    donation_amount_cents,
    lines,
    split_error,
    campaign_has_splits,
    checkout_disabled_as_alliance_owner: checkoutDisabledAsAllianceOwner = false,
  } = page.props

  const [amount, setAmount] = useState(() => formatInitialAmountFromCents(donation_amount_cents))
  const [splitLoading, setSplitLoading] = useState(false)

  const amountDollars = Number.parseFloat(amount)
  const amountCents = Number.isNaN(amountDollars) ? 0 : Math.round(amountDollars * 100)
  /** Match server: checkout requires at least $1.00 (100 cents). */
  const amountValidForCheckout = amountCents >= 100

  const linesSynced =
    !Number.isNaN(amountDollars) && Math.round(amountDollars * 100) === donation_amount_cents

  const displayLines = linesSynced ? lines : []

  const totalCentsFromLines = useMemo(
    () => (displayLines.length ? displayLines.reduce((s, l) => s + l.cents, 0) : 0),
    [displayLines],
  )

  const donateUrl = route("care-alliance.campaigns.donate", {
    allianceSlug: alliance.slug,
    campaign: campaign.slug,
  })

  useEffect(() => {
    if (Number.isNaN(amountDollars)) return
    const cents = Math.round(amountDollars * 100)
    if (cents < 0) return
    if (cents === donation_amount_cents) return

    const t = window.setTimeout(() => {
      router.get(
        donateUrl,
        { amount_cents: cents },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
          only: ["lines", "donation_amount_cents", "split_error", "campaign_has_splits"],
          onStart: () => setSplitLoading(true),
          onFinish: () => setSplitLoading(false),
        },
      )
    }, 350)

    return () => window.clearTimeout(t)
  }, [amount, amountDollars, donation_amount_cents, donateUrl])

  const canCheckout =
    amountValidForCheckout &&
    linesSynced &&
    displayLines.length > 0 &&
    campaign_has_splits &&
    !split_error &&
    !checkoutDisabledAsAllianceOwner

  const checkout = () => {
    if (checkoutDisabledAsAllianceOwner) {
      toast.error("Alliance operators cannot donate through their own campaign link.")
      return
    }
    if (!amountValidForCheckout) {
      toast.error("Enter at least $1.00")
      return
    }
    if (!canCheckout) {
      if (!campaign_has_splits) {
        toast.error("This campaign’s split is not configured.")
      } else if (split_error) {
        toast.error(split_error)
      } else if (!linesSynced || !displayLines.length) {
        toast.error("Wait for the breakdown to finish updating.")
      } else {
        toast.error("This campaign’s split is not available.")
      }
      return
    }
    if (!auth?.user) {
      toast.error("Please log in to complete your donation")
      router.visit(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    router.post(`/care-alliance/${alliance.slug}/campaigns/${campaign.slug}/checkout`, {
      amount_cents: amountCents,
    })
  }

  const showUpdatingBreakdown =
    amountCents >= 100 && campaign_has_splits && (!linesSynced || splitLoading) && !split_error

  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 380, damping: 28 }
  const fade = reduceMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

  return (
    <FrontendLayout>
      <PageHead title={`Donate — ${campaign.name}`} />
      <div className={cn("min-h-[calc(100vh-4rem)]", GRADIENT_SOFT)}>
        {/* Hero — brand gradient band */}
        <div className="relative overflow-hidden border-b border-white/10">
          <div
            className={cn("absolute inset-0 opacity-[0.92] dark:opacity-[0.88]", GRADIENT_BRAND, "dark:from-purple-500 dark:to-blue-500")}
            aria-hidden
          />
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(180deg,white,transparent)] opacity-40" aria-hidden />
          <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
            <motion.div {...fade} transition={{ ...spring, delay: reduceMotion ? 0 : 0.05 }}>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                <Sparkles className="h-3.5 w-3.5 text-blue-200" aria-hidden />
                Donate
              </p>
              <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                {campaign.name}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white/85">
                <Heart className="h-4 w-4 shrink-0 text-pink-200" fill="currentColor" aria-hidden />
                {alliance.name}
              </p>
            </motion.div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-12 lg:items-start">
            <motion.div
              className="space-y-6"
              {...fade}
              transition={{ ...spring, delay: reduceMotion ? 0 : 0.12 }}
            >
              {campaign.description ? (
                <Card className="overflow-hidden border-purple-200/50 bg-card/90 shadow-md backdrop-blur-sm dark:border-purple-900/35">
                  <div className={cn("h-1 w-full", GRADIENT_BRAND, "dark:from-purple-500 dark:to-blue-500")} aria-hidden />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">About this campaign</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{campaign.description}</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-purple-200/60 bg-muted/20 shadow-none dark:border-purple-900/40">
                  <CardContent className="pt-6">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Your gift is shared across member organizations and the alliance according to the campaign split shown
                      on the right. Adjust the amount to see the breakdown update automatically.
                    </p>
                  </CardContent>
                </Card>
              )}
              <p className="text-xs leading-relaxed text-muted-foreground">
                Split amounts are calculated on the server as you type. Minimum donation is <span className="font-medium text-foreground">$1.00</span>. You must be signed in to pay with card.
              </p>
            </motion.div>

            <motion.aside
              className="lg:sticky lg:top-20"
              {...fade}
              transition={{ ...spring, delay: reduceMotion ? 0 : 0.18 }}
            >
              <Card className="overflow-hidden border-purple-200/60 bg-card/95 shadow-lg shadow-purple-500/10 backdrop-blur-sm dark:border-purple-900/40 dark:shadow-purple-950/20">
                <div className={cn("h-1.5 w-full", GRADIENT_BRAND, "dark:from-purple-500 dark:to-blue-500")} aria-hidden />
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-lg">Your gift</CardTitle>
                  <CardDescription>
                    Enter an amount — the breakdown reflects this campaign’s published split.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-foreground">Quick amounts</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AMOUNTS.map((v) => {
                        const selected = presetMatchesAmount(amountDollars, v)
                        return (
                          <motion.button
                            key={v}
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                            onClick={() => setAmount(String(v))}
                            className={cn(
                              "rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all duration-300",
                              selected
                                ? cn(GRADIENT_BTN, "scale-[1.02] border-transparent")
                                : "border-border bg-background/80 text-foreground hover:border-purple-300/70 hover:bg-purple-50/50 dark:hover:border-purple-600/40 dark:hover:bg-purple-950/20",
                            )}
                          >
                            ${v}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amt" className="text-foreground">
                      Amount (USD)
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-purple-600 dark:text-purple-400">
                        $
                      </span>
                      <Input
                        id="amt"
                        type="number"
                        min={1}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-11 border-purple-200/60 pl-7 text-base tabular-nums transition-shadow focus-visible:border-purple-400 focus-visible:ring-purple-500/30 dark:border-purple-900/50"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {!campaign_has_splits ? (
                      <motion.p
                        key="no-splits"
                        initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                      >
                        Split configuration is missing for this campaign.
                      </motion.p>
                    ) : showUpdatingBreakdown ? (
                      <motion.div
                        key="skeleton"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                      >
                        <SplitBreakdownSkeleton />
                      </motion.div>
                    ) : linesSynced && split_error ? (
                      <motion.p
                        key="split-err"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                      >
                        {split_error}
                      </motion.p>
                    ) : amountValidForCheckout && displayLines.length > 0 ? (
                      <motion.div
                        key="lines"
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden rounded-xl border border-purple-200/60 bg-card shadow-sm dark:border-purple-900/40"
                      >
                        <div className="flex items-center justify-between border-b border-border/80 bg-gradient-to-r from-purple-600/12 to-blue-600/12 px-3 py-2.5 dark:from-purple-500/15 dark:to-blue-500/15">
                          <span className="text-sm font-semibold text-foreground">Where your gift goes</span>
                          <span className="text-xs font-bold tabular-nums text-purple-700 dark:text-purple-300">
                            {formatMoney(totalCentsFromLines)}
                          </span>
                        </div>
                        <motion.ul
                          className="divide-y divide-border/70"
                          role="list"
                          {...(reduceMotion
                            ? {}
                            : {
                                initial: "hidden",
                                animate: "show",
                                variants: {
                                  hidden: { opacity: 0 },
                                  show: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
                                  },
                                },
                              })}
                        >
                          {displayLines.map((line, i) => {
                            const isAlliance = line.type === "alliance"
                            return (
                              <motion.li
                                key={`${line.label}-${i}`}
                                {...(reduceMotion
                                  ? {}
                                  : {
                                      variants: {
                                        hidden: { opacity: 0, x: -10 },
                                        show: { opacity: 1, x: 0 },
                                      },
                                    })}
                                className="flex gap-3 px-3 py-3"
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br shadow-sm",
                                    isAlliance
                                      ? "border-purple-200/80 from-purple-100/90 to-purple-50/80 text-purple-800 dark:border-purple-700/50 dark:from-purple-950/80 dark:to-purple-900/40 dark:text-purple-300"
                                      : "border-blue-200/80 from-blue-100/90 to-blue-50/80 text-blue-800 dark:border-blue-700/50 dark:from-blue-950/80 dark:to-blue-900/40 dark:text-blue-300",
                                  )}
                                  aria-hidden
                                >
                                  {isAlliance ? (
                                    <Landmark className="h-4 w-4" strokeWidth={1.75} />
                                  ) : (
                                    <Building2 className="h-4 w-4" strokeWidth={1.75} />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium leading-snug text-foreground">{line.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {isAlliance ? "Alliance allocation" : "Member organization"} ·{" "}
                                    {formatPercentBps(line.percent_bps)}
                                  </p>
                                </div>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                                  {formatMoney(line.cents)}
                                </span>
                              </motion.li>
                            )
                          })}
                        </motion.ul>
                      </motion.div>
                    ) : (
                      <motion.p
                        key="hint"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-lg border border-dashed border-purple-200/70 bg-purple-50/30 px-3 py-3 text-sm text-muted-foreground dark:border-purple-900/50 dark:bg-purple-950/15"
                      >
                        Enter at least <span className="font-medium text-foreground">$1.00</span> to see the split.
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <Button
                    type="button"
                    className={cn(GRADIENT_CTA, "font-semibold")}
                    onClick={() => checkout()}
                    disabled={!canCheckout}
                  >
                    Continue to payment
                  </Button>
                  {checkoutDisabledAsAllianceOwner ? (
                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      You manage this alliance, so you cannot donate through your own public link. Share this page with supporters instead.
                    </p>
                  ) : !auth?.user ? (
                    <p className="text-center text-xs text-muted-foreground">
                      <Link
                        href="/login"
                        className="font-semibold text-purple-600 underline-offset-4 hover:text-purple-700 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        Sign in
                      </Link>{" "}
                      to pay with card.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </motion.aside>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
