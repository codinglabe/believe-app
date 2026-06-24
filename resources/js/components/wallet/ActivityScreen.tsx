import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Activity, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'
import { Activity as ActivityType } from './types'
import { formatDate, formatCurrency, getActivityDisplayLabel } from './utils'
import { DepositPaymentMethodBadge } from './DepositPaymentMethodBadge'
import { ActivityStatusBadge, resolveActivityBadgeStatus } from './ActivityStatusBadge'
import { getCsrfToken as getWalletCsrfToken } from './utils'
import { useWalletBridgeRealtime } from '@/hooks/use-wallet-bridge-realtime'
import { patchActivitiesFromBridgeUpdate } from '@/lib/patch-wallet-activities'
import {
    getAllWalletActivityCache,
    patchAllWalletActivityCache,
    setAllWalletActivityCache,
} from '@/lib/wallet-activity-cache'
import type { WalletBridgeUpdatePayload } from '@/hooks/use-wallet-bridge-realtime'

interface ActivityScreenProps {
    onBack: () => void
    onActivityClick?: (activity: ActivityType) => void
    userId?: number | null
}

export function ActivityScreen({ onBack, onActivityClick, userId }: ActivityScreenProps) {
    const cached = getAllWalletActivityCache()
    const [activities, setActivities] = useState<ActivityType[]>(cached.loaded ? cached.activities : [])
    const [isLoading, setIsLoading] = useState(!cached.loaded)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(cached.loaded ? cached.hasMore : false)
    const [currentPage, setCurrentPage] = useState(cached.loaded ? cached.currentPage : 1)

    const fetchActivities = async (page: number = 1, append: boolean = false) => {
        if (append) {
            setIsLoadingMore(true)
        } else if (!getAllWalletActivityCache().loaded) {
            setIsLoading(true)
        }

        try {
            const response = await fetch(`/wallet/activity/all?page=${page}&per_page=20&t=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': getWalletCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    const nextActivities = data.activities || []
                    if (append) {
                        setActivities((prev) => {
                            const merged = [...prev, ...nextActivities]
                            const cache = getAllWalletActivityCache()
                            cache.activities = merged
                            cache.hasMore = data.has_more || false
                            cache.currentPage = page
                            cache.loaded = true

                            return merged
                        })
                    } else {
                        setActivities(nextActivities)
                        setAllWalletActivityCache(nextActivities, data.has_more || false, page)
                    }
                    setHasMore(data.has_more || false)
                    setCurrentPage(page)
                }
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error)
        } finally {
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleBridgeRealtimeUpdate = useCallback((payload: WalletBridgeUpdatePayload) => {
        if (payload.refresh_activity === false) {
            return
        }

        setActivities((prev) => {
            const next = patchActivitiesFromBridgeUpdate(prev, payload)
            patchAllWalletActivityCache(() => next)

            return next
        })
    }, [])

    useWalletBridgeRealtime({
        userId: userId ?? null,
        enabled: Boolean(userId),
        onUpdate: handleBridgeRealtimeUpdate,
    })

    useEffect(() => {
        if (getAllWalletActivityCache().loaded) {
            return
        }

        void fetchActivities(1, false)
    }, [])

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget
        const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight

        if (scrollBottom < 50 && hasMore && !isLoadingMore && !isLoading) {
            const nextPage = currentPage + 1
            void fetchActivities(nextPage, true)
        }
    }

    if (isLoading && activities.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4"
            >
                <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading activity...</p>
                </div>
            </motion.div>
        )
    }

    if (activities.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4"
            >
                <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Activity</h2>
                <button
                    onClick={onBack}
                    className="text-sm text-muted-foreground hover:text-foreground"
                >
                    Back
                </button>
            </div>

            <div
                className={`flex-1 wallet-scroll-nested ${
                    hasMore ? 'overflow-y-auto' : 'overflow-hidden'
                }`}
                onScroll={hasMore ? handleScroll : undefined}
                style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
                <div className="space-y-2">
                    {activities.map((activity) => {
                        const isTransferSent = activity.type === 'transfer_sent'
                        const isTransferReceived = activity.type === 'transfer_received'
                        const isDonation = activity.type === 'donation'
                        const isDeposit = activity.type === 'deposit'
                        
                        return (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => onActivityClick?.(activity)}
                                className={`relative w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors ${
                                    onActivityClick ? 'cursor-pointer' : ''
                                }`}
                            >
                                <ActivityStatusBadge
                                    status={resolveActivityBadgeStatus(activity)}
                                    className="absolute top-2 right-2"
                                />
                                <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                                        isTransferSent 
                                            ? 'bg-red-500/10' 
                                            : isTransferReceived 
                                            ? 'bg-blue-500/10'
                                            : isDeposit
                                            ? 'bg-emerald-500/10'
                                            : 'bg-green-500/10'
                                    }`}>
                                        {isTransferSent ? (
                                            <ArrowUpRight className="h-4 w-4 text-red-500" />
                                        ) : isTransferReceived ? (
                                            <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                                        ) : isDeposit ? (
                                            <Plus className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="text-sm font-medium break-words sm:truncate">
                                                {getActivityDisplayLabel(activity)}
                                            </p>
                                            {isDeposit && activity.payment_method_label && (
                                                <DepositPaymentMethodBadge label={activity.payment_method_label} />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDate(activity.date)}
                                            {isDeposit && activity.payment_method_label && (
                                                <span className="sm:hidden"> · {activity.payment_method_label}</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end sm:flex-col sm:items-end gap-2 sm:ml-3 sm:text-right pr-6 sm:pr-0">
                                    <p className={`text-base sm:text-sm font-semibold ${
                                        isTransferSent 
                                            ? 'text-red-600'
                                            : isTransferReceived || isDeposit
                                            ? 'text-green-600'
                                            : 'text-green-600'
                                    }`}>
                                        {isTransferSent ? '-' : '+'}${formatCurrency(activity.amount)}
                                    </p>
                                    <div className="flex flex-col items-end sm:items-end gap-1">
                                        {isDonation && activity.frequency !== 'one-time' && (
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {activity.frequency}
                                            </p>
                                        )}
                                        {isTransferSent && activity.recipient_type && (
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {activity.recipient_type}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </div>
                
                {isLoadingMore && (
                    <div className="text-center py-4">
                        <RefreshCw className="h-5 w-5 text-muted-foreground mx-auto animate-spin" />
                    </div>
                )}
            </div>
        </motion.div>
    )
}
