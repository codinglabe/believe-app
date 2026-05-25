"use client"

import { Link, router, usePage } from "@inertiajs/react"
import { useState } from "react"
import {
  ArrowRight,
  Check,
  Heart,
  Loader2,
  Minus,
  Sparkles,
  Users,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { cn } from "@/lib/utils"
import { showErrorToast } from "@/lib/toast"
import {
  PRIME_SUPPORTER_FREQUENCY,
  PRIME_SUPPORTER_PRICE,
  SUPPORTER_CTA_POINTS,
  SUPPORTER_PRICING_ROWS,
  SUPPORTER_VALUE_PROPS,
  type SupporterPlanCell,
} from "@/lib/supporter-pricing-display"

const logoGradientFrame = "bg-gradient-to-r from-purple-600 to-blue-600"
const logoGradientDiagonal = "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600"

export interface SupporterPlanOption {
  id: number
  slug: string | null
  name: string
  price: number
  frequency: string
  description?: string | null
}

export interface SupporterSubscriptionState {
  tier: string
  name: string
  price: number
}

interface SupporterPricingTabProps {
  supporterPlans?: SupporterPlanOption[]
  supporterSubscription?: SupporterSubscriptionState | null
}

function formatPrimePrice(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function PlanCell({ cell }: { cell: SupporterPlanCell }) {
  if (cell.kind === "check") {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    )
  }

  if (cell.kind === "dash") {
    return <Minus className="mx-auto h-4 w-4 text-slate-400 dark:text-white/35" aria-hidden />
  }

  return (
    <span
      className={cn(
        "text-xs font-semibold leading-snug sm:text-sm",
        cell.highlight
          ? "text-violet-700 dark:text-purple-300"
          : "text-slate-700 dark:text-white/80",
      )}
    >
      {cell.value}
    </span>
  )
}

export default function SupporterPricingTab({
  supporterPlans = [],
  supporterSubscription = null,
}: SupporterPricingTabProps) {
  const { auth } = usePage().props as { auth?: { user?: { id?: number } | null } }
  const isAuthenticated = Boolean(auth?.user)
  const [activatingSlug, setActivatingSlug] = useState<string | null>(null)

  const freePlan =
    supporterPlans.find((plan) => plan.slug === "free_supporter") ??
    supporterPlans.find((plan) => plan.price <= 0)
  const primePlan =
    supporterPlans.find((plan) => plan.slug === "prime_supporter") ??
    supporterPlans.find((plan) => plan.price > 0)

  const primeDisplayPrice = primePlan?.price ?? PRIME_SUPPORTER_PRICE
  const activeTier = supporterSubscription?.tier ?? null
  const isFreeActive = activeTier === "free_supporter"
  const isPrimeActive = activeTier === "prime_supporter"

  const loginHref = route("login", {}, false) + "?redirect=" + encodeURIComponent("/pricing?tab=supporters")
  const registerHref = route("register.user")

  const subscribe = (plan: SupporterPlanOption | undefined) => {
    if (!plan) {
      showErrorToast("Supporter plan is not configured yet. Please contact support.")
      return
    }

    if (!isAuthenticated) {
      window.location.href = loginHref
      return
    }

    setActivatingSlug(plan.slug ?? String(plan.id))
    router.post(route("wallet.subscribe", plan.id), {}, {
      preserveScroll: true,
      onError: (errors) => {
        const message =
          (typeof errors.message === "string" && errors.message) ||
          (typeof errors.error === "string" && errors.error) ||
          "Unable to activate this supporter plan."
        showErrorToast(message)
      },
      onFinish: () => setActivatingSlug(null),
    })
  }

  return (
    <>
      {supporterSubscription && (
        <div className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-4 dark:border-emerald-500/25 dark:bg-emerald-950/20 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Active supporter plan</p>
                <p className="text-sm text-slate-600 dark:text-white/70">
                  {supporterSubscription.name}
                  {supporterSubscription.price > 0
                    ? ` · $${formatPrimePrice(supporterSubscription.price)}/${PRIME_SUPPORTER_FREQUENCY}`
                    : " · Free"}
                </p>
              </div>
            </div>
            {!isPrimeActive && primePlan && (
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:brightness-110"
                disabled={activatingSlug !== null}
                onClick={() => subscribe(primePlan)}
              >
                {activatingSlug === (primePlan.slug ?? String(primePlan.id)) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Upgrade to Prime
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      <header className="relative mb-8 overflow-hidden rounded-2xl border border-purple-200/70 bg-white shadow-lg dark:border-purple-500/20 dark:bg-[#0b0b18] sm:mb-10">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
            <div className={cn("absolute inset-0 opacity-[0.07]", logoGradientDiagonal)} aria-hidden />
            <div className="relative">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-700 sm:text-xs dark:text-violet-300">
                Believe In Unity
              </p>
              <h2 className="text-balance text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl md:text-4xl dark:text-white">
                Become a Prime Supporter
              </h2>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-violet-700 sm:text-base dark:text-purple-300">
                More impact. More rewards. More unity.
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-white/70">
                Your monthly support helps organizations thrive and gives you exclusive benefits all year long.
              </p>
            </div>
          </div>

          <div className="relative hidden min-h-[220px] overflow-hidden lg:block">
            <div className={cn("absolute inset-0", logoGradientDiagonal)} />
            <div
              className="absolute inset-0 bg-[url('/images/pricing/supporter-pricing-reference.png')] bg-cover bg-[center_20%] opacity-30 mix-blend-overlay"
              aria-hidden
            />
            <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-purple-950/50 to-transparent p-6">
              <div className="flex gap-3">
                {[Heart, Sparkles, Users].map((Icon, i) => (
                  <span
                    key={i}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-sm"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={cn("border-t border-purple-500/20 px-3 py-4 sm:px-6", logoGradientDiagonal)}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {SUPPORTER_VALUE_PROPS.map(({ label, Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-semibold leading-snug text-white sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="mb-8 sm:mb-10">
        <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-[0.14em] text-slate-800 sm:text-base dark:text-white">
          Choose the supporter experience that&apos;s right for you
        </h3>

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md dark:border-white/10 dark:bg-[#0b0b18]">
          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-5 dark:text-white/50">
                    Features
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 sm:px-5 dark:text-white/85">
                    Free Supporter
                    <span className="mt-1 block text-lg font-black tabular-nums text-slate-900 dark:text-white">$0</span>
                    {isFreeActive && (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Active
                      </span>
                    )}
                  </th>
                  <th className={cn("px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-white sm:px-5", logoGradientDiagonal)}>
                    Prime Supporter
                    <span className="mt-1 block text-lg font-black tabular-nums">
                      ${formatPrimePrice(primeDisplayPrice)}
                      <span className="text-xs font-semibold">/{PRIME_SUPPORTER_FREQUENCY}</span>
                    </span>
                    {isPrimeActive && (
                      <span className="mt-1 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Active
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {SUPPORTER_PRICING_ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-slate-100 last:border-0 dark:border-white/[0.06]"
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <span className="flex items-center gap-2.5 text-xs font-medium text-slate-800 sm:text-sm dark:text-white/90">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-purple-950/40 dark:text-purple-300">
                          <row.Icon className="h-4 w-4" />
                        </span>
                        {row.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center sm:px-5">
                      <PlanCell cell={row.free} />
                    </td>
                    <td className="bg-violet-50/70 px-4 py-3 text-center dark:bg-purple-950/20 sm:px-5">
                      <PlanCell cell={row.prime} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-2xl border border-purple-200/70 bg-white shadow-md dark:border-purple-500/20 dark:bg-[#0b0b18] sm:mb-10">
        <div className="grid gap-0 lg:grid-cols-[220px_1fr_auto] lg:items-center">
          <div className={cn("flex flex-col justify-center px-5 py-6 text-white sm:px-6", logoGradientDiagonal)}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">Only</p>
            <p className="text-2xl font-black tabular-nums sm:text-3xl">${formatPrimePrice(primeDisplayPrice)}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-white/90">per month</p>
          </div>

          <div className="px-5 py-6 sm:px-8">
            <p className="text-sm font-bold uppercase tracking-wide text-violet-800 dark:text-purple-300">
              Make a bigger impact. Enjoy more benefits.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/70">
              Upgrade to Prime Supporter today and help us build a stronger, more united world.
            </p>
          </div>

          <div className="hidden flex-col gap-4 border-l border-slate-200 px-6 py-6 lg:flex dark:border-white/10">
            {SUPPORTER_CTA_POINTS.map(({ label, Icon }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-purple-950/50 dark:text-purple-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="max-w-[9rem] text-[11px] font-semibold leading-snug text-slate-700 dark:text-white/80">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn("overflow-hidden rounded-2xl p-[2px]", logoGradientFrame)}>
        <div className={cn("rounded-[14px] px-5 py-8 text-center text-white sm:px-8 sm:py-10", logoGradientDiagonal)}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">Upgrade today!</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            Join thousands of supporters making a difference every day.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthenticated ? (
              <>
                <Button
                  variant="secondary"
                  className="h-12 w-full min-w-[240px] border-0 bg-white px-6 font-bold text-violet-700 shadow-lg hover:bg-white/95 sm:w-auto"
                  disabled={isPrimeActive || activatingSlug !== null || !primePlan}
                  onClick={() => subscribe(primePlan)}
                >
                  {activatingSlug === (primePlan?.slug ?? String(primePlan?.id ?? "")) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isPrimeActive ? (
                    "Prime Supporter active"
                  ) : (
                    <>
                      Become a Prime Supporter
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full min-w-[200px] border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                  disabled={isFreeActive || isPrimeActive || activatingSlug !== null || !freePlan}
                  onClick={() => subscribe(freePlan)}
                >
                  {activatingSlug === (freePlan?.slug ?? String(freePlan?.id ?? "")) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : isFreeActive ? (
                    "Free Supporter active"
                  ) : (
                    "Start free as a supporter"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Link href={loginHref} className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    className="h-12 w-full min-w-[240px] border-0 bg-white px-6 font-bold text-violet-700 shadow-lg hover:bg-white/95 sm:w-auto"
                  >
                    Sign in to subscribe
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href={registerHref} className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="h-12 w-full min-w-[200px] border-white/40 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                  >
                    Create free account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
