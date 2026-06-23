import type { Activity } from '@/components/wallet/types'
import type { WalletBridgeUpdatePayload } from '@/hooks/use-wallet-bridge-realtime'

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

    let matched = false

    const next = activities.map((activity) => {
        if (!activityMatchesPayload(activity, payload)) {
            return activity
        }

        matched = true

        return {
            ...activity,
            ...(status ? { status } : {}),
            ...(bridgeState ? { bridge_state: bridgeState } : {}),
        }
    })

    return matched ? next : activities
}
