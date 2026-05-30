"use client"

import { Badge } from "@/components/frontend/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatAfterIntroductoryPeriodCopy,
  formatCurrencyCustomFieldDisplay,
  formatIntroductoryPeriodHeadline,
  formatPlanPrice,
  planCurrencyCustomFields,
  pricingPageMarketingFromPlan,
  resolveIntroPeriodMonths,
  UNITY_MEMBERSHIP_DEFAULTS,
  type PlanPricingCustomField,
  type PlanPricingShape,
  type UsageAddOn,
} from "@/lib/plan-pricing-display"
import {
  ArrowRight,
  Brain,
  Check,
  Heart,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react"

const RED = "#E02424"
const logoGradientFrame = "bg-gradient-to-r from-purple-600 to-blue-600"
const logoGradientShadow = "shadow-none dark:shadow-[0_0_28px_-10px_rgba(147,51,234,0.4)]"
const logoGradientDiagonal = "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600"
const logoGradientCTA = "bg-gradient-to-r from-purple-600 to-blue-600"
const logoGlowBlur = "bg-purple-500/20 dark:bg-purple-600/25"

export interface UnityMembershipPlan extends PlanPricingShape {
  id?: number
  trial_days?: number
}

export interface UnityMembershipCardProps {
  plan: UnityMembershipPlan
  includedColumns: string[][]
  introPrice: number
  standardPrice: number
  isCurrent?: boolean
  onSubscribe?: () => void
  onCancel?: () => void
  className?: string
}

function addOnIcon(name: string): LucideIcon {
  const n = name.toLowerCase()
  if (n.includes("email")) return Mail
  if (n.includes("ai")) return Brain
  if (n.includes("sms")) return MessageSquare
  if (n.includes("raffle") || n.includes("sweepstakes")) return Trophy
  if (n.includes("background")) return ShieldCheck
  return Sparkles
}

function addOnCircleClass(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("email")) return "bg-blue-600"
  if (n.includes("ai")) return "bg-purple-600"
  if (n.includes("sms")) return "bg-emerald-600"
  if (n.includes("raffle") || n.includes("sweepstakes")) return "bg-red-600"
  if (n.includes("background")) return "bg-slate-700 ring-2 ring-slate-600 dark:bg-blue-950 dark:ring-blue-800/80"
  return "bg-purple-600"
}

