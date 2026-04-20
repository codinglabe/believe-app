"use client"

import { Link } from "@inertiajs/react"
import { Sparkles, TrendingDown } from "lucide-react"

type Variant = "marketplace_page" | "dashboard"

/**
 * Callout for Printify + organization storefront savings (typical retail vs nonprofit/at-cost price).
 */
export default function MarketplaceSavingsHighlight({
  variant = "dashboard",
  className = "",
}: {
  variant?: Variant
  className?: string
}) {
  const isPage = variant === "marketplace_page"

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-50/95 via-white to-indigo-50/90 px-4 py-3 shadow-sm dark:border-emerald-500/25 dark:from-emerald-950/40 dark:via-slate-900/80 dark:to-indigo-950/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${className}`}
      role="region"
      aria-label="Marketplace savings on Printify and organization products"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md dark:bg-emerald-500">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            {isPage ? "Savings on Printify & organization goods" : "Highlight savings in your storefront"}
          </p>
          <p className="mt-0.5 text-sm leading-snug text-slate-700 dark:text-slate-300">
            <span className="font-medium text-slate-900 dark:text-white">Printify</span> and{" "}
            <span className="font-medium text-slate-900 dark:text-white">organization-made</span> listings can show{" "}
            <span className="font-medium">typical retail</span> next to a lower <span className="font-medium">nonprofit price</span>
            {isPage ? " on each card" : " on the marketplace"}—plus a <span className="font-medium text-emerald-800 dark:text-emerald-200">Save</span> badge when
            the gap is real. Platform fee is shown separately for checkout.
          </p>
        </div>
      </div>
      {!isPage && (
        <Link
          href="/marketplace"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          <TrendingDown className="h-4 w-4" aria-hidden />
          Browse marketplace
        </Link>
      )}
    </div>
  )
}
