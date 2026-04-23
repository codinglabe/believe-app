import React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Coins, Sparkles, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { springTransition } from "./level-up-motion"
import {
  brandLogoGradientSolid,
  brandLogoGradientText,
  ChallengePlayNebulaBackdrop,
  challengePrimaryCta,
} from "./challenge-hub-brand"

export interface QuizResultPayload {
  headline: string
  summary: string
  congratulations: boolean
  score_correct: number
  score_total: number
  points_from_answers: number
  streak_bonus: number
  points_total: number
  max_streak: number
  total_time_ms: number
  reward_points_balance: number
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0s"
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m > 0) {
    return `${m}:${rem.toString().padStart(2, "0")}`
  }
  return `${rem}s`
}

function formatPointsLine(n: number): string {
  const rounded = Math.round(n * 100) / 100
  if (rounded > 0) return `+${rounded.toLocaleString()}`
  if (rounded < 0) return rounded.toLocaleString()
  return "0"
}

interface QuizResultsPanelProps {
  result: QuizResultPayload
  trackName: string
  onContinue: () => void
}

/**
 * Full “Quiz Results” screen — dark nebula, gold shield badge, stats, treasure accent (matches reference layout).
 */
export function QuizResultsPanel({ result, trackName, onContinue }: QuizResultsPanelProps) {
  const success = result.congratulations

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={springTransition}
      className="relative w-full"
    >
      {/* Local nebula behind card */}
      <div className="pointer-events-none absolute -inset-8 -z-10 overflow-hidden rounded-[40px]">
        <ChallengePlayNebulaBackdrop />
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[28px] border p-6 shadow-xl shadow-slate-300/35 backdrop-blur-xl sm:p-8 md:p-10 dark:shadow-none",
          success
            ? "border-purple-300/90 bg-white/98 shadow-purple-200/40 dark:border-purple-500/45 dark:bg-[#0a0612]/85 dark:shadow-none"
            : "border-slate-300/90 bg-slate-50/98 dark:border-slate-500/35 dark:bg-[#0c0a14]/90 dark:shadow-none"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(147,51,234,0.05)_0%,transparent_38%,transparent_62%,rgba(37,99,235,0.05)_100%)] dark:bg-[linear-gradient(180deg,rgba(147,51,234,0.08)_0%,transparent_38%,transparent_62%,rgba(37,99,235,0.09)_100%)]" />

        {/* Header */}
        <div className="relative text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-purple-700 dark:text-purple-300/80">{trackName}</p>
          <h2
            className={cn(
              "mt-2 font-sans text-3xl font-bold tracking-tight sm:text-[2.15rem]",
              success
                ? cn("drop-shadow-[0_0_28px_rgba(147,51,234,0.35)] dark:drop-shadow-none", brandLogoGradientText)
                : "bg-gradient-to-b from-slate-700 via-slate-600 to-slate-800 bg-clip-text text-transparent dark:from-slate-100 dark:via-slate-300 dark:to-slate-500"
            )}
          >
            {result.headline}
          </h2>
          <p className="mt-3 text-lg font-medium text-slate-900 dark:text-white">
            {success ? "Congratulations!" : result.score_total === 0 ? "Quiz finished" : "Keep practicing!"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-white/70">{result.summary}</p>
        </div>

        {/* Body: badge | points + stats | chest */}
        <div className="relative mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center lg:gap-6">
          {/* Shield badge */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div
                className={cn(
                  "relative flex h-[168px] w-[128px] flex-col items-center justify-center rounded-lg [clip-path:polygon(15%_0%,85%_0%,100%_12%,100%_78%,50%_100%,0%_78%,0%_12%)]",
                  success
                    ? "border-2 border-purple-400/70 bg-gradient-to-b from-purple-100 via-blue-50 to-violet-100 shadow-lg shadow-purple-300/35 dark:border-purple-400/55 dark:from-purple-500/30 dark:via-blue-900/25 dark:to-purple-950/55 dark:shadow-none"
                    : "border-2 border-slate-400/70 bg-gradient-to-b from-slate-200/90 to-slate-300/80 shadow-md shadow-slate-400/25 dark:border-slate-500/50 dark:from-slate-600/25 dark:to-slate-950/70 dark:shadow-none"
                )}
              >
                <div className="absolute inset-[3px] flex flex-col items-center justify-center bg-gradient-to-b from-amber-50/98 to-white [clip-path:polygon(15%_0%,85%_0%,100%_12%,100%_78%,50%_100%,0%_78%,0%_12%)] dark:from-[#1a0f05]/90 dark:to-[#0f0603]/95">
                  <Star
                    className={cn(
                      "h-14 w-14 drop-shadow-[0_0_20px_rgba(147,51,234,0.55)] dark:drop-shadow-none",
                      success ? "fill-purple-600 text-purple-900 dark:fill-purple-300 dark:text-purple-100" : "fill-slate-500 text-slate-700 dark:fill-slate-400 dark:text-slate-200"
                    )}
                    strokeWidth={1.2}
                  />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 z-10 w-[118%] -translate-x-1/2">
                <div
                  className={cn(
                    "mx-auto w-[95%] rounded-sm px-2 py-1 text-center text-[9px] font-black uppercase tracking-[0.2em] shadow-lg dark:shadow-none",
                    success
                      ? cn("text-white", brandLogoGradientSolid)
                      : "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 text-slate-950"
                  )}
                >
                  Quiz completed
                </div>
              </div>
            </div>
          </div>

          {/* Points + table */}
          <div className="space-y-5 text-center lg:text-left">
            <div>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums sm:text-[2rem]",
                  success ? cn("drop-shadow-[0_0_24px_rgba(147,51,234,0.3)] dark:drop-shadow-none", brandLogoGradientText) : "text-rose-700 dark:text-rose-100/95"
                )}
              >
                {formatPointsLine(result.points_from_answers)} Points
              </p>
              {result.streak_bonus > 0 ? (
                <p className="mt-1 text-lg font-semibold text-emerald-700 drop-shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:text-emerald-400 dark:drop-shadow-none">
                  +{result.streak_bonus.toLocaleString()} Streak Bonus!
                </p>
              ) : null}
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

            <ul className="space-y-0 text-sm">
              <li className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 text-slate-800 dark:border-white/10 dark:text-white/90">
                <span className="text-slate-500 dark:text-white/55">Score</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  {result.score_correct} / {result.score_total}
                </span>
              </li>
              <li className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 text-slate-800 dark:border-white/10 dark:text-white/90">
                <span className="text-slate-500 dark:text-white/55">Streak</span>
                <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">+{result.max_streak}</span>
              </li>
              <li className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 text-slate-800 dark:border-white/10 dark:text-white/90">
                <span className="text-slate-500 dark:text-white/55">Time taken</span>
                <span className="tabular-nums font-semibold text-purple-700 dark:text-purple-200/90">{formatDurationMs(result.total_time_ms)}</span>
              </li>
              <li className="flex items-center justify-between gap-4 py-3 text-slate-800 dark:text-white/90">
                <span className="inline-flex items-center gap-2 text-slate-500 dark:text-white/55">
                  <Coins className={cn("h-4 w-4", success ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-slate-400")} />
                  Total points
                </span>
                <span
                  className={cn(
                    "tabular-nums font-bold",
                    result.points_total >= 0 ? brandLogoGradientText : "text-rose-600 dark:text-rose-300"
                  )}
                >
                  {formatPointsLine(result.points_total)}
                </span>
              </li>
            </ul>
          </div>

          {/* Treasure chest illustration (CSS + icons) */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative h-[168px] w-[140px]">
              <div className="absolute inset-x-0 bottom-0 h-[52%] rounded-b-2xl border border-amber-900/50 bg-gradient-to-b from-[#3d2314] via-[#2a150c] to-[#120805] shadow-[inset_0_0_40px_rgba(251,191,36,0.12),0_12px_40px_rgba(0,0,0,0.6)] dark:shadow-none" />
              <div className="absolute inset-x-1 top-[8%] h-[38%] rounded-t-2xl border border-amber-800/40 bg-gradient-to-b from-[#5c3d22] to-[#3d2615] shadow-[inset_0_-8px_20px_rgba(0,0,0,0.45)] dark:shadow-none" />
              <div className={cn("absolute inset-x-[18%] top-[42%] h-2 rounded-full shadow-[0_0_12px_rgba(147,51,234,0.45)] dark:shadow-none", brandLogoGradientSolid)} />
              <Sparkles className="absolute left-1/2 top-[28%] h-8 w-8 -translate-x-1/2 text-purple-600 drop-shadow-[0_0_10px_rgba(147,51,234,0.35)] dark:text-purple-200/90 dark:drop-shadow-none" />
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                <Coins className="h-5 w-5 text-purple-400 drop-shadow-md dark:drop-shadow-none" />
                <Coins className="h-4 w-4 translate-y-1 text-blue-400 dark:drop-shadow-none" />
                <Coins className="h-5 w-5 text-purple-300 drop-shadow-md dark:drop-shadow-none" />
              </div>
            </div>
          </div>
        </div>

        <p className="relative mt-8 text-center text-xs text-slate-500 dark:text-white/45">
          Reward balance:{" "}
          <span className={cn("font-semibold", brandLogoGradientText)}>
            {result.reward_points_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </p>

        <div className="relative mt-8 flex justify-center px-2">
          <Button
            type="button"
            onClick={onContinue}
            className={cn(
              success
                ? cn(challengePrimaryCta, "!py-0 h-14 min-w-[min(100%,280px)] px-12")
                : "h-14 min-w-[min(100%,280px)] rounded-2xl border-2 border-slate-400 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 px-12 text-base font-bold text-slate-900 shadow-md transition hover:brightness-[0.98] dark:border-slate-500/50 dark:from-slate-800 dark:via-slate-900 dark:to-black dark:text-white dark:shadow-none dark:hover:brightness-110"
            )}
          >
            Continue
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
