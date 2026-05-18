"use client"

import { useMemo } from "react"
import { useForm, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Separator } from "@/components/frontend/ui/separator"
import { cn } from "@/lib/utils"
import InputError from "@/components/input-error"
import { showErrorToast, showSuccessToast } from "@/lib/toast"
import {
  Landmark,
  Sparkles,
  Percent,
  UsersRound,
  TrendingUp,
  Zap,
  Calendar,
  CalendarDays,
  CalendarRange,
  type LucideIcon,
} from "lucide-react"

export type CareAllianceFinancialPayload = {
  allocation_method: string
  distribution_frequency: string
  min_payout_cents: number
  management_fee_bps: number
  /** % of each donation shared equally among all active members (fixed allocation only); must sum to 100% with management fee. */
  financial_fixed_member_pool_percent: number
  financial_settings_completed_at: string | null
  example_preview: Array<{ label: string; cents: number; percent: number; tone: string }>
  member_organizations: Array<{ id: number; name: string }>
}

type Props = {
  allianceDisplayName: string
  financial: CareAllianceFinancialPayload
}

type AllocationTheme = {
  value: string
  label: string
  hint?: string
  Icon: LucideIcon
  idle: string
  active: string
  iconIdle: string
  iconActive: string
  indicator: string
}

const ALLOCATION_THEMES: AllocationTheme[] = [
  {
    value: "fixed_percentage",
    label: "Fixed Percentage",
    hint: "Set one percentage of each donation for all active members (split equally). The management fee is the remainder; together they must total 100%.",
    Icon: Percent,
    idle: "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 hover:border-amber-300/90 hover:shadow-md hover:shadow-amber-500/5 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-gray-950 dark:to-orange-950/20 dark:hover:border-amber-700/60",
    active:
      "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50/80 shadow-lg shadow-amber-500/15 ring-2 ring-amber-400/40 dark:border-amber-500 dark:from-amber-950/50 dark:to-orange-950/40 dark:ring-amber-400/30",
    iconIdle: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-inner",
    iconActive: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-110",
    indicator: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]",
  },
  {
    value: "proportional_equal",
    label: "Proportional (Equal Split)",
    hint: "Every active member receives an equal share of the amount left after the management fee.",
    Icon: UsersRound,
    idle: "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/50 hover:border-emerald-300/90 hover:shadow-md hover:shadow-emerald-500/5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:via-gray-950 dark:to-teal-950/20 dark:hover:border-emerald-700/60",
    active:
      "border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50/80 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-400/40 dark:border-emerald-500 dark:from-emerald-950/50 dark:to-teal-950/40 dark:ring-emerald-400/30",
    iconIdle: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-inner",
    iconActive: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-110",
    indicator: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.55)]",
  },
  {
    value: "weighted_by_donations",
    label: "Weighted by donations raised",
    hint: "Distribute funds to members proportionally based on total donations raised by each organization.",
    Icon: TrendingUp,
    idle: "border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/50 hover:border-violet-300/90 hover:shadow-md hover:shadow-violet-500/5 dark:border-violet-900/50 dark:from-violet-950/30 dark:via-gray-950 dark:to-fuchsia-950/20 dark:hover:border-violet-700/60",
    active:
      "border-violet-500 bg-gradient-to-br from-violet-50 to-fuchsia-50/80 shadow-lg shadow-violet-500/15 ring-2 ring-violet-400/40 dark:border-violet-500 dark:from-violet-950/50 dark:to-fuchsia-950/40 dark:ring-violet-400/30",
    iconIdle: "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-inner",
    iconActive: "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/30 scale-110",
    indicator: "bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.55)]",
  },
]

type ScheduleTheme = {
  value: string
  label: string
  Icon: LucideIcon
  idle: string
  active: string
  iconBoxIdle: string
  iconBoxActive: string
}

