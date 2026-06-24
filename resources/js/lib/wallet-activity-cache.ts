import type { Activity } from '@/components/wallet/types'

type RecentActivityCache = {
    activities: Activity[]
    hasMore: boolean
    loaded: boolean
}

type AllActivityCache = {
    activities: Activity[]
    hasMore: boolean
    currentPage: number
    loaded: boolean
}

const recentCache: RecentActivityCache = {
    activities: [],
    hasMore: false,
    loaded: false,
}

const allCache: AllActivityCache = {
    activities: [],
    hasMore: false,
    currentPage: 1,
    loaded: false,
}

export function getRecentWalletActivityCache(): RecentActivityCache {
    return recentCache
}

export function setRecentWalletActivityCache(
    activities: Activity[],
    hasMore: boolean,
): void {
    recentCache.activities = activities
    recentCache.hasMore = hasMore
    recentCache.loaded = true
}

export function patchRecentWalletActivityCache(
    patch: (activities: Activity[]) => Activity[],
): void {
    if (!recentCache.loaded) {
        return
    }

    recentCache.activities = patch(recentCache.activities)
}

export function clearRecentWalletActivityCache(): void {
    recentCache.activities = []
    recentCache.hasMore = false
    recentCache.loaded = false
}

export function getAllWalletActivityCache(): AllActivityCache {
    return allCache
}

export function setAllWalletActivityCache(
    activities: Activity[],
    hasMore: boolean,
    currentPage: number,
): void {
    allCache.activities = activities
    allCache.hasMore = hasMore
    allCache.currentPage = currentPage
    allCache.loaded = true
}

export function appendAllWalletActivityCache(activities: Activity[]): void {
    if (!allCache.loaded) {
        return
    }

    allCache.activities = [...allCache.activities, ...activities]
}

export function patchAllWalletActivityCache(
    patch: (activities: Activity[]) => Activity[],
): void {
    if (!allCache.loaded) {
        return
    }

    allCache.activities = patch(allCache.activities)
}

export function clearAllWalletActivityCache(): void {
    allCache.activities = []
    allCache.hasMore = false
    allCache.currentPage = 1
    allCache.loaded = false
}
