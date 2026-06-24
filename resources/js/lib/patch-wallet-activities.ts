import type { Activity } from '@/components/wallet/types'
import type { WalletBridgeUpdatePayload } from '@/hooks/use-wallet-bridge-realtime'
import { normalizeActivityStatus } from '@/components/wallet/ActivityStatusBadge'

const PENDING_BRIDGE_STATES = new Set([
    'pending',
    'processing',
    'awaiting_funds',
    'funds_received',
    'funds_scheduled',
    'payment_submitted',
    'in_review',
    'incomplete',
    'under_review',
])

function formatTransferStateLabel(state: string): string {
    return state
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function buildTransferMessage(
    activity: Activity,
    payload: WalletBridgeUpdatePayload,
    uiStatus: string,
): string | undefined {
    const counterparty = payload.counterparty_name?.trim() || activity.donor_name
    const isOutgoing = activity.type === 'transfer_sent' || payload.direction === 'outgoing'
    const isIncoming = activity.type === 'transfer_received' || payload.direction === 'incoming'
    const bridgeTransferState = payload.bridge_transfer_state?.trim() ?? ''
    const pendingSuffix =
        uiStatus === 'pending' && bridgeTransferState !== '' && !PENDING_BRIDGE_STATES.has(bridgeTransferState)
            ? ` (${formatTransferStateLabel(bridgeTransferState)})`
            : uiStatus === 'pending'
              ? ' (processing)'
              : ''

    if (isOutgoing) {
        return `Sent to ${counterparty}${pendingSuffix}`
    }

    if (isIncoming) {
        return `Received from ${counterparty}${pendingSuffix}`
    }

    return activity.message
}

function activityMatchesPayload(activity: Activity, payload: WalletBridgeUpdatePayload): boolean {
    const transferId = payload.transfer_id?.trim()
    const activityId = payload.activity_id?.trim()
    const depositId = payload.deposit_id?.trim()

    if (transferId) {
        const id = String(activity.id)
        if (
            activity.transaction_id === transferId
            || id === `bridge_transfer_${transferId}`
            || activity.bridge_transfer_id === transferId
        ) {
            return true
        }
    }

    if (depositId) {
        const id = String(activity.id)
        if (id === `bridge_va_${depositId}` || activity.deposit_id === depositId) {
            return true
        }
    }

    if (activityId) {
        const id = String(activity.id)
        if (
            activity.transaction_id === activityId
            || activity.virtual_account_event_id === activityId
            || id === `bridge_wallet_${activityId}`
            || id.endsWith(activityId)
            || id.includes(activityId)
        ) {
            return true
        }
    }

    return false
}

/** Apply webhook/Reverb status onto matching activity rows immediately. */
export function patchActivitiesFromBridgeUpdate(
    activities: Activity[],
    payload: WalletBridgeUpdatePayload,
): Activity[] {
    const status = payload.status
    const bridgeState = payload.bridge_state

    if (!status && !bridgeState) {
        return activities
    }

    const normalizedStatus = status ?? bridgeState ?? ''
    const badgeStatus = normalizeActivityStatus(normalizedStatus)

    let matched = false

    const next = activities.map((activity) => {
        if (!activityMatchesPayload(activity, payload)) {
            return activity
        }

        matched = true

        const uiStatus =
            badgeStatus === 'unknown' && normalizedStatus !== ''
                ? normalizedStatus
                : badgeStatus

        const message = buildTransferMessage(activity, payload, uiStatus)

        return {
            ...activity,
            status: uiStatus,
            bridge_state: uiStatus,
            ...(payload.transfer_id ? { bridge_transfer_id: payload.transfer_id } : {}),
            ...(message ? { message } : {}),
        }
    })

    return matched ? next : activities
}

export function prependPendingTransferActivity(
    activities: Activity[],
    transferId: string,
    amount: number,
    counterpartyName: string,
    recipientType?: string | null,
): Activity[] {
    const normalizedId = transferId.trim()
    if (normalizedId === '') {
        return activities
    }

    const existing = activities.some(
        (activity) =>
            activity.bridge_transfer_id === normalizedId
            || activity.transaction_id === normalizedId
            || String(activity.id) === `bridge_transfer_${normalizedId}`,
    )

    if (existing) {
        return activities
    }

    const now = new Date().toISOString()

    return [
        {
            id: `bridge_transfer_${normalizedId}`,
            type: 'transfer_sent',
            amount,
            date: now,
            status: 'pending',
            bridge_state: 'pending',
            donor_name: counterpartyName,
            frequency: 'one-time',
            message: `Sent to ${counterpartyName} (processing)`,
            transaction_id: normalizedId,
            bridge_transfer_id: normalizedId,
            is_outgoing: true,
            recipient_type: recipientType ?? undefined,
        },
        ...activities,
    ]
}
