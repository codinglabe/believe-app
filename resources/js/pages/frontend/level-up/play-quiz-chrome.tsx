import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { Coins, Flame, Star, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChallengePlayNebulaBackdrop, challengeHudProgressFill } from "./challenge-hub-brand"

/** Full-bleed cosmic night sky — shared Believe Wallet brand nebula + stars. */
export function PlayQuizBackground() {
  return <ChallengePlayNebulaBackdrop className="overflow-hidden" />
}

/** Bottom status bar only (no top header) — Score, Streak, progress (brand purple → blue). */
export function PlayQuizFooterDock({
  rewardPointsBalance,
  sessionStreak,
  questionProgressLabel,
  progressFraction,
}: {
  rewardPointsBalance: number
  sessionStreak: number
  questionProgressLabel: string
  progressFraction: number
}) {
  const pct = Math.min(100, Math.max(0, progressFraction * 100))
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto max-w-lg px-3 sm:px-4">
        <div className="rounded-t-2xl border border-purple-200/90 border-b-0 bg-white/95 px-3 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-purple-500/30 dark:border-b-0 dark:bg-[#06050c]/92 dark:shadow-none sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 text-[12px] sm:text-[13px]">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-purple-700 dark:text-purple-300/95">
              <Coins className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="shrink-0 text-slate-500 dark:text-white/50">Score:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">{Math.round(rewardPointsBalance).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-purple-800 dark:text-purple-200/95">
              <Flame className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="text-slate-500 dark:text-white/50">Streak</span>
              <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">+{sessionStreak}</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300/95">
              <Star className="h-3.5 w-3.5 shrink-0 fill-purple-500 text-blue-500" />
              <span className="max-w-[6.5rem] truncate font-semibold tabular-nums text-slate-900 dark:text-white/95 sm:max-w-none">
                {questionProgressLabel}
              </span>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-300/60 dark:bg-[#1a1510]/90 dark:ring-black/40">
            <motion.div
              className={cn("h-full rounded-full", challengeHudProgressFill)}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Open book + brand-tinted light (purple / blue). */
export function PlayBookIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[5.25rem] left-1/2 z-[1] w-[min(94vw,440px)] -translate-x-1/2 sm:bottom-[5.75rem]",
        className
      )}
      aria-hidden
    >
      <div className="relative mx-auto h-40 w-full max-w-md">
        <div className="absolute bottom-4 left-1/2 h-40 w-[85%] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(196,181,253,0.55),rgba(37,99,235,0.15),transparent_70%)] blur-2xl dark:bg-[radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(196,181,253,0.45),rgba(37,99,235,0.2),transparent_70%)]" />
        <div className="absolute bottom-2 left-1/2 h-32 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_45%_60%_at_50%_100%,rgba(147,51,234,0.22),transparent_65%)] blur-md dark:bg-[radial-gradient(ellipse_45%_60%_at_50%_100%,rgba(147,51,234,0.35),transparent_65%)]" />
        <div className="absolute bottom-0 left-1/2 flex h-[5.5rem] w-[76%] -translate-x-1/2 items-end justify-center rounded-t-xl border border-purple-300/80 bg-gradient-to-b from-white to-slate-100 shadow-lg shadow-purple-200/40 dark:border-purple-500/45 dark:from-[#120818]/95 dark:to-[#05060c] dark:shadow-none">
          <div className="mb-1 h-[88%] w-[40%] rounded-sm border border-purple-300/50 bg-[linear-gradient(145deg,rgba(147,51,234,0.12),transparent_55%)] shadow-[inset_0_0_12px_rgba(15,23,42,0.06)] dark:border-purple-500/30 dark:bg-[linear-gradient(145deg,rgba(147,51,234,0.18),transparent_55%)] dark:shadow-none" />
          <div className="mx-0.5 mb-1 h-[88%] w-[40%] rounded-sm border border-blue-400/40 bg-[linear-gradient(-145deg,rgba(37,99,235,0.1),transparent_55%)] shadow-[inset_0_0_12px_rgba(15,23,42,0.06)] dark:border-blue-600/25 dark:bg-[linear-gradient(-145deg,rgba(37,99,235,0.14),transparent_55%)] dark:shadow-none" />
        </div>
      </div>
    </div>
  )
}

const TIMER_RING_SIZE = 56
const TIMER_RING_STROKE = 3
const TIMER_R = (TIMER_RING_SIZE - TIMER_RING_STROKE) / 2
const TIMER_C = TIMER_RING_SIZE / 2
const TIMER_CIRC = 2 * Math.PI * TIMER_R

