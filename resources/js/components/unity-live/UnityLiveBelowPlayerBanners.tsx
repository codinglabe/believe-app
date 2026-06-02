"use client"

import { useState } from "react"
import { Megaphone, X } from "lucide-react"
import { UnityLiveGridCard, UnityLiveGridCardButton } from "@/components/unity-live/UnityLiveGridCard"
import { uliveRewardCardThemes } from "@/lib/unity-live-theme"
import type { UnityLiveOverlay } from "@/types/livestream-overlay"

const purpleTheme = uliveRewardCardThemes[2]
const violetTheme = {
  border: "border-violet-500/45",
  icon: "text-violet-400",
  glow: "from-violet-500/20 via-purple-600/5 to-transparent",
  button: "border-violet-500/55 text-white hover:bg-violet-500/15",
}

type OverlaySlice = Pick<
  UnityLiveOverlay,
  | "sponsorImageUrl"
  | "sponsorLabel"
  | "bannerMessage"
  | "bannerCta"
  | "donationMessage"
  | "donationCta"
>

type Props = {
  overlay?: OverlaySlice | null
  onCtaClick?: () => void
}

export function UnityLiveSponsorBanner({ overlay }: Pick<Props, "overlay">) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !overlay?.sponsorImageUrl) {
    return null
  }

  return (
    <UnityLiveGridCard theme={purpleTheme} className="p-4 sm:p-5">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 z-10 rounded-full p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Dismiss sponsor"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <img
          src={overlay.sponsorImageUrl}
          alt=""
          className="h-12 w-auto max-w-[140px] shrink-0 object-contain sm:h-14"
        />
        <div className="min-w-0 flex-1 pr-8 sm:pr-0">
          <p className={`text-[10px] font-bold uppercase tracking-wider sm:text-xs ${purpleTheme.icon}`}>
            {overlay.sponsorLabel?.trim() || "Today's Major Sponsor"}
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Sponsored content — thank you for supporting this stream.
          </p>
        </div>
      </div>
    </UnityLiveGridCard>
  )
}

export function UnityLiveDonationBanner({ overlay, onCtaClick }: Props) {
  const hasMessage = Boolean(overlay?.donationMessage?.trim())
  const hasCta = Boolean(overlay?.donationCta?.trim())

  if (!hasMessage && !hasCta) {
    return null
  }

  return (
    <UnityLiveGridCard theme={violetTheme} className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {hasMessage ? (
            <p className="text-sm font-bold text-white sm:text-base">{overlay!.donationMessage}</p>
          ) : null}
          {hasMessage && hasCta ? (
            <p className="mt-1 text-xs text-neutral-400">Support this mission today.</p>
          ) : null}
        </div>
        {hasCta ? (
          <UnityLiveGridCardButton theme={violetTheme} onClick={onCtaClick}>
            {overlay!.donationCta}
          </UnityLiveGridCardButton>
        ) : null}
      </div>
    </UnityLiveGridCard>
  )
}

export function UnityLiveCtaBanner({ overlay, onCtaClick }: Props) {
  const hasMessage = Boolean(overlay?.bannerMessage?.trim())
  const hasCta = Boolean(overlay?.bannerCta?.trim())

  if (!hasMessage && !hasCta) {
    return null
  }

  return (
    <UnityLiveGridCard theme={purpleTheme} className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Megaphone className={`mt-0.5 h-5 w-5 shrink-0 ${purpleTheme.icon}`} strokeWidth={1.75} />
          <div className="min-w-0">
            {hasMessage ? (
              <p className="text-sm font-bold text-white sm:text-lg">{overlay!.bannerMessage}</p>
            ) : null}
            {hasMessage && hasCta ? (
              <p className="mt-1 text-xs text-neutral-400">Tap below to take action.</p>
            ) : null}
          </div>
        </div>
        {hasCta ? (
          <UnityLiveGridCardButton theme={purpleTheme} onClick={onCtaClick} className="w-full sm:w-auto">
            {overlay!.bannerCta}
          </UnityLiveGridCardButton>
        ) : null}
      </div>
    </UnityLiveGridCard>
  )
}
