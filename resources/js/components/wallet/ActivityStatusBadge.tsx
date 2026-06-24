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

/** Prefer normalized UI status; fall back to Bridge lifecycle state. */
export function resolveActivityBadgeStatus(activity: {
    status?: string | null
    bridge_state?: string | null
}): string | null | undefined {
    return activity.status ?? activity.bridge_state
}

const STATUS_META: Record<
    ActivityStatusKind,
    { icon: typeof Check; className: string; label: string }
> = {
    completed: {
        icon: Check,
        className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        label: 'Completed',
    },
    pending: {
        icon: Clock,
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        label: 'Pending',
    },
    failed: {
        icon: X,
        className: 'bg-red-500/15 text-red-600 dark:text-red-400',
        label: 'Failed',
    },
    cancelled: {
        icon: Ban,
        className: 'bg-muted text-muted-foreground',
        label: 'Cancelled',
    },
    rejected: {
        icon: ShieldX,
        className: 'bg-red-500/15 text-red-700 dark:text-red-400',
        label: 'Rejected',
    },
    refunded: {
        icon: RotateCcw,
        className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
        label: 'Refunded',
    },
    unknown: {
        icon: AlertCircle,
        className: 'bg-muted text-muted-foreground',
        label: 'Unknown',
    },
}

interface ActivityStatusBadgeProps {
    status?: string | null
    className?: string
}

/** Small circle status icon for compact activity rows (wallet card only). */
export function ActivityStatusBadge({ status, className }: ActivityStatusBadgeProps) {
    const kind = normalizeActivityStatus(status)
    const meta = STATUS_META[kind]
    const Icon = meta.icon

    return (
        <span
            className={cn(
                'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
                meta.className,
                className,
            )}
            title={meta.label}
            aria-label={meta.label}
        >
            <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
        </span>
    )
}
