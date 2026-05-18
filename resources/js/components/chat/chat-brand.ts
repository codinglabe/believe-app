/**
 * Brand gradient aligned with main app sidebar logo (see components/site-title.tsx).
 */
export const chatGradientText =
  "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"

export const chatGradientBg = "bg-gradient-to-r from-purple-600 to-blue-600"

export const chatGradientBgHover = "hover:from-purple-700 hover:to-blue-700"

/** Subtle ambient background for message areas (light + dark tuned). */
export const chatAmbientBg =
  "bg-gradient-to-b from-background via-purple-500/[0.03] to-blue-500/[0.04] dark:via-purple-500/[0.06] dark:to-blue-500/[0.07]"

/** Top accent bar for panels, sheets, and modals. */
export const chatGradientTopBar =
  "pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-purple-600 via-violet-500 to-blue-600"

/**
 * Primary CTA — use with `Button` (overrides default `bg-primary`) or plain `<button>`.
 * Important flags ensure gradient wins over shadcn variant styles.
 */
export const chatPrimaryButtonClass =
  "!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 text-white shadow-md border-transparent"

/** Bordered inset regions (scroll lists, pickers). */
export const chatInsetBorder =
  "rounded-xl border border-purple-500/15 bg-muted/20 dark:bg-muted/10"

/** Form controls — match search field focus. */
export const chatInputFocusRing =
  "focus-visible:ring-2 focus-visible:ring-purple-500/25 focus-visible:border-purple-500/40"

/** Tab / segmented control track (inactive surface). */
export const chatSegmentTrack = "rounded-xl border border-border/50 bg-muted/40 p-1"
