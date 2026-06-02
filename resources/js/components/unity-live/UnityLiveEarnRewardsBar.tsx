"use client"

import { Link } from "@inertiajs/react"
import {
  Gift,
  Heart,
  ListChecks,
  MessageSquare,
  Percent,
  QrCode,
} from "lucide-react"
import { UnityLiveGridCard } from "@/components/unity-live/UnityLiveGridCard"
import type { UnityLiveEarnSaveLinks } from "@/lib/unity-live-display"
import { uliveRewardCardThemes } from "@/lib/unity-live-theme"
import type { UnityLiveOverlay } from "@/types/livestream-overlay"

type Props = {
  links: UnityLiveEarnSaveLinks
  overlay?: UnityLiveOverlay | null
  onDonate?: () => void
}

const cards = [
  {
    key: "brp",
    title: "Earn 50 BRP",
    subtitle: "Watch, click & engage!",
    cta: "Learn More",
    hrefKey: "brpCampaigns" as const,
    icon: Gift,
  },
  {
    key: "poll",
    title: "Take a Poll",
    subtitle: "Share your opinion",
    cta: "Take Poll",
    hrefKey: "feedbackCampaigns" as const,
    icon: ListChecks,
  },
  {
    key: "deals",
    title: "Exclusive Deals",
    subtitle: "Special offers for you",
    cta: "View Deals",
    hrefKey: "merchantDeals" as const,
    icon: Percent,
  },
  {
    key: "feedback",
    title: "Paid Feedback",
    subtitle: "Earn rewards for feedback",
    cta: "Give Feedback",
    hrefKey: "feedbackCampaigns" as const,
    icon: MessageSquare,
  },
  {
    key: "donate",
    title: "Donate Now",
    subtitle: "Support this mission",
    cta: "Donate",
    hrefKey: null,
    icon: Heart,
    isDonate: true,
  },
]

export function UnityLiveEarnRewardsBar({ links, overlay, onDonate }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-white sm:text-sm">
        Earn Rewards &amp; Save
      </h2>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className="-mx-1 overflow-x-auto pb-1 scrollbar-thin lg:mx-0 lg:overflow-visible">
          <div className="flex min-w-min gap-2.5 px-1 lg:grid lg:min-w-0 lg:grid-cols-5 lg:gap-2.5 lg:px-0">
            {cards.map((card, index) => {
              const Icon = card.icon
              const theme = uliveRewardCardThemes[index] ?? uliveRewardCardThemes[0]
              const inner = (
                <UnityLiveGridCard
                  theme={theme}
                  className="flex h-full min-h-[132px] w-[148px] flex-col justify-between p-3.5 sm:w-[160px] lg:min-h-[140px] lg:w-auto"
                >
                  <div className="flex flex-1 flex-col">
                    <Icon className={`mb-2 h-5 w-5 ${theme.icon}`} strokeWidth={1.75} />
                    <p className="text-sm font-bold leading-tight text-white">{card.title}</p>
                    <p className="mt-1 text-[11px] leading-snug text-neutral-400">{card.subtitle}</p>
                  </div>
                  {card.isDonate ? (
                    <button
                      type="button"
                      onClick={onDonate}
                      className={`mt-3 flex h-8 w-full items-center justify-center rounded-lg border bg-transparent text-xs font-semibold transition-colors ${theme.button}`}
                    >
                      {card.cta}
                    </button>
                  ) : (
                    <Link
                      href={links[card.hrefKey!]}
                      className={`mt-3 flex h-8 w-full items-center justify-center rounded-lg border bg-transparent text-xs font-semibold transition-colors ${theme.button}`}
                    >
                      {card.cta}
                    </Link>
                  )}
                </UnityLiveGridCard>
              )

              return (
                <div key={card.key} className="shrink-0 lg:shrink">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>

        {overlay?.qrCodeUrl ? (
          <div className="relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-purple-500/45 bg-neutral-950 p-4 xl:w-44 xl:flex-col xl:justify-center">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/15 via-purple-600/5 to-transparent"
              aria-hidden
            />
            <img
              src={overlay.qrCodeUrl}
              alt=""
              className="relative z-[1] h-20 w-20 rounded-lg border border-neutral-700 bg-white p-1"
            />
            <div className="relative z-[1] min-w-0 text-center xl:text-center">
              <div className="mb-1 flex items-center justify-center gap-1 text-white xl:justify-center">
                <QrCode className="h-4 w-4 text-neutral-400" />
              </div>
              <p className="text-xs font-semibold text-white">
                {overlay.qrLabel || "Support & Donate"}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-400">Scan QR Code</p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
