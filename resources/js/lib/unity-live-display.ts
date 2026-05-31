export type UnityLiveHostType = "organization" | "supporter"

import type { UnityLiveOverlay } from "@/types/livestream-overlay"

export interface UnityLiveStreamItem {
  id: string
  slug: string
  title: string
  organizationName: string
  hostType?: UnityLiveHostType
  viewUrl: string
  viewUrlMuted?: string
  viewUrlFallback?: string
  startedAt: string | null
  overlay?: UnityLiveOverlay | null
}

export function formatLiveSince(startedAt: string | null, nowMs: number = Date.now()): string | null {
  if (!startedAt) {
    return null
  }

  const start = new Date(startedAt)
  if (Number.isNaN(start.getTime())) {
    return null
  }

  const totalMins = Math.max(0, Math.floor((nowMs - start.getTime()) / 60_000))
  if (totalMins < 1) {
    return "Just started"
  }
  if (totalMins < 60) {
    return `Live for ${totalMins} min`
  }

  const hrs = Math.floor(totalMins / 60)
  const remMins = totalMins % 60

  if (hrs < 24) {
    return remMins > 0 ? `Live for ${hrs}h ${remMins}m` : `Live for ${hrs}h`
  }

  const days = Math.floor(hrs / 24)
  const remHrs = hrs % 24
  if (remHrs > 0) {
    return `Live for ${days}d ${remHrs}h`
  }

  return `Live for ${days}d`
}

export function formatScheduledAt(iso: string | null | undefined): string | null {
  if (!iso) {
    return null
  }

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function hostTypeLabel(hostType?: UnityLiveHostType): string {
  return hostType === "organization" ? "Organization" : "Host"
}
