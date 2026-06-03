/**
 * Believe In Unity consumer landing — purple → blue brand (see site-title.tsx).
 * All sections use these tokens for light + dark mode.
 */
export const landingTheme = {
  /** Headline accent: purple-600 → blue-600 */
  gradientText:
    "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400",

  gradientTextHero:
    "bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-violet-300 dark:to-blue-400",

  gradientBg: "bg-gradient-to-r from-purple-600 to-blue-600",
  gradientBgHover: "hover:from-purple-500 hover:to-blue-500",

  gradientBgSoft:
    "bg-gradient-to-br from-purple-600/10 to-blue-600/10 dark:from-purple-600/20 dark:to-blue-600/15",

  eyebrow:
    "inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-700 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300",

  iconRing:
    "rounded-full border border-purple-200 bg-white shadow-sm ring-4 ring-purple-50 dark:border-purple-800/50 dark:bg-slate-950 dark:ring-purple-950/50",

  iconColor: "text-purple-600 dark:text-purple-400",

  card:
    "rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-950",

  cardHover:
    "transition duration-300 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:border-purple-800/60",

  bodyText: "text-slate-600 dark:text-slate-300",
  heading: "text-slate-900 dark:text-white",

  link: "font-semibold text-purple-700 transition hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300",

  glowPurple:
    "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(147,51,234,0.18),transparent)]",

  glowPurpleBottom:
    "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(147,51,234,0.08),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(147,51,234,0.14),transparent)]",

  glowBlueCorner:
    "pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(59,130,246,0.12),transparent)]",

  /** Hero + footer CTA band */
  bandLight:
    "bg-gradient-to-br from-purple-50 via-white to-blue-50 text-slate-900",
  bandDark:
    "dark:from-[#0a0514] dark:via-[#12082a] dark:to-[#1a0d35] dark:text-white",

  bandOverlayLight:
    "pointer-events-none absolute inset-0 bg-gradient-to-r from-white/40 via-purple-50/30 to-blue-50/40 dark:from-[#0a0514]/95 dark:via-[#150828]/90 dark:to-[#1a0d35]/85",

  dotGrid:
    "pointer-events-none absolute inset-0 opacity-[0.35] bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.15)_1px,transparent_1px)] bg-[length:24px_24px] dark:opacity-[0.12] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_1px,transparent_1px)]",

  sectionWhite: "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950",
  sectionMuted: "border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40",

  ctaBand:
    "bg-gradient-to-br from-purple-100 via-violet-50 to-blue-100 text-slate-900 dark:from-[#0a0514] dark:via-[#12082a] dark:to-[#1a0d35] dark:text-white",

  primaryBtn:
    "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:from-purple-500 hover:to-blue-500 dark:shadow-purple-900/40",

  outlineBtn:
    "inline-flex items-center justify-center gap-2 rounded-full border-2 border-purple-600 bg-white/80 px-8 py-3.5 text-base font-semibold text-purple-700 transition hover:border-purple-700 hover:bg-purple-50 dark:border-white/60 dark:bg-transparent dark:text-white dark:hover:border-white dark:hover:bg-white/10",
} as const
