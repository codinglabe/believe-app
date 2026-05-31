"use client"

import { cn } from "@/lib/utils"
import type { UnityLiveVideoOverlay } from "@/types/livestream-overlay"

/** Recorded clip overlay: logo top-right + bottom CTA banner only. */
export default function UnityLiveVideoOverlayLayer({
  overlay,
  className,
}: {
  overlay: UnityLiveVideoOverlay
  className?: string
}) {
  const accent = overlay.accentColor || "#7C3AED"
  const showBanner = overlay.bannerMessage.trim() !== "" || overlay.bannerCta.trim() !== ""

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-20 overflow-hidden", className)}>
      {overlay.logoUrl ? (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
          <img
            src={overlay.logoUrl}
            alt=""
            className="max-h-10 max-w-[120px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:max-h-12 sm:max-w-[140px]"
          />
        </div>
      ) : null}

      {showBanner ? (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4"
          style={{ backgroundColor: `${accent}EB` }}
        >
          <p className="min-w-0 truncate text-sm font-medium text-white sm:text-base">
            {overlay.bannerMessage}
          </p>
          {overlay.bannerCta ? (
            <span className="shrink-0 text-sm font-semibold text-yellow-300 sm:text-base">
              👉 {overlay.bannerCta}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
