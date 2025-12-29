import { motion } from 'framer-motion'
import { RefreshCw, Activity, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react'
import { Activity as ActivityType } from './types'
import { formatDate, formatCurrency } from './utils'

interface ActivityListProps {
    activities: ActivityType[]
    isLoading: boolean
    hasMore: boolean
    isLoadingMore: boolean
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void
}

export function ActivityList({
    activities,
    isLoading,
    hasMore,
    isLoadingMore,
    onScroll
}: ActivityListProps) {
    if (isLoading) {
        return (
            <div className="text-center py-8">
                <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading activity...</p>
            </div>
        )
    }

    if (activities.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
        )
    }

    return (
        <div 
            className={`flex-1 p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:h-[350px] sm:max-h-[350px] sm:min-h-[350px] ${
                hasMore ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
            onScroll={hasMore ? onScroll : undefined}
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
                            className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
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
                                    <p className="text-sm font-medium break-words sm:truncate">
                                        {isTransferSent 
                                            ? `Sent to ${activity.donor_name}`
                                            : isTransferReceived
                                            ? `Received from ${activity.donor_name}`
                                            : isDeposit
                                            ? `Deposit - ${activity.donor_name}`
                                            : `Donation from ${activity.donor_name}`
                                        }
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDate(activity.date)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end sm:flex-col sm:items-end gap-2 sm:ml-3 sm:text-right">
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
    )
}

