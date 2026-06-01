"use client"

import { cn } from "@/lib/utils"
import { overlayBannerGradient, ulive } from "@/lib/unity-live-theme"
import type { UnityLiveVideoOverlay } from "@/types/livestream-overlay"

/** Recorded clip overlay: logo, speaker, sponsor, bottom CTA banner. */
export default function UnityLiveVideoOverlayLayer({
  overlay,
  className,
}: {
  overlay: UnityLiveVideoOverlay
  className?: string
}) {
  const accent = overlay.accentColor || "#7C3AED"
  const showBanner = overlay.bannerMessage.trim() !== "" || overlay.bannerCta.trim() !== ""
  const showSpeaker = overlay.speakerName.trim() !== ""
  const showSponsor = Boolean(overlay.sponsorImageUrl)

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

      {showSpeaker ? (
        <div className="absolute bottom-24 left-3 sm:bottom-28 sm:left-4">
          <span className="inline-flex max-w-[min(100%,16rem)] items-center rounded-lg bg-black/60 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm sm:max-w-xs sm:text-base">
            {overlay.speakerName}
          </span>
        </div>
      ) : null}

      {showSponsor ? (
        <div className="absolute bottom-24 left-3 right-3 sm:bottom-28 sm:left-4 sm:right-4">
          <div className={cn("flex items-center justify-center gap-3 rounded-xl px-3 py-2 sm:px-4 sm:py-3", ulive.sponsorPanel)}>
            {overlay.sponsorLabel ? (
              <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide text-white/70 sm:inline sm:text-xs">
                {overlay.sponsorLabel}
              </span>
            ) : null}
            <img
              src={overlay.sponsorImageUrl!}
              alt=""
              className="max-h-10 w-auto max-w-full object-contain sm:max-h-12"
            />
          </div>
        </div>
      ) : null}

      {showBanner ? (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4"
          style={{ background: overlayBannerGradient(accent) }}
        >
          <p className="min-w-0 truncate text-sm font-medium text-white sm:text-base">
            {overlay.bannerMessage}
          </p>
          {overlay.bannerCta ? (
            <span className={ulive.ctaPill}>{overlay.bannerCta}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
