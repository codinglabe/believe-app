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

/** Full-page shell: dark base + selection tinted with brand purple. */
export const challengePageShell =
  "relative min-h-screen overflow-hidden bg-gradient-to-b from-[#050510] via-[#0a0a18] to-[#101025] text-slate-100 selection:bg-purple-500/25 selection:text-white"

export const challengePlayRootShell = "relative min-h-[100dvh] overflow-hidden bg-[#05060f] text-slate-100"

/** Large hero headings (Challenge Hub, track challenges). */
export const challengeHeroTitle = cn(
  "font-serif font-bold tracking-tight drop-shadow-[0_0_32px_rgba(147,51,234,0.35)]",
  brandLogoGradientText
)

export const challengeSectionTitle = cn("font-serif font-semibold tracking-tight", brandLogoGradientText)

/** Points / chest progress bar fill. */
export const challengePointsBarFill = cn(
  "rounded-full shadow-[0_0_16px_rgba(147,51,234,0.45),0_0_12px_rgba(37,99,235,0.35)]",
  brandLogoGradientSolid
)

/** Primary actions: Start quiz, Submit, Continue. */
export const challengePrimaryCta = cn(
  "rounded-2xl border-2 border-white/15 py-6 text-base font-bold text-white shadow-[0_12px_40px_-10px_rgba(147,51,234,0.5)] transition hover:brightness-110 hover:shadow-[0_14px_44px_-8px_rgba(37,99,235,0.45)]",
  brandLogoGradientSolid,
  "hover:from-purple-700 hover:to-blue-700"
)

export const challengePrimaryCtaSm = cn(
  "rounded-md border-2 border-purple-500/40 px-4 text-sm font-semibold text-white shadow-md transition hover:brightness-110",
  brandLogoGradientSolid,
  "hover:from-purple-700 hover:to-blue-700"
)

export const challengeFilterPillActive = cn(
  "border-purple-500/50 bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-100 shadow-[0_0_18px_rgba(147,51,234,0.3)]"
)

export const challengeFilterPillInactive =
  "border-white/10 bg-black/20 text-slate-400 hover:border-purple-500/30 hover:text-slate-200"

export const challengeCategoryRingActive = cn(
  "border-transparent bg-gradient-to-br from-purple-600/40 to-blue-700/45 text-purple-100 shadow-[0_0_20px_rgba(147,51,234,0.45)] ring-2 ring-purple-500/55"
)

export const challengeTrackCardShell =
  "rounded-2xl border border-purple-500/20 bg-white/[0.05] p-5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.75)] backdrop-blur-md"

export const challengeHudProgressFill = cn(
  "shadow-[0_0_14px_rgba(147,51,234,0.45),0_0_10px_rgba(37,99,235,0.35)]",
  brandLogoGradientSolid
)

const STARFIELD_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(1px 1px at 24px 40px, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 180px 100px, rgba(255,255,255,0.2), transparent)",
  backgroundSize: "320px 240px",
}

/** Aurora + starfield — purple and blue only (brand spectrum). */
export function ChallengeHubBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(147,51,234,0.22),transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_88%_8%,rgba(37,99,235,0.2),transparent_48%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_45%_at_12%_78%,rgba(147,51,234,0.14),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_100%,rgba(37,99,235,0.12),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.22]" style={STARFIELD_STYLE} />
    </div>
  )
}

/** Play / results nebula — dark base + purple / blue glows only. */
export function ChallengePlayNebulaBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_85%_at_50%_0%,rgba(88,28,135,0.38),transparent_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_95%_22%,rgba(37,99,235,0.28),transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_8%_50%,rgba(147,51,234,0.22),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_100%,rgba(30,58,138,0.28),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.4] mix-blend-screen [background-image:radial-gradient(1.5px_1.5px_at_12%_18%,rgba(255,255,255,0.55),transparent),radial-gradient(1px_1px_at_72%_42%,rgba(255,255,255,0.35),transparent),radial-gradient(1px_1px_at_48%_78%,rgba(196,181,253,0.25),transparent),radial-gradient(1.5px_1.5px_at_88%_12%,rgba(255,255,255,0.45),transparent)] [background-size:480px_360px]" />
    </div>
  )
}
