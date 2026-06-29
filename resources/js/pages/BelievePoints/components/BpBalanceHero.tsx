import { Coins, Info, Plus, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BpBalanceHeroProps = {
  balance: number
  processingBalance: number
  processingReleaseHint?: string | null
  formatPoints: (value: number | string) => string
  onRefunds: () => void
  onAddPoints: () => void
}

function BalanceColumn({
  label,
  value,
  hint,
  badge,
  valueClassName,
}: {
  label: string
  value: string
  hint?: string | null
  badge?: { text: string; className: string }
  valueClassName: string
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        <Info className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className={cn("text-3xl font-bold tracking-tight tabular-nums sm:text-4xl", valueClassName)}>
          {value}
        </span>
        <span className="text-base font-semibold text-muted-foreground">BP</span>
        {badge && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", badge.className)}>
            {badge.text}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-[11px] leading-snug text-amber-700/90 dark:text-amber-300/90">{hint}</p>
      )}
    </div>
  )
}

export function BpBalanceHero({
  balance,
  processingBalance,
  processingReleaseHint,
  formatPoints,
  onRefunds,
  onAddPoints,
}: BpBalanceHeroProps) {
  const totalBalance = balance + processingBalance

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10">
              <Coins className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Believe Points</p>
              <p className="text-xs text-muted-foreground">
                Total:{" "}
                <motion.span
                  key={totalBalance}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="font-semibold tabular-nums text-foreground"
                >
                  {formatPoints(totalBalance)} BP
                </motion.span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-stretch gap-4 border-t border-border pt-5">
          <BalanceColumn
            label="Processing"
            value={formatPoints(processingBalance)}
            hint={processingBalance > 0 ? processingReleaseHint : null}
            valueClassName="text-amber-700 dark:text-amber-300"
            badge={
              processingBalance > 0
                ? {
                    text: "Processing",
                    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
                  }
                : undefined
            }
          />
          <div className="w-px self-stretch bg-border" />
          <BalanceColumn
            label="Available"
            value={formatPoints(balance)}
            valueClassName="text-foreground"
            badge={
              balance > 0
                ? {
                    text: "Available",
                    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
                  }
                : undefined
            }
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-snug text-muted-foreground">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Processing:</span>{" "}
            Funding is in progress.{" "}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Available:</span>{" "}
            Can be used for all eligible transactions.
          </p>

          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 text-muted-foreground hover:text-foreground"
              onClick={onRefunds}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refunds
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 bg-purple-600 px-4 hover:bg-purple-700"
              onClick={onAddPoints}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add BP
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
