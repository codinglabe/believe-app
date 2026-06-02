/**
 * Unity Live brand tokens — matches Believe In Unity sidebar / site title gradient
 * (`from-purple-600 to-blue-600`).
 */
export const ULIVE_DEFAULT_ACCENT = "#7C3AED"
export const ULIVE_BRAND_BLUE = "#2563EB"
export const ULIVE_BRAND_VIOLET = "#7C3AED"

export const ulive = {
  /** Full-width overlay banners on the player */
  banner: "bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600",
  bannerBr: "bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600",
  bannerSoft:
    "bg-gradient-to-r from-purple-600/95 via-violet-600/95 to-blue-600/95 backdrop-blur-sm",
  /** Sponsor chip on the video */
  sponsorPanel:
    "border border-white/15 bg-gradient-to-r from-purple-950/80 via-violet-950/75 to-blue-950/80 backdrop-blur-md",
  /** CTA pill on gradient banners (sponsor bar, bottom banner) */
  ctaPill:
    "inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-purple-700 shadow-md sm:px-4 sm:py-2 sm:text-sm",
  /** Inline donation CTA next to message text */
  ctaInlineBadge:
    "ml-2 inline-flex rounded-md border border-white/25 bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm sm:text-xs",
  /** Scrolling ticker bar */
  ticker:
    "bg-gradient-to-r from-purple-950/85 via-neutral-950/75 to-blue-950/85 backdrop-blur-sm",
  /** Section surfaces (QR card, etc.) */
  surfaceSoft:
    "border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-950/30 dark:to-blue-950/20",
  /** Text accents */
  text: "text-purple-600 dark:text-purple-400",
  titleGradient:
    "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-blue-400",
} as const

/** Accent-aware banner gradient (overlay studio color → brand violet → brand blue). */
export function overlayBannerGradient(accent = ULIVE_DEFAULT_ACCENT): string {
  return `linear-gradient(135deg, ${accent} 0%, ${ULIVE_BRAND_VIOLET} 42%, ${ULIVE_BRAND_BLUE} 100%)`
}

/** Slightly transparent variant for donation banner over video. */
export function overlayBannerGradientSoft(accent = ULIVE_DEFAULT_ACCENT): string {
  return `linear-gradient(135deg, ${accent}e8 0%, ${ULIVE_BRAND_VIOLET}e8 42%, ${ULIVE_BRAND_BLUE}e8 100%)`
}

/** Earn & Save card accents — green, blue, purple, orange, teal (Unity Live watch page). */
export const uliveRewardCardThemes = [
  {
    border: "border-emerald-500/45",
    icon: "text-emerald-400",
    glow: "from-emerald-500/20 via-emerald-600/5 to-transparent",
    button: "border-emerald-500/55 text-white hover:bg-emerald-500/15",
  },
  {
    border: "border-blue-500/45",
    icon: "text-blue-400",
    glow: "from-blue-500/20 via-blue-600/5 to-transparent",
    button: "border-blue-500/55 text-white hover:bg-blue-500/15",
  },
  {
    border: "border-purple-500/45",
    icon: "text-purple-400",
    glow: "from-purple-500/20 via-purple-600/5 to-transparent",
    button: "border-purple-500/55 text-white hover:bg-purple-500/15",
  },
  {
    border: "border-amber-500/45",
    icon: "text-amber-400",
    glow: "from-amber-500/20 via-orange-500/5 to-transparent",
    button: "border-amber-500/55 text-white hover:bg-amber-500/15",
  },
  {
    border: "border-teal-500/45",
    icon: "text-teal-400",
    glow: "from-teal-500/20 via-cyan-500/5 to-transparent",
    button: "border-teal-500/55 text-white hover:bg-teal-500/15",
  },
] as const

/** @deprecated Use uliveRewardCardThemes — kept for any legacy imports */
export const uliveRewardGradients = [
  "from-emerald-600/90 to-emerald-800/90",
  "from-blue-600/90 to-blue-800/90",
  "from-purple-600/90 to-purple-800/90",
  "from-amber-600/90 to-orange-700/90",
  "from-teal-600/90 to-cyan-800/90",
] as const
