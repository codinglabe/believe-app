/**
 * Challenge Hub pages — header wordmark gradient (purple → blue), with light + dark surfaces.
 * @see components/site-title.tsx
 */
export const levelUpApp = {
  cta: "bg-gradient-to-r from-purple-600 to-blue-600 font-semibold text-white shadow-md shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500 dark:shadow-[0_8px_24px_-6px_rgba(147,51,234,0.4)]",
  ctaLg:
    "bg-gradient-to-r from-purple-600 to-blue-600 py-7 text-base font-semibold text-white shadow-md shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500 dark:shadow-[0_12px_32px_-8px_rgba(37,99,235,0.35)]",
  titleGradient:
    "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text font-bold text-transparent dark:drop-shadow-[0_0_32px_rgba(147,51,234,0.25)]",
  trackGradient:
    "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-xs font-medium uppercase tracking-[0.25em] text-transparent",
  pointsGradient:
    "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text font-semibold text-transparent dark:from-purple-500 dark:to-blue-500",
  cardSurface:
    "border border-purple-200/90 bg-white/95 text-slate-900 shadow-md backdrop-blur-xl dark:border-purple-500/20 dark:bg-slate-950/50 dark:text-slate-100 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(147,51,234,0.1)]",
  cardRingActive:
    "ring-1 ring-purple-400/50 ring-offset-2 ring-offset-white dark:ring-blue-500/35 dark:ring-offset-slate-950",
  panelSurface:
    "rounded-2xl border border-purple-200/90 bg-white/95 text-slate-900 shadow-lg backdrop-blur-xl dark:border-purple-500/20 dark:bg-slate-950/55 dark:text-slate-100 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(37,99,235,0.12)]",
  pill: "border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 text-slate-800 dark:border-purple-500/35 dark:from-purple-500/15 dark:to-blue-600/12 dark:text-slate-100",
  pillGlowKeyframes: [
    "0 0 16px -4px rgba(147,51,234,0.2)",
    "0 0 26px -2px rgba(37,99,235,0.28)",
    "0 0 16px -4px rgba(147,51,234,0.2)",
  ] as const,
  scoreChip:
    "inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-gradient-to-r from-purple-50/95 to-blue-50/90 px-3 py-1.5 font-medium text-slate-800 shadow-sm dark:border-purple-500/30 dark:from-purple-500/12 dark:to-blue-600/12 dark:text-slate-100 dark:shadow-[0_0_20px_-6px_rgba(147,51,234,0.35)]",
  outlineButton:
    "border-purple-300 bg-white text-slate-900 hover:bg-purple-50 dark:border-purple-400/40 dark:bg-purple-500/5 dark:text-slate-100 dark:hover:bg-purple-500/10",
  ghostLink: "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/5",
  /** Muted body copy on Challenge Hub pages */
  bodyMuted: "text-slate-600 dark:text-slate-400",
  cardTitle: "text-slate-900 dark:text-slate-50",
  cardDescription: "text-slate-600 dark:text-slate-500",
} as const
