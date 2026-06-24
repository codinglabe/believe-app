import { Coins, Plus, RefreshCw, Wallet } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type BpBalanceHeroProps = {
  balance: number
  processingBalance: number
  processingReleaseHint?: string | null
  formatPoints: (value: number | string) => string
  formatCurrency: (value: number | string) => string
  onRefunds: () => void
  onAddPoints: () => void
  showWalletAction?: boolean
  onMoveToWallet?: () => void
}

type QuickAction = {
  id: string
  label: string
  icon: typeof Plus
  onClick: () => void
}

export function BpBalanceHero({
  balance,
  processingBalance,
  processingReleaseHint,
  formatPoints,
  formatCurrency,
  onRefunds,
  onAddPoints,
  showWalletAction,
  onMoveToWallet,
}: BpBalanceHeroProps) {
  const actions: QuickAction[] = [
    { id: "add", label: "Add BP", icon: Plus, onClick: onAddPoints },
    ...(showWalletAction && onMoveToWallet
      ? [{ id: "wallet", label: "To Wallet", icon: Wallet, onClick: onMoveToWallet }]
      : []),
    { id: "refunds", label: "Refunds", icon: RefreshCw, onClick: onRefunds },
  ]

  const colCount = actions.length

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-purple-600/10 to-blue-600/5 blur-2xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/15 to-blue-600/10">
              <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Believe Points</p>
              <p className="text-xs text-muted-foreground">1 BP = $1 USD</p>
            </div>
          </div>
          {processingBalance > 0 && (
            <div className="shrink-0 max-w-[140px] rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-right dark:border-amber-800/50 dark:bg-amber-950/30">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                On hold
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

        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground">Available balance</p>
          <motion.div
            key={balance}
            initial={{ opacity: 0.6, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 flex items-baseline gap-1.5"
          >
            <span className="text-4xl font-bold tracking-tight tabular-nums bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent sm:text-5xl">
              {formatPoints(balance)}
            </span>
            <span className="text-lg font-semibold text-muted-foreground">BP</span>
          </motion.div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Face value ≈ {formatCurrency(balance)} for donations and eligible purchases
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-muted/20 px-3 py-3 sm:px-4">
        <div
          className={cn(
            "grid gap-1",
            colCount === 3 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                onClick={action.onClick}
                className="group flex flex-col items-center gap-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm transition-transform group-hover:scale-105 group-active:scale-95">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                  {action.label}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
