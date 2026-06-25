import { motion } from 'framer-motion'
import { RefreshCw, Activity, ChevronRight } from 'lucide-react'
import { Activity as ActivityType } from './types'
import { formatDate, formatCurrency, getActivityDisplayLabel, getActivityVisualMeta } from './utils'
import { ActivityStatusBadge, resolveActivityBadgeStatus } from './ActivityStatusBadge'
import { ActivityTypeIcon } from './ActivityTypeIcon'

interface ActivityListProps {
    activities: ActivityType[]
    isLoading: boolean
    hasMore: boolean
    isLoadingMore: boolean
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void
    onSeeMore?: () => void
    showSeeMore?: boolean
    onActivityClick?: (activity: ActivityType) => void
}

export function ActivityList({
    activities,
    isLoading,
    hasMore,
    isLoadingMore,
    onScroll,
    onSeeMore,
    showSeeMore = false,
    onActivityClick,
}: ActivityListProps) {
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const target = e.currentTarget
        const { scrollTop, scrollHeight, clientHeight } = target
        const isScrollingDown = e.deltaY > 0
        const isScrollingUp = e.deltaY < 0
        const isAtTop = scrollTop === 0
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

        if ((isScrollingDown && !isAtBottom) || (isScrollingUp && !isAtTop)) {
            e.stopPropagation()
        }
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 border-t border-border/60">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-foreground">Recent activity</h3>
                </div>
                {showSeeMore && onSeeMore && activities.length > 0 && (
                    <button
                        type="button"
                        onClick={onSeeMore}
                        className="flex items-center gap-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                    >
                        View all
                        <ChevronRight className="h-3 w-3" />
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                    <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">Loading activity…</p>
                </div>
            ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 mx-4 mb-4 rounded-xl border border-dashed border-border">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No transactions yet</p>
                    <p className="text-xs text-muted-foreground mt-0.5 text-center">
                        Deposits and transfers will appear here
                    </p>
                </div>
            ) : (
                <div
                    className="flex-1 px-3 pb-3 wallet-scroll-nested max-h-[320px] min-h-0 overflow-y-auto"
                    onScroll={(e) => {
                        e.stopPropagation()
                        if (hasMore) {
                            onScroll(e)
                        }
                    }}
                    onWheel={handleWheel}
                    style={{ maxHeight: '320px' }}
                >
                    <div className="space-y-1.5">
                        {activities.map((activity, index) => {
                            const label = getActivityDisplayLabel(activity)
                            const { amountClass, isOutgoing } = getActivityVisualMeta(activity)
                            const badgeStatus = resolveActivityBadgeStatus(activity)

                            return (
                                <motion.button
                                    key={activity.id}
                                    type="button"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}
                                    onClick={() => onActivityClick?.(activity)}
                                    className={`w-full flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-muted/40 transition-colors ${
                                        onActivityClick ? 'cursor-pointer' : ''
                                    }`}
                                >
                                    <ActivityTypeIcon activity={activity} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{label}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {formatDate(activity.date)}
                                            {(activity.type === 'transfer_sent' || activity.type === 'withdrawal') &&
                                            activity.recipient_type ? (
                                                <span className="capitalize"> · {activity.recipient_type}</span>
                                            ) : null}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                                        <p className={`text-sm font-semibold tabular-nums ${amountClass}`}>
                                            {isOutgoing ? '−' : '+'}${formatCurrency(activity.amount)}
                                        </p>
                                        <ActivityStatusBadge
                                            status={badgeStatus}
                                            stateLabel={activity.bridge_state_label}
                                            variant="pill"
                                        />
                                        {activity.frequency &&
                                            activity.frequency !== 'one-time' &&
                                            activity.type === 'donation' && (
                                                <p className="text-[10px] text-muted-foreground capitalize">
                                                    {activity.frequency}
                                                </p>
                                            )}
                                    </div>
                                </motion.button>
                            )
                        })}
                    </div>

                    {isLoadingMore && (
                        <div className="flex justify-center py-3">
                            <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