export function UnityMembershipCard({
  plan,
  includedColumns,
  introPrice,
  standardPrice,
  isCurrent = false,
  onSubscribe,
  onCancel,
  className,
}: UnityMembershipCardProps) {
  const pricingMarketing = pricingPageMarketingFromPlan(plan)
  const verificationCurrencyFields = planCurrencyCustomFields(plan)
  const introPeriodMonths = resolveIntroPeriodMonths(plan)
  const showIntroductoryStandard = standardPrice > introPrice

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col rounded-2xl p-[2px]",
        logoGradientFrame,
        logoGradientShadow,
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-slate-200/90 bg-white dark:border-white/[0.06] dark:bg-[#0b0b18]">
        <div className="relative shrink-0 overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
          <div className={cn("absolute inset-0", logoGradientDiagonal)} />
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-purple-400/20 blur-2xl" />
          <div className="relative flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-200/95 drop-shadow-sm" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white sm:text-sm">
                Believe In Unity
              </span>
            </div>
            <Badge className="border-0 bg-blue-600/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
              Unity Membership
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 flex-col text-slate-900 dark:text-white">
          <div className="relative border-b border-purple-200/80 px-4 pb-5 pt-6 text-center dark:border-purple-500/20 sm:px-5 sm:pb-7 sm:pt-8">
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 h-36 w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[48px]",
                logoGlowBlur,
              )}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[40px] dark:bg-blue-600/15" />
            <div className="relative space-y-3">
              <p className="inline-flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 rounded-full border border-purple-300/60 bg-gradient-to-r from-violet-100/90 to-sky-100/80 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-900 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:border-purple-500/25 dark:from-purple-600/15 dark:to-blue-600/10 dark:text-violet-100/90 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <span className="text-slate-700 dark:text-white/90">Vs.</span>
                <span style={{ color: RED }} className="font-bold">
                  {pricingMarketing.vsBadge}
                </span>
                <span className="text-slate-600 dark:text-white/60">{pricingMarketing.fragmentedLabel}</span>
              </p>

              <p className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl md:text-5xl">
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400">
                  ${formatPlanPrice(introPrice)}
                </span>
                <span className="text-base font-semibold text-slate-500 sm:text-lg md:text-xl dark:text-white/55">
                  {" "}
                  / {UNITY_MEMBERSHIP_DEFAULTS.frequency}
                </span>
              </p>
              {showIntroductoryStandard && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-purple-300">
                    {formatIntroductoryPeriodHeadline(introPeriodMonths)}
                  </p>
                  <p className="text-sm font-medium text-slate-600 dark:text-white/75">
                    {formatAfterIntroductoryPeriodCopy(
                      standardPrice,
                      UNITY_MEMBERSHIP_DEFAULTS.frequency,
                      introPeriodMonths,
                    )}
                  </p>
                </>
              )}
              <p className="text-xs text-slate-500 dark:text-white/60">{pricingMarketing.cancellationPolicy}</p>
              {verificationCurrencyFields.length > 0 ? (
                verificationCurrencyFields.map((f: PlanPricingCustomField, i: number) => {
                  const label = (f.label ?? "").trim() || "One-time fee"
                  const amount = formatCurrencyCustomFieldDisplay(String(f.value ?? ""))
                  return (
                    <p
                      key={`verify-${String(f.key ?? "")}-${i}`}
                      className="text-sm font-medium text-slate-600 dark:text-white/75"
                    >
                      + {label}
                      {amount ? ` ${amount}` : " (one-time)"}
                    </p>
                  )
                })
              ) : (
                <p className="text-sm font-medium text-slate-600 dark:text-white/75">
                  + {UNITY_MEMBERSHIP_DEFAULTS.verificationLabel}{" "}
                  {formatCurrencyCustomFieldDisplay(String(UNITY_MEMBERSHIP_DEFAULTS.verificationFee))} one-time
                </p>
              )}
              <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 dark:text-white/60">
                Everything your organization needs. All in one platform.
              </p>
            </div>
          </div>

          <div className="flex-1 bg-gradient-to-b from-slate-50/90 via-violet-50/40 to-sky-50/30 px-3 py-4 dark:from-transparent dark:via-purple-950/10 dark:to-blue-950/15 sm:px-4 sm:py-5">
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="h-px max-w-[4rem] flex-1 bg-gradient-to-r from-transparent via-violet-400/50 to-sky-400/50 dark:via-purple-500/40 dark:to-blue-500/40" />
              <h3 className="bg-gradient-to-r from-violet-700 to-blue-700 bg-clip-text text-[11px] font-bold uppercase tracking-[0.35em] text-transparent dark:from-purple-300 dark:to-blue-300">
                Everything included
              </h3>
              <span className="h-px max-w-[4rem] flex-1 bg-gradient-to-l from-transparent via-violet-400/50 to-sky-400/50 dark:via-purple-500/40 dark:to-blue-500/40" />
            </div>
            <div className="rounded-xl border border-violet-200/80 bg-white/90 p-3 ring-1 ring-inset ring-sky-200/50 backdrop-blur-sm dark:border-purple-500/20 dark:bg-[#12122c]/80 dark:ring-blue-500/10 sm:p-4">
              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-0">
                {includedColumns.map((column, colIdx) => (
                  <div key={`included-column-${colIdx}`} className="flex flex-col gap-2 sm:gap-2.5">
                    {column.map((label) => (
                      <div
                        key={label}
                        className="flex min-w-0 items-center gap-2 text-xs text-slate-700 sm:text-sm dark:text-white/85"
                      >
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-violet-300/70 bg-gradient-to-br from-violet-100 to-sky-100 dark:border-purple-400/30 dark:from-purple-600/20 dark:to-blue-600/15"
                          aria-hidden
                        >
                          <Check className="h-3 w-3 text-violet-700 dark:text-blue-200" strokeWidth={3} />
                        </span>
                        <span className="break-words">{label}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>


          <div className="mt-auto px-3 pb-4 sm:px-4 sm:pb-5">
            {isCurrent ? (
              <div className="space-y-2">
                <Button
                  className="h-12 w-full border border-slate-300 bg-slate-100 font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  disabled
                >
                  <Check className="mr-2 h-4 w-4" />
                  Current plan
                </Button>
                {onCancel && (
                  <Button className="h-12 w-full" variant="destructive" onClick={onCancel}>
                    Cancel Subscription
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="group relative h-12 w-full overflow-hidden border-0 font-semibold text-white shadow-lg transition hover:brightness-110"
                onClick={onSubscribe}
              >
                <span className={cn("absolute inset-0 opacity-95", logoGradientCTA)} aria-hidden />
                <span className="relative flex items-center justify-center gap-2">
                  Get started today
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            )}
          </div>

          <div className="relative flex items-center justify-center gap-2 overflow-hidden px-3 py-3 text-xs font-medium text-white sm:px-4 sm:py-3.5 sm:text-sm">
            <div className={cn("absolute inset-0", logoGradientFrame)} />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)]" />
            <Heart className="relative h-4 w-4 shrink-0 fill-blue-200/90 text-purple-100 drop-shadow" />
            <span className="relative tracking-wide">{pricingMarketing.cardFooterTagline}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UnityMembershipUsageAddOns({ addOns, className }: { addOns: UsageAddOn[]; className?: string }) {
  if (addOns.length === 0) return null

  return (
    <section className={cn("mb-4", className)}>
      <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-4 shadow-inner shadow-slate-200/50 dark:border-white/15 dark:bg-[#0a0a14] dark:shadow-black/40 sm:px-5 sm:py-5">
        <h2 className="mb-4 text-center text-xs font-bold uppercase leading-snug tracking-wide sm:text-sm">
          <span className="text-amber-600 dark:text-amber-400">Pay only when you grow</span>
          <span className="text-slate-900 dark:text-white"> — usage-based add-ons</span>
        </h2>
        <div className="overflow-x-auto overscroll-x-contain pb-1">
          <div className="flex min-w-min items-stretch justify-between gap-0 sm:min-w-0">
            {addOns.map((addOn, idx) => {
              const Icon = addOnIcon(addOn.name)
              return (
                <div
                  key={`${addOn.name}-${idx}`}
                  className={cn(
                    "flex min-w-[148px] flex-1 items-center gap-3 px-3 py-1 sm:min-w-0 sm:px-4 sm:py-0",
                    idx > 0 && "border-l border-dashed border-slate-200 dark:border-white/25",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md",
                      addOnCircleClass(addOn.name),
                    )}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-slate-900 sm:text-sm dark:text-white">
                      {addOn.name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-slate-600 sm:text-xs dark:text-white/75">
                      {addOn.price}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
