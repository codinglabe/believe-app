import React from "react"
import { cn } from "@/lib/utils"

/**
 * Challenge hub / play / results — gradients match the header wordmark in
 * `@/components/site-title.tsx`: `from-purple-600 to-blue-600` only (no extra hue stops).
 */

/** Same gradient as header logo text (`Believe In Unity`). */
export const brandLogoGradientText =
  "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"

export const brandLogoGradientSolid = "bg-gradient-to-r from-purple-600 to-blue-600"

/** Full-page shell: light airy base + dark cosmic variant. */
export const challengePageShell =
  "relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-violet-50/60 text-slate-900 selection:bg-purple-200/55 selection:text-purple-950 dark:from-[#050510] dark:via-[#0a0a18] dark:to-[#101025] dark:text-slate-100 dark:selection:bg-purple-500/25 dark:selection:text-white"

export const challengePlayRootShell =
  "relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-[#03030a] dark:via-[#05060f] dark:to-[#0a0a18] dark:text-slate-100"

/** Large hero headings (Challenge Hub, track challenges). */
export const challengeHeroTitle = cn(
  "font-serif font-bold tracking-tight",
  brandLogoGradientText
)

export const challengeSectionTitle = cn("font-serif font-semibold tracking-tight", brandLogoGradientText)

/** Points / chest progress bar fill. */
export const challengePointsBarFill = cn(
  "rounded-full shadow-sm shadow-purple-300/50 dark:shadow-none",
  brandLogoGradientSolid
)

/** Primary actions: Start quiz, Submit, Continue. */
export const challengePrimaryCta = cn(
  "rounded-2xl border-2 border-purple-500/25 py-6 text-base font-bold text-white shadow-md shadow-purple-500/25 transition hover:brightness-110 dark:border-white/15 dark:shadow-none",
  brandLogoGradientSolid,
  "hover:from-purple-700 hover:to-blue-700"
)

export const challengePrimaryCtaSm = cn(
  "rounded-md border-2 border-purple-500/35 px-4 text-sm font-semibold text-white shadow-md transition hover:brightness-110 dark:border-purple-500/40 dark:shadow-none",
  brandLogoGradientSolid,
  "hover:from-purple-700 hover:to-blue-700"
)

export const challengeFilterPillActive = cn(
  "border-purple-400 bg-gradient-to-r from-purple-100/90 to-blue-100/90 text-purple-900 shadow-sm shadow-purple-200/60 dark:border-purple-500/50 dark:from-purple-600/20 dark:to-blue-600/20 dark:text-purple-100 dark:shadow-none"
)

export const challengeFilterPillInactive =
  "border-slate-300/90 bg-white text-slate-600 hover:border-purple-400/70 hover:text-slate-900 dark:border-white/10 dark:bg-black/20 dark:text-slate-400 dark:hover:border-purple-500/30 dark:hover:text-slate-200"

export const challengeCategoryRingActive = cn(
  "border-transparent bg-gradient-to-br from-purple-200 to-blue-200 text-purple-900 shadow-md shadow-purple-200/60 ring-2 ring-purple-400/50 dark:from-purple-600/40 dark:to-blue-700/45 dark:text-purple-100 dark:shadow-none dark:ring-purple-500/55"
)

export const challengeTrackCardShell =
  "rounded-2xl border border-purple-200/90 bg-white/95 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-md dark:border-purple-500/20 dark:bg-white/[0.05] dark:shadow-none"

export const challengeHudProgressFill = cn(
  "shadow-sm shadow-purple-400/40 dark:shadow-none",
  brandLogoGradientSolid
)

const STARFIELD_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(1px 1px at 24px 40px, rgba(15,23,42,0.15), transparent), radial-gradient(1px 1px at 180px 100px, rgba(15,23,42,0.1), transparent)",
  backgroundSize: "320px 240px",
}

const STARFIELD_STYLE_DARK: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(1px 1px at 24px 40px, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 180px 100px, rgba(255,255,255,0.2), transparent)",
  backgroundSize: "320px 240px",
}

/** Aurora + starfield — light: soft wash; dark: purple / blue only (brand spectrum). */
export function ChallengeHubBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      {/* Light */}
      <div className="absolute inset-0 dark:hidden bg-gradient-to-b from-purple-50/90 via-white to-blue-50/70" />
      <div className="absolute inset-0 dark:hidden bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(147,51,234,0.14),transparent_52%)]" />
      <div className="absolute inset-0 dark:hidden bg-[radial-gradient(ellipse_85%_55%_at_88%_8%,rgba(37,99,235,0.1),transparent_48%)]" />
      <div className="absolute inset-0 dark:hidden opacity-[0.35]" style={STARFIELD_STYLE} />
      {/* Dark */}
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(147,51,234,0.22),transparent_52%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_85%_55%_at_88%_8%,rgba(37,99,235,0.2),transparent_48%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_65%_45%_at_12%_78%,rgba(147,51,234,0.14),transparent_50%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_55%_40%_at_50%_100%,rgba(37,99,235,0.12),transparent_55%)]" />
      <div className="absolute inset-0 hidden dark:block opacity-[0.22]" style={STARFIELD_STYLE_DARK} />
    </div>
  )
}

/** Play / results nebula — light: soft brand glow; dark: night sky. */
export function ChallengePlayNebulaBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 dark:hidden bg-gradient-to-b from-violet-50/95 via-white to-blue-50/80" />
      <div className="absolute inset-0 dark:hidden bg-[radial-gradient(ellipse_100%_85%_at_50%_0%,rgba(147,51,234,0.12),transparent_58%)]" />
      <div className="absolute inset-0 dark:hidden bg-[radial-gradient(ellipse_95%_55%_at_95%_22%,rgba(37,99,235,0.1),transparent_52%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_100%_85%_at_50%_0%,rgba(88,28,135,0.38),transparent_58%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_95%_55%_at_95%_22%,rgba(37,99,235,0.28),transparent_52%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_80%_50%_at_8%_50%,rgba(147,51,234,0.22),transparent_50%)]" />
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_100%_70%_at_50%_100%,rgba(30,58,138,0.28),transparent_60%)]" />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(1.5px_1.5px_at_12%_18%,rgba(255,255,255,0.55),transparent),radial-gradient(1px_1px_at_72%_42%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_48%_78%,rgba(196,181,253,0.25),transparent),radial-gradient(1.5px_1.5px_at_88%_12%,rgba(255,255,255,0.45),transparent)] opacity-40 mix-blend-screen [background-size:480px_360px] dark:block"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-multiply dark:hidden bg-[radial-gradient(1px_1px_at_18%_28%,rgba(15,23,42,0.12),transparent),radial-gradient(1px_1px_at_72%_42%,rgba(15,23,42,0.08),transparent)] [background-size:480px_360px]" />
    </div>
  )
}
