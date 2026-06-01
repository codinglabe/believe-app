export type UnityLiveHostType = "organization" | "supporter"

import type { UnityLiveOverlay } from "@/types/livestream-overlay"

export type UnityLiveHostProfile = {
  hostType: UnityLiveHostType
  hostId: number | null
  hostUserId: number | null
  name: string
  tagline: string | null
  avatarUrl: string | null
  profileUrl: string | null
  profileSlug: string | null
  isVerified: boolean
  isFollowing: boolean
  isOwnProfile: boolean
  canFollow: boolean
  canDonate: boolean
  donationOrganization: {
    id: number
    name: string
    description?: string | null
    mission?: string | null
    registered_organization?: {
      id: number
      name?: string | null
      user?: {
        id?: number
        slug?: string | null
        name?: string | null
        email?: string | null
        image?: string | null
      } | null
    } | null
  } | null
  followOrganization: {
    id: number
    toggle_favorite_id: number
    toggle_favorite_context: string
    is_registered: boolean
    name: string
  } | null
}

export type UnityLiveEarnSaveLinks = {
  brpCampaigns: string
  feedbackCampaigns: string
  merchantDeals: string
  marketplace: string
  donate: string
  believePoints: string
}

export interface UnityLiveStreamItem {
  id: string
  slug: string
  title: string
  description?: string | null
  organizationName: string
  hostType?: UnityLiveHostType
  hostProfile?: UnityLiveHostProfile | null
  viewUrl: string
  viewUrlMuted?: string
  viewUrlFallback?: string
  startedAt: string | null
  viewerCount?: number
  overlay?: UnityLiveOverlay | null
}

export type UnityLiveChatMessage = {
  id: string
  name: string
  message: string
  avatarUrl: string | null
  userId: number | null
  createdAt: string
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

/** Elapsed stream time as HH:MM:SS for on-player display. */
export function formatStreamElapsed(startedAt: string | null, nowMs: number = Date.now()): string | null {
  if (!startedAt) {
    return null
  }

  const start = new Date(startedAt)
  if (Number.isNaN(start.getTime())) {
    return null
  }

  const totalSecs = Math.max(0, Math.floor((nowMs - start.getTime()) / 1000))
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60

  return [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":")
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
