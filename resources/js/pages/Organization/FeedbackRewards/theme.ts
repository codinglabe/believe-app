/**
 * Organization Feedback & Rewards — brand matches the app sidebar logo text
 * (`components/site-title.tsx`: `bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text`).
 * Use `ofb` / `ofbChartColors` instead of ad-hoc colors on these pages.
 */
export const ofb = {
  /** Main CTAs (Create, Buy, Next, …) — same gradient as sidebar “Believe In Unity” */
  btn: 'text-white bg-gradient-to-r from-purple-600 to-blue-600 shadow-sm hover:from-purple-500 hover:to-blue-500',
  /** Smaller / secondary solid actions */
  btnSm: 'text-white bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500',
  /** Outlined (wallet link, buy first, …) */
  btnOutline:
    'border border-purple-500/40 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 dark:border-purple-400/35',
  /** Tabs & filters (active pill) */
  tabActive: 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm',
  /** Primary text accent (start of brand gradient) */
  text: 'text-purple-600 dark:text-purple-400',
  /** Strong accent (end of brand gradient) */
  textStrong: 'text-blue-600 dark:text-blue-400',
  /** Ghost / link style icon buttons */
  textGhost: 'text-purple-600 hover:text-blue-600 dark:text-purple-400',
  /** Card title / hero: exact sidebar logo text treatment (on neutral background) */
  titleGradient: 'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent',
  /** Cards & chips */
  border: 'border border-purple-500/20',
  borderStrong: 'border border-purple-500/30',
  surface: 'bg-purple-500/10 border border-purple-500/30',
  surfaceSoft: 'bg-purple-500/5 border border-purple-500/20',
  /** Type / option selection */
  selected: 'border-purple-500 bg-purple-500/10',
  focus: 'focus:ring-purple-500/50',
  /** Large KPI number */
  kpi: 'text-purple-600 dark:text-purple-400',
  /** Progress & bars */
  progress: 'bg-gradient-to-r from-purple-500 to-blue-500',
  progressSolid: 'bg-purple-500',
  /**
   * Multi-step wizard: only the **current** step uses the CTA gradient (`stepActive` + `stepActiveRing`).
   * Completed / upcoming steps use muted brand or neutral styles.
   */
  stepActive:
    'text-white bg-gradient-to-r from-purple-600 to-blue-600 border-2 border-white/25 dark:border-white/20 shadow-sm',
  stepActiveRing: 'ring-2 ring-blue-400/90 ring-offset-2 ring-offset-background dark:ring-blue-500/80',
  stepDone:
    'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400 border-2 dark:bg-purple-500/20',
  stepTodo: 'bg-transparent border-muted-foreground/40 text-muted-foreground border-2',
  stepLine: 'bg-gradient-to-r from-purple-500 to-blue-500',
  stepLabelDone: 'text-purple-600 dark:text-purple-400',
} as const

/** Chart segments — purple / blue family (matches sidebar brand) */
export const ofbChartColors = ['#9333ea', '#2563eb', '#7c3aed', '#3b82f6', '#a855f7', '#0ea5e9'] as const
