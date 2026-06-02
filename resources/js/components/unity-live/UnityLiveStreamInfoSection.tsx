"use client"

import { useState } from "react"
import { Calendar, ChevronDown, Gift, Heart, Users } from "lucide-react"
import { UnityLiveHostProfileCard } from "@/components/unity-live/UnityLiveHostActions"
import type { UnityLiveStreamItem } from "@/lib/unity-live-display"

type Props = {
  livestream: UnityLiveStreamItem
  viewerCount: number
  chatCount?: number
}

export function UnityLiveAboutStream({ livestream }: { livestream: UnityLiveStreamItem }) {
  const [expanded, setExpanded] = useState(false)
  const description =
    livestream.description?.trim() ||
    `Welcome to ${livestream.title}. We are glad you joined us today — watch, engage, and earn rewards while you support this live broadcast.`

  const isLong = description.length > 180

  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900/60 sm:p-5">
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">About this stream</h3>
      <p className={`mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${!expanded && isLong ? "line-clamp-3 lg:line-clamp-4" : ""}`}>
        {description}
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  )
}

export function UnityLiveStreamStats({ livestream, viewerCount, chatCount = 0 }: Props) {
  const startedDate = livestream.startedAt
    ? new Date(livestream.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  const startedTime = livestream.startedAt
    ? new Date(livestream.startedAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null

  const stats = [
    { label: "Watching", value: viewerCount.toLocaleString(), icon: Users },
    { label: "In chat", value: chatCount.toLocaleString(), icon: Heart },
    { label: "BRP Earned", value: "250", icon: Gift },
    {
      label: startedDate ? `Started ${startedDate}` : "Live now",
      value: startedTime ?? "—",
      icon: Calendar,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-neutral-900/60 sm:px-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 dark:bg-purple-400/10">
              <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold tabular-nums text-neutral-900 dark:text-white sm:text-lg">
                {stat.value}
              </p>
              <p className="truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function UnityLiveStreamInfoSection({
  livestream,
  viewerCount,
  chatCount,
  onShare,
  donateOpen,
  onDonateOpenChange,
}: Props & {
  onShare?: () => void
  donateOpen?: boolean
  onDonateOpenChange?: (open: boolean) => void
}) {
  const hostProfile = livestream.hostProfile

  if (!hostProfile) {
    return null
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900/60 sm:p-5 lg:col-span-2">
          <UnityLiveHostProfileCard
            hostProfile={hostProfile}
            streamTitle={livestream.title}
            subtitle={livestream.organizationName}
            onShare={onShare}
            donateOpen={donateOpen}
            onDonateOpenChange={onDonateOpenChange}
          />
        </div>
        <div className="lg:col-span-3">
          <UnityLiveAboutStream livestream={livestream} />
        </div>
      </div>
      <UnityLiveStreamStats livestream={livestream} viewerCount={viewerCount} chatCount={chatCount} />
    </section>
  )
}
