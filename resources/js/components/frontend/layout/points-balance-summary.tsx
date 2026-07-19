import { Link } from "@inertiajs/react"
import { ChevronRight, Gift, Info, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

interface PointsUser {
  /** Settled / spendable reward points. */
  reward_points?: number
  available_reward_points?: number
  /** Reward points still processing. */
  processing_reward_points?: number
  /** Total reward points (available + processing). */
  reward_points_total?: number
  believe_points?: number
  processing_believe_points?: number
  believe_points_total?: number
  gifted_believe_points?: number
  holding_believe_points?: number
}

const fmt = (value: unknown) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

function MetricColumn({
  label,
  value,
  badge,
  valueClassName,
}: {
  label: string
  value: string
  badge?: { text: string; className: string }
  valueClassName: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-sm">{label}</span>
        <Info className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className={cn("text-xl font-bold", valueClassName)}>{value}</span>
        {badge && (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium leading-none", badge.className)}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  )
}

export function PointsBalanceSummary({ user }: { user: PointsUser }) {
  const hasReward =
    user?.reward_points !== undefined ||
    user?.available_reward_points !== undefined ||
    user?.processing_reward_points !== undefined ||
    user?.reward_points_total !== undefined
  const hasBelieve = user?.believe_points !== undefined

  const rewardAvailable = Number(user?.available_reward_points ?? user?.reward_points) || 0
  const rewardProcessing = Number(user?.processing_reward_points) || 0
  // Dashboard total = processing + available (same as Believe Points).
  const rewardTotal =
    user?.reward_points_total !== undefined ? Number(user.reward_points_total) : rewardAvailable + rewardProcessing

  const believeAvailable = Number(user?.believe_points) || 0
  const believeProcessing = Number(user?.processing_believe_points) || 0
  // Dashboard total = processing + available (gifted is shown separately below).
  const believeTotal = believeAvailable + believeProcessing
  const giftedBelieve = Number(user?.gifted_believe_points) || 0
  const holdingBelieve = Number(user?.holding_believe_points) || 0

  return (
    <div className="space-y-3">
      {/* Reward Points */}
      {hasReward && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Reward Points (BRP)</p>
                <p className="text-2xl font-bold leading-tight text-blue-700 dark:text-blue-300">{fmt(rewardTotal)}</p>
              </div>
            </div>
            <span className="shrink-0 text-base font-semibold text-blue-600 dark:text-blue-400">Earned</span>
          </div>
          <div className="mt-2.5 flex items-stretch gap-3 border-t border-blue-200/70 pt-2.5 dark:border-blue-800/70">
            <MetricColumn
              label="Processing"
              value={fmt(rewardProcessing)}
              valueClassName="text-blue-700 dark:text-blue-300"
              badge={
                rewardProcessing > 0
                  ? {
                      text: "Processing",
                      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                    }
                  : undefined
              }
            />
            <div className="w-px self-stretch bg-blue-200/70 dark:bg-blue-800/70" />
            <MetricColumn
              label="Available"
              value={fmt(rewardAvailable)}
              valueClassName="text-blue-700 dark:text-blue-300"
              badge={
                rewardAvailable > 0
                  ? {
                      text: "Available",
                      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Believe Points — tap to buy / manage */}
      {hasBelieve && (
        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-3 transition-all hover:border-purple-400 dark:border-purple-800 dark:from-purple-950/30 dark:to-pink-950/20 dark:hover:border-purple-600">
          <Link href={route("believe-points.index")} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Believe Points (BP)</p>
                <p className="text-2xl font-bold leading-tight text-purple-700 dark:text-purple-300">{fmt(believeTotal)}</p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-0.5 text-base font-semibold text-purple-600 dark:text-purple-400">
              Buy
              <ChevronRight className="h-5 w-5" />
            </span>
          </Link>
          <div className="mt-2.5 flex items-stretch gap-3 border-t border-purple-200/70 pt-2.5 dark:border-purple-800/70">
            <MetricColumn
              label="Processing"
              value={fmt(believeProcessing)}
              valueClassName="text-purple-700 dark:text-purple-300"
              badge={
                believeProcessing > 0
                  ? {
                      text: "Processing",
                      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
                    }
                  : undefined
              }
            />
            <div className="w-px self-stretch bg-purple-200/70 dark:bg-purple-800/70" />
            <MetricColumn
              label="Available"
              value={fmt(believeAvailable)}
              valueClassName="text-purple-700 dark:text-purple-300"
              badge={
                believeAvailable > 0
                  ? {
                      text: "Available",
                      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                    }
                  : undefined
              }
            />
          </div>
          <Link
            href={route("believe-points.index")}
            className="mt-2.5 flex items-center justify-between gap-1 border-t border-purple-200/70 pt-2.5 text-base font-semibold text-amber-600 dark:border-purple-800/70 dark:text-amber-400"
          >
            <span className="flex items-center gap-2">
              <Gift className="h-5 w-5 shrink-0" aria-hidden />
              {fmt(giftedBelieve)} Gifted
            </span>
            <ChevronRight className="h-5 w-5" />
          </Link>
          {holdingBelieve > 0 && (
            <Link
              href="/gift-bp"
              className="mt-2 flex items-center justify-between gap-1 border-t border-purple-200/70 pt-2 text-sm font-semibold text-amber-700 dark:border-purple-800/70 dark:text-amber-300"
            >
              <span>{fmt(holdingBelieve)} Holding (pending invites)</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-2 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-snug">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p>
            <span className="font-semibold text-purple-600 dark:text-purple-400">Processing:</span>{" "}
            <span className="text-muted-foreground">
              Funding is in progress. Can be used for selected transactions.
            </span>
          </p>
          <p>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Available:</span>{" "}
            <span className="text-muted-foreground">Funds have settled. Can be used for all eligible transactions.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
