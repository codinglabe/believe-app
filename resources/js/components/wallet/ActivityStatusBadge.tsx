import {
    AlertCircle,
    Ban,
    Check,
    Clock,
    RotateCcw,
    ShieldX,
    X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Bridge transfer / VA lifecycle statuses normalized for UI.
 *
 * @see https://apidocs.bridge.xyz/platform/orchestration/transfers/transfer-states
 * @see https://apidocs.bridge.xyz/platform/orchestration/virtual_accounts/virtual-account-events
 */
export type ActivityStatusKind =
    | 'completed'
    | 'pending'
    | 'failed'
    | 'cancelled'
    | 'rejected'
    | 'refunded'
    | 'unknown'

export function normalizeActivityStatus(status?: string | null): ActivityStatusKind {
    const value = (status ?? '').toLowerCase().trim()

    if (['completed', 'complete', 'payment_processed', 'succeeded', 'success', 'approved'].includes(value)) {
        return 'completed'
    }

    if (
        [
            'pending',
            'processing',
            'awaiting_funds',
            'funds_received',
            'funds_scheduled',
            'payment_submitted',
            'in_review',
            'incomplete',
            'under_review',
        ].includes(value)
    ) {
        return 'pending'
    }

    if (['failed', 'error', 'undeliverable', 'returned', 'return'].includes(value)) {
        return 'failed'
    }

    if (['cancelled', 'canceled'].includes(value)) {
        return 'cancelled'
    }

    if (['rejected', 'paused', 'offboarded'].includes(value)) {
        return 'rejected'
    }

    if (['refunded', 'refund'].includes(value)) {
        return 'refunded'
    }

    if (['deposit', 'direct_deposit', 'withdrawal', 'withdraw', 'card_spend', 'card_refund'].includes(value)) {
        return 'completed'
    }

    return value === '' ? 'completed' : 'unknown'
}

/** Prefer Bridge lifecycle state, then normalized UI status. */
export function resolveActivityBadgeStatus(activity: {
    status?: string | null
    bridge_state?: string | null
    bridge_transfer_state?: string | null
}): string | null | undefined {
    return activity.bridge_transfer_state ?? activity.bridge_state ?? activity.status
}

const STATUS_META: Record<
    ActivityStatusKind,
    { icon: typeof Check; pillClassName: string; dotClassName: string; label: string }
> = {
    completed: {
        icon: Check,
        pillClassName:
            'border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
        dotClassName: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        label: 'Completed',
    },
    pending: {
        icon: Clock,
        pillClassName:
            'border border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200',
        dotClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        label: 'Pending',
    },
    failed: {
        icon: X,
        pillClassName:
            'border border-red-200/80 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
        dotClassName: 'bg-red-500/15 text-red-600 dark:text-red-400',
        label: 'Failed',
    },
    cancelled: {
        icon: Ban,
        pillClassName: 'border border-border bg-muted/60 text-muted-foreground',
        dotClassName: 'bg-muted text-muted-foreground',
        label: 'Cancelled',
    },
    rejected: {
        icon: ShieldX,
        pillClassName:
            'border border-red-200/80 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
        dotClassName: 'bg-red-500/15 text-red-700 dark:text-red-400',
        label: 'Rejected',
    },
    refunded: {
        icon: RotateCcw,
        pillClassName:
            'border border-orange-200/80 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-200',
        dotClassName: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
        label: 'Refunded',
    },
    unknown: {
        icon: AlertCircle,
        pillClassName: 'border border-border bg-muted/60 text-muted-foreground',
        dotClassName: 'bg-muted text-muted-foreground',
        label: 'Unknown',
    },
}

interface ActivityStatusBadgeProps {
    status?: string | null
    stateLabel?: string | null
    className?: string
    variant?: 'pill' | 'dot'
}

export function ActivityStatusBadge({
    status,
    stateLabel,
    className,
    variant = 'pill',
}: ActivityStatusBadgeProps) {
    const kind = normalizeActivityStatus(status)
    const meta = STATUS_META[kind]
    const Icon = meta.icon
    const displayLabel = stateLabel && kind === 'pending' ? stateLabel : meta.label
    const title = displayLabel

    if (variant === 'dot') {
        return (
            <span
                className={cn(
                    'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
                    meta.dotClassName,
                    className,
                )}
                title={title}
                aria-label={title}
            >
                <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
            </span>
        )
    }

    return (
        <span
            className={cn(
                'inline-flex max-w-[9.5rem] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none',
                meta.pillClassName,
                className,
            )}
            title={title}
            aria-label={title}
        >
            <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            <span className="truncate">{displayLabel}</span>
        </span>
    )
}
