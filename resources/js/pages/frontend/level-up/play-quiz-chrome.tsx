import React from "react"
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
        <div className="rounded-t-2xl border border-purple-500/30 border-b-0 bg-[#06050c]/92 px-3 py-3 shadow-[0_-16px_48px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 text-[12px] sm:text-[13px]">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-purple-300/95">
              <Coins className="h-4 w-4 shrink-0 text-purple-400" />
              <span className="shrink-0 text-white/50">Score:</span>
              <span className="font-bold tabular-nums text-white">{Math.round(rewardPointsBalance).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-purple-200/95">
              <Flame className="h-4 w-4 shrink-0 text-purple-400" />
              <span className="text-white/50">Streak</span>
              <span className="font-bold tabular-nums text-blue-400">+{sessionStreak}</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-300/95">
              <Star className="h-3.5 w-3.5 shrink-0 fill-purple-500 text-blue-500" />
              <span className="max-w-[6.5rem] truncate font-semibold tabular-nums text-white/95 sm:max-w-none">
                {questionProgressLabel}
              </span>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1a1510]/90 ring-1 ring-black/40">
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
        <div className="absolute bottom-4 left-1/2 h-40 w-[85%] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(196,181,253,0.45),rgba(37,99,235,0.2),transparent_70%)] blur-2xl" />
        <div className="absolute bottom-2 left-1/2 h-32 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_45%_60%_at_50%_100%,rgba(147,51,234,0.35),transparent_65%)] blur-md" />
        <div className="absolute bottom-0 left-1/2 flex h-[5.5rem] w-[76%] -translate-x-1/2 items-end justify-center rounded-t-xl border border-purple-500/45 bg-gradient-to-b from-[#120818]/95 to-[#05060c] shadow-[0_0_50px_rgba(147,51,234,0.3)]">
          <div className="mb-1 h-[88%] w-[40%] rounded-sm border border-purple-500/30 bg-[linear-gradient(145deg,rgba(147,51,234,0.18),transparent_55%)] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]" />
          <div className="mx-0.5 mb-1 h-[88%] w-[40%] rounded-sm border border-blue-600/25 bg-[linear-gradient(-145deg,rgba(37,99,235,0.14),transparent_55%)] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]" />
        </div>
      </div>
    </div>
  )
}

export function PlayTimerPill({
  secondsLeft,
  limitSec,
}: {
  secondsLeft: number
  limitSec: number
}) {
  return (
    <div className="flex items-center justify-center gap-2 pb-1">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold tabular-nums shadow-md sm:text-sm",
          secondsLeft <= 1.5
            ? "border-red-500/50 bg-red-950/55 text-red-100"
            : "border-purple-500/40 bg-black/40 text-purple-100 backdrop-blur-sm"
        )}
      >
        <Timer className="h-3.5 w-3.5 shrink-0 text-purple-400" />
        {Math.ceil(secondsLeft)}s
      </div>
      <span className="text-[11px] text-white/35">/ {limitSec}s</span>
    </div>
  )
}