const SCHEDULE_THEMES: ScheduleTheme[] = [
  {
    value: "instant",
    label: "Instant (per donation)",
    Icon: Zap,
    idle: "border-sky-200/90 bg-sky-50/40 hover:border-sky-300 hover:bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/25 dark:hover:border-sky-700",
    active:
      "border-sky-500 bg-gradient-to-r from-sky-50 to-cyan-50 shadow-md shadow-sky-500/20 ring-2 ring-sky-400/35 dark:from-sky-950/60 dark:to-cyan-950/40 dark:border-sky-500 dark:ring-sky-400/25",
    iconBoxIdle: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300",
    iconBoxActive: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md",
  },
  {
    value: "weekly",
    label: "Weekly",
    Icon: Calendar,
    idle: "border-blue-200/90 bg-blue-50/30 hover:border-blue-300 hover:bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/20 dark:hover:border-blue-700",
    active:
      "border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/35 dark:from-blue-950/60 dark:to-indigo-950/40 dark:border-blue-500 dark:ring-blue-400/25",
    iconBoxIdle: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300",
    iconBoxActive: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md",
  },
  {
    value: "monthly",
    label: "Monthly",
    Icon: CalendarDays,
    idle: "border-indigo-200/90 bg-indigo-50/30 hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:hover:border-indigo-700",
    active:
      "border-indigo-500 bg-gradient-to-r from-indigo-50 to-violet-50 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/35 dark:from-indigo-950/60 dark:to-violet-950/40 dark:border-indigo-500 dark:ring-indigo-400/25",
    iconBoxIdle: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300",
    iconBoxActive: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md",
  },
  {
    value: "quarterly",
    label: "Quarterly",
    Icon: CalendarRange,
    idle: "border-rose-200/90 bg-rose-50/30 hover:border-rose-300 hover:bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:border-rose-700",
    active:
      "border-rose-500 bg-gradient-to-r from-rose-50 to-orange-50 shadow-md shadow-rose-500/20 ring-2 ring-rose-400/35 dark:from-rose-950/60 dark:to-orange-950/30 dark:border-rose-500 dark:ring-rose-400/25",
    iconBoxIdle: "bg-rose-500/15 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300",
    iconBoxActive: "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md",
  },
]

const allocationListVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const allocationCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 28 },
  },
}

const scheduleListVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

const scheduleChipVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 26 },
  },
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
}

function toneBarClass(tone: string): string {
  if (tone === "violet") {
    return "bg-gradient-to-r from-violet-600 to-violet-500 dark:from-violet-500 dark:to-violet-400"
  }
  if (tone === "emerald") {
    return "bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400"
  }
  return "bg-gradient-to-r from-indigo-600 to-indigo-500 dark:from-indigo-500 dark:to-indigo-400"
}