export function PlayTimerPill({
  secondsLeft,
  limitSec,
}: {
  secondsLeft: number
  limitSec: number
}) {
  const safeLimit = Math.max(1, limitSec)
  const pct = Math.min(1, Math.max(0, secondsLeft / safeLimit))
  const displaySec = Math.max(0, Math.ceil(secondsLeft))
  const phase = pct <= 0.18 ? "critical" : pct <= 0.42 ? "warn" : "ok"

  const ringOffset = useMemo(() => TIMER_CIRC * (1 - pct), [pct])

  const ringClass =
    phase === "critical"
      ? "text-red-500 drop-shadow-[0_0_10px_rgba(248,113,113,0.35)] dark:text-red-400 dark:drop-shadow-none"
      : phase === "warn"
        ? "text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.25)] dark:text-amber-400 dark:drop-shadow-none"
        : "text-emerald-600 dark:text-emerald-400/95 dark:drop-shadow-none"

  const labelTint =
    phase === "critical"
      ? "text-red-700 dark:text-red-200/90"
      : phase === "warn"
        ? "text-amber-800 dark:text-amber-100/90"
        : "text-emerald-800 dark:text-emerald-100/90"

  return (
    <div className="mx-auto w-full max-w-md pb-0.5" role="timer" aria-live="polite" aria-atomic="true">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border px-3 py-2 shadow-md backdrop-blur-xl sm:px-3.5 sm:py-2 dark:shadow-none",
          phase === "critical"
            ? "border-red-300/90 bg-gradient-to-br from-red-50 via-white to-rose-50 ring-1 ring-red-200/80 dark:border-red-500/35 dark:from-red-950/50 dark:via-[#0c0810]/88 dark:to-[#06050c]/95 dark:ring-red-500/20"
            : phase === "warn"
              ? "border-amber-300/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/90 ring-1 ring-amber-200/70 dark:border-amber-500/30 dark:from-amber-950/35 dark:via-[#0c0814]/90 dark:to-[#06050c]/95 dark:ring-amber-500/15"
              : "border-purple-200/90 bg-gradient-to-br from-violet-50 via-white to-slate-50 ring-1 ring-purple-200/70 dark:border-purple-500/35 dark:from-purple-950/40 dark:via-[#080614]/90 dark:to-[#06050c]/95 dark:ring-purple-500/20"
        )}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-purple-400/15 blur-xl dark:bg-purple-500/10"
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5 sm:gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <svg
              width={TIMER_RING_SIZE}
              height={TIMER_RING_SIZE}
              className="-rotate-90 transform"
              viewBox={`0 0 ${TIMER_RING_SIZE} ${TIMER_RING_SIZE}`}
              aria-hidden
            >
              <circle
                cx={TIMER_C}
                cy={TIMER_C}
                r={TIMER_R}
                fill="none"
                stroke="currentColor"
                strokeWidth={TIMER_RING_STROKE}
                className="text-slate-200 dark:text-white/[0.08]"
              />
              <motion.circle
                cx={TIMER_C}
                cy={TIMER_C}
                r={TIMER_R}
                fill="none"
                stroke="currentColor"
                strokeWidth={TIMER_RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={TIMER_CIRC}
                initial={false}
                animate={{ strokeDashoffset: ringOffset }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
                className={ringClass}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={cn(
                  "font-semibold tabular-nums tracking-tight leading-none text-slate-900 dark:text-white",
                  displaySec >= 10 ? "text-lg sm:text-xl" : "text-xl sm:text-[1.35rem]"
                )}
              >
                {displaySec}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/40 sm:text-[10px]">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
                  <Timer className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
                </span>
                Time remaining
              </p>
              <p className={cn("mt-0.5 text-xs font-medium tabular-nums sm:text-sm", labelTint)}>
                <span className="text-slate-900 dark:text-white/90">{displaySec}</span>
                <span className="text-slate-500 dark:text-white/45"> / {safeLimit}</span>
                <span className="text-slate-400 dark:text-white/35"> sec</span>
              </p>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-inset ring-slate-300/70 dark:bg-white/[0.07] dark:ring-white/[0.06]">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  phase === "critical"
                    ? "bg-gradient-to-r from-red-600 to-rose-500"
                    : phase === "warn"
                      ? "bg-gradient-to-r from-amber-600 to-amber-400"
                      : "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400"
                )}
                initial={false}
                animate={{ width: `${pct * 100}%` }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
