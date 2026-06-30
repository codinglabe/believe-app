import { Coins, Info, Plus, RefreshCw, Wallet } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type BpBalanceHeroProps = {
  balance: number
  processingBalance: number
  processingReleaseHint?: string | null
  giftedBalance?: number
  formatPoints: (value: number | string) => string
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
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              badge.className,
            )}
          >
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
  giftedBalance = 0,
  formatPoints,
  onRefunds,
  onAddPoints,
  showWalletAction,
  onMoveToWallet,
}: BpBalanceHeroProps) {
  const totalBalance = balance + processingBalance

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
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/15 to-blue-600/10">
              <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
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
            valueClassName="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
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

        {giftedBalance > 0 && (
          <div className="mt-4 rounded-lg border border-violet-200/80 bg-violet-50/80 px-3 py-2.5 dark:border-violet-800/50 dark:bg-violet-950/25">
            <p className="text-[11px] font-medium text-violet-800 dark:text-violet-200">
              Gifted BP:{" "}
              <span className="font-bold tabular-nums">{formatPoints(giftedBalance)} BP</span>
              <span className="font-normal text-violet-700/90 dark:text-violet-300/90">
                {" "}
                — for donations only; cannot move to wallet
              </span>
            </p>
          </div>
        )}

        <div className="mt-4 space-y-1 text-[11px] leading-snug text-muted-foreground">
          <p>
            <span className="font-semibold text-purple-600 dark:text-purple-400">Processing:</span>{" "}
            Funding is in progress. Can be used for selected transactions.
          </p>
          <p>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Available:</span>{" "}
            Funds have settled. Can be used for all eligible transactions.
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-muted/20 px-3 py-3 sm:px-4">
        <div className={cn("grid gap-1", colCount === 3 ? "grid-cols-3" : "grid-cols-2")}>
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