export default function CareAllianceFinancialSettingsSection({ allianceDisplayName, financial }: Props) {
  const page = usePage<{ errors?: Record<string, string> }>()
  const errs = page.props.errors ?? {}

  const defaultMemberPool =
    Math.round((100 - financial.management_fee_bps / 100) * 10) / 10

  const form = useForm({
    allocation_method: financial.allocation_method,
    distribution_frequency: financial.distribution_frequency,
    min_payout_dollars: financial.min_payout_cents / 100,
    management_fee_percent: financial.management_fee_bps / 100,
    financial_fixed_member_pool_percent:
      financial.financial_fixed_member_pool_percent > 0
        ? financial.financial_fixed_member_pool_percent
        : defaultMemberPool,
  })

  const demoPreview = useMemo(() => {
    const demoCents = 10000
    const feeBps = Math.round(Number(form.data.management_fee_percent) * 100)
    const feeCents = Math.floor((demoCents * feeBps) / 10000)
    const remainder = demoCents - feeCents
    const method = form.data.allocation_method

    const rows: Array<{ label: string; cents: number; percent: number; tone: string }> = []

    if (method === "fixed_percentage") {
      const poolBps = Math.round(Number(form.data.financial_fixed_member_pool_percent) * 100)
      const poolCents = Math.floor((demoCents * poolBps) / 10000)
      const n = financial.member_organizations.length
      if (n > 0) {
        let allocated = 0
        financial.member_organizations.forEach((org, i) => {
          const isLast = i === n - 1
          const cents = isLast ? poolCents - allocated : Math.floor(poolCents / n)
          allocated += cents
          rows.push({
            label: org.name,
            cents,
            percent: demoCents > 0 ? Math.round(((100 * cents) / demoCents) * 10) / 10 : 0,
            tone: i % 2 === 0 ? "emerald" : "amber",
          })
        })
      }
    } else if (method === "proportional_equal") {
      const n = financial.member_organizations.length
      if (n > 0) {
        let allocated = 0
        financial.member_organizations.forEach((org, i) => {
          const isLast = i === n - 1
          const cents = isLast ? remainder - allocated : Math.floor(remainder / n)
          allocated += cents
          rows.push({
            label: org.name,
            cents,
            percent: demoCents > 0 ? Math.round((100 * cents) / demoCents * 10) / 10 : 0,
            tone: i % 2 === 0 ? "emerald" : "amber",
          })
        })
      }
    } else {
      const n = financial.member_organizations.length
      if (n > 0) {
        let allocated = 0
        financial.member_organizations.forEach((org, i) => {
          const isLast = i === n - 1
          const cents = isLast ? remainder - allocated : Math.floor(remainder / n)
          allocated += cents
          rows.push({
            label: org.name,
            cents,
            percent: demoCents > 0 ? Math.round((100 * cents) / demoCents * 10) / 10 : 0,
            tone: i % 2 === 0 ? "emerald" : "amber",
          })
        })
      }
    }

    if (feeCents > 0) {
      rows.push({
        label: `${allianceDisplayName} (Alliance)`,
        cents: feeCents,
        percent: demoCents > 0 ? Math.round((100 * feeCents) / demoCents * 10) / 10 : 0,
        tone: "violet",
      })
    }

    return rows
  }, [
    form.data.allocation_method,
    form.data.management_fee_percent,
    form.data.financial_fixed_member_pool_percent,
    financial.member_organizations,
    allianceDisplayName,
  ])

  const save = () => {
    form.patch(route("profile.financial.update"), {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Financial settings saved. General donations will use these rules.")
      },
      onError: () => {
        showErrorToast("Please fix the highlighted fields and try again.")
      },
    })
  }

  const inputClass =
    "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus-visible:ring-blue-500/30"

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <Card className="overflow-hidden border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/50">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white pb-4 dark:border-gray-800 dark:from-gray-900/50 dark:to-gray-950/80">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
                <Landmark className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-xl text-gray-900 dark:text-white">Financial allocation</CardTitle>
                <CardDescription className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  These rules apply to <span className="font-medium text-gray-800 dark:text-gray-200">general donations</span>{" "}
                  from the main Give / donate flow — not campaign-specific donations.
                </CardDescription>
              </div>
            </div>
            {!financial.financial_settings_completed_at ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 overflow-hidden rounded-lg border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100"
              >
                Complete and save these settings to enable Care Alliance donations from the general donate flow.
              </motion.div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-8 pt-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900 dark:text-white">Allocation method</Label>
              <motion.div
                className="grid gap-3 sm:gap-3"
                variants={allocationListVariants}
                initial="hidden"
                animate="show"
              >
                {ALLOCATION_THEMES.map((theme) => {
                  const checked = form.data.allocation_method === theme.value
                  const Icon = theme.Icon
                  return (
                    <motion.label
                      key={theme.value}
                      variants={allocationCardVariants}
                      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.992 }}
                      className={cn(
                        "group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border-2 p-4 transition-colors duration-300",
                        checked ? theme.active : theme.idle,
                      )}
                    >
                      <input
                        type="radio"
                        name="allocation_method"
                        className="sr-only"
                        checked={checked}
                        aria-label={theme.label}
                        onChange={() => form.setData("allocation_method", theme.value)}
                      />
                      <motion.span
                        aria-hidden
                        className={cn(
                          "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                          checked ? theme.iconActive : theme.iconIdle,
                        )}
                        animate={checked ? { rotate: [0, -4, 4, 0] } : { rotate: 0 }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.25} />
                      </motion.span>
                      <div className="relative z-10 min-w-0 flex-1 pt-0.5">
                        <span className="font-semibold text-gray-900 dark:text-white">{theme.label}</span>
                        {theme.hint ? (
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{theme.hint}</p>
                        ) : null}
                      </div>
                      <motion.span
                        aria-hidden
                        className={cn("absolute right-4 top-4 z-10 h-2.5 w-2.5 rounded-full", theme.indicator)}
                        initial={false}
                        animate={
                          checked
                            ? { scale: [0, 1.2, 1], opacity: 1 }
                            : { scale: 0, opacity: 0 }
                        }
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      />
                      {checked ? (
                        <motion.div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl ring-1 ring-inset ring-white/50 dark:ring-white/15"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.25, 0.55, 0.25] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ) : null}
                    </motion.label>
                  )
                })}
              </motion.div>
              <InputError message={errs.allocation_method} />
            </div>

            <Separator className="bg-gray-200 dark:bg-gray-800" />

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-900 dark:text-white">Distribution schedule</Label>
              <motion.div
                className="flex flex-wrap gap-2.5"
                variants={scheduleListVariants}
                initial="hidden"
                animate="show"
              >
                {SCHEDULE_THEMES.map((sch) => {
                  const checked = form.data.distribution_frequency === sch.value
                  const SchIcon = sch.Icon
                  return (
                    <motion.label
                      key={sch.value}
                      variants={scheduleChipVariants}
                      whileHover={{ y: -2, transition: { duration: 0.18 } }}
                      whileTap={{ scale: 0.96 }}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-sm font-semibold transition-shadow duration-300",
                        checked ? sch.active : sch.idle,
                      )}
                    >
                      <input
                        type="radio"
                        name="distribution_frequency"
                        className="sr-only"
                        checked={checked}
                        aria-label={sch.label}
                        onChange={() => form.setData("distribution_frequency", sch.value)}
                      />
                      <motion.span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                          checked ? sch.iconBoxActive : sch.iconBoxIdle,
                        )}
                        animate={checked ? { rotate: [0, -6, 6, 0] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        <SchIcon className="h-4 w-4" strokeWidth={2.25} />
                      </motion.span>
                      <span className="text-gray-900 dark:text-white">{sch.label}</span>
                    </motion.label>
                  )
                })}
              </motion.div>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Instant</span> credits member and alliance
                balances when each donation completes.{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">Weekly, monthly,</span> and{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">quarterly</span> accumulate each
                donation&apos;s split in a pool and release to wallets after 7, 30, or 90 days from the start of that
                pool (scheduler runs hourly; amounts must also meet your minimum payout below).
              </p>
              <InputError message={errs.distribution_frequency} />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="min_payout" className="text-sm font-semibold text-gray-900 dark:text-white">
                  Minimum payout
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                    $
                  </span>
                  <Input
                    id="min_payout"
                    type="number"
                    min={1}
                    step={1}
                    className={cn("pl-7", inputClass)}
                    value={form.data.min_payout_dollars}
                    onChange={(e) => form.setData("min_payout_dollars", Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
                <InputError message={errs.min_payout_dollars} />
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  For <span className="font-medium text-gray-700 dark:text-gray-300">weekly, monthly,</span> and{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">quarterly</span> distribution, the
                  alliance fee and each member organization&apos;s pooled share are only paid to wallets once that amount
                  reaches at least this minimum. Smaller balances stay in the pool until they do.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mgmt_fee" className="text-sm font-semibold text-gray-900 dark:text-white">
                  Management fee
                </Label>
                <div className="relative">
                  <Input
                    id="mgmt_fee"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className={cn("pr-9", inputClass)}
                    value={form.data.management_fee_percent}
                    onChange={(e) => form.setData("management_fee_percent", Number.parseFloat(e.target.value) || 0)}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
                <InputError message={errs.management_fee_percent} />
              </div>
            </div>

            {form.data.allocation_method === "fixed_percentage" ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/50"
              >
                <div className="space-y-2">
                  <Label htmlFor="member_pool_pct" className="text-sm font-semibold text-gray-900 dark:text-white">
                    Member pool (% of each donation)
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    This percentage is divided <span className="font-medium text-gray-800 dark:text-gray-200">equally</span>{" "}
                    among every active member organization. It must add up to 100% with the management fee above.
                  </p>
                  <div className="relative max-w-xs">
                    <Input
                      id="member_pool_pct"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className={cn("pr-9", inputClass)}
                      value={form.data.financial_fixed_member_pool_percent}
                      onChange={(e) =>
                        form.setData("financial_fixed_member_pool_percent", Number.parseFloat(e.target.value) || 0)
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                </div>
                <InputError message={errs.financial_fixed_member_pool_percent} />
              </motion.div>
            ) : null}

            <div className="flex justify-end border-t border-gray-100 pt-2 dark:border-gray-800">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  disabled={form.processing}
                  onClick={save}
                  className="min-w-[180px] bg-blue-600 px-8 font-semibold text-white shadow-md shadow-blue-600/25 transition-shadow hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {form.processing ? "Saving…" : "Save settings"}
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden />
              <CardTitle className="text-lg text-gray-900 dark:text-white">Example allocation</CardTitle>
            </div>
            <CardDescription>
              Live preview for a <span className="font-medium text-gray-800 dark:text-gray-200">$100.00</span> donation
              (before payment processing fees).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {financial.member_organizations.length === 0 &&
            ["proportional_equal", "weighted_by_donations", "fixed_percentage"].includes(form.data.allocation_method) ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Add active member organizations to preview splits for this allocation method.
              </p>
            ) : (
              <ul className="space-y-5">
                {demoPreview.map((row, i) => (
                  <li key={`${row.label}-${i}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">{row.label}</span>
                        <span className="tabular-nums text-gray-700 dark:text-gray-300">
                          ${(row.cents / 100).toFixed(2)}
                          <span className="mx-1.5 text-gray-400">·</span>
                          {row.percent}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200/90 dark:bg-gray-800">
                        <motion.div
                          className={cn("h-full rounded-full will-change-transform", toneBarClass(row.tone))}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, row.percent)}%` }}
                          transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.12 + i * 0.06 }}
                        />
                      </div>
                    </motion.div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
