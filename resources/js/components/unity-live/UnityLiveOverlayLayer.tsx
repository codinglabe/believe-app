"use client"

import { cn } from "@/lib/utils"
import type { UnityLiveOverlay } from "@/types/livestream-overlay"

type Props = {
  overlay: UnityLiveOverlay
  className?: string
  /** Hide live badge when the page already shows one (Unity Live header). */
  hideLiveBadge?: boolean
}

export default function UnityLiveOverlayLayer({ overlay, className, hideLiveBadge = false }: Props) {
  const accent = overlay.accentColor || "#7C3AED"
  const showDonationBanner =
    overlay.donationMessage.trim() !== "" || overlay.donationCta.trim() !== ""
  const showBottomBanner =
    overlay.bannerMessage.trim() !== "" || overlay.bannerCta.trim() !== ""
  const showSpeaker = overlay.speakerName.trim() !== ""
  const showSponsor = Boolean(overlay.sponsorImageUrl)
  const showTicker = overlay.scrollingMessage.trim() !== ""
  const showQr = Boolean(overlay.qrCodeUrl)

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

      {overlay.showLiveBadge && !hideLiveBadge ? (
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            LIVE
          </span>
        </div>
      ) : null}

      {showDonationBanner ? (
        <div
          className="absolute left-3 right-3 top-14 rounded-lg px-3 py-2 text-white shadow-lg backdrop-blur-sm sm:left-4 sm:right-auto sm:max-w-md sm:px-4 sm:py-2.5"
          style={{ backgroundColor: `${accent}E6` }}
        >
          <p className="text-xs font-medium leading-snug sm:text-sm">
            {overlay.donationMessage}
            {overlay.donationCta ? (
              <span className="ml-2 font-semibold text-yellow-300">👉 {overlay.donationCta}</span>
            ) : null}
          </p>
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
          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/70 px-3 py-2 backdrop-blur-md sm:px-4 sm:py-3">
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

      {showBottomBanner ? (
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

      {showTicker ? (
        <div className="absolute inset-x-0 bottom-16 overflow-hidden bg-black/55 py-1.5 sm:bottom-[4.5rem]">
          <div className="animate-[unity-live-ticker_18s_linear_infinite] whitespace-nowrap text-xs font-medium text-white sm:text-sm">
            {overlay.scrollingMessage}
            <span className="mx-8">{overlay.scrollingMessage}</span>
          </div>
        </div>
      ) : null}

      {showQr ? (
        <div className="absolute bottom-20 right-3 flex flex-col items-center gap-1 sm:bottom-24 sm:right-4">
          <img
            src={overlay.qrCodeUrl!}
            alt=""
            className="h-14 w-14 rounded-md bg-white p-1 shadow-lg sm:h-16 sm:w-16"
          />
          {overlay.qrLabel ? (
            <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
              {overlay.qrLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
