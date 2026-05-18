/**
 * Brand gradient matches sidebar logo text (`components/site-title.tsx`):
 * `bg-gradient-to-r from-purple-600 to-blue-600`
 */
export const BRAND_GRADIENT = "bg-gradient-to-r from-purple-600 to-blue-600"

export const brandButtonClass = `${BRAND_GRADIENT} border-0 text-white shadow-lg shadow-purple-900/25 transition-[filter] hover:brightness-110 active:brightness-95`

export const brandButtonClassSm = `${BRAND_GRADIENT} border-0 text-white text-sm shadow-md shadow-purple-900/20 transition-[filter] hover:brightness-110 active:brightness-95`

/** Solid pill / tab selected state */
export const brandSolidClass = `${BRAND_GRADIENT} text-white shadow-inner`

/** Text-only gradient (eyebrow labels) */
export const brandTextGradientClass =
    "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text font-semibold text-transparent"

/** Pagination link active (on dark background) */
export const brandPaginationActiveClass = `${BRAND_GRADIENT} border border-purple-500/40 text-white hover:brightness-110`

/** Subtle org / accent chip */
export const brandChipClass = "border border-purple-500/30 bg-purple-950/45 text-purple-200/95"

/** Outline accent (secondary CTAs on dark) */
export const brandOutlineAccentClass =
    "border border-purple-500/40 bg-purple-600/15 text-purple-100 hover:bg-purple-600/30"

/** Package row selected in dialogs */
export const brandPackageSelectedClass = "border-purple-500 bg-purple-500/10 shadow-md"

export const brandPackageHoverClass = "border-white/10 hover:border-purple-500/50"
