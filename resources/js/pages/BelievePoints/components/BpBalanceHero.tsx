import { Coins, Plus, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

type BpBalanceHeroProps = {
  balance: number
  processingBalance: number
  processingReleaseHint?: string | null
  formatPoints: (value: number | string) => string
  formatCurrency: (value: number | string) => string
  onRefunds: () => void
  onAddPoints: () => void
}

export function BpBalanceHero({
  balance,
  processingBalance,
  processingReleaseHint,
  formatPoints,
  formatCurrency,
  onRefunds,
  onAddPoints,
}: BpBalanceHeroProps) {
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
              <p className="text-xs text-muted-foreground">1 BP = $1 USD</p>
            </div>
          </div>
          {processingBalance > 0 && (
            <div className="max-w-[140px] shrink-0 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-right dark:border-amber-800/50 dark:bg-amber-950/30">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Processing
              </p>
              <p className="text-sm font-bold tabular-nums text-amber-800 dark:text-amber-200">
                {formatPoints(processingBalance)} BP
              </p>
              {processingReleaseHint && (
                <p className="mt-0.5 text-[10px] leading-tight text-amber-700/90 dark:text-amber-300/90">
                  {processingReleaseHint}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Available balance</p>
            <motion.div
              key={balance}
              initial={{ opacity: 0.6, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 flex items-baseline gap-1.5"
            >
              <span className="text-4xl font-bold tracking-tight tabular-nums text-foreground sm:text-5xl">
                {formatPoints(balance)}
              </span>
              <span className="text-lg font-semibold text-muted-foreground">BP</span>
            </motion.div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Face value ≈ {formatCurrency(balance)} for donations and eligible purchases
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
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
