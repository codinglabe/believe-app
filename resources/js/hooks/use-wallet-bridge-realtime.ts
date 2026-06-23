import { useEffect } from 'react'
import echo from '@/lib/echo'

export type WalletBridgeUpdatePayload = {
    kind?: string
    event?: string
    transfer_id?: string
    activity_id?: string
    bridge_state?: string
    status?: string
    amount?: number
    direction?: 'incoming' | 'outgoing'
    refresh_balance?: boolean
    refresh_activity?: boolean
    at?: string
}

/**
 * Listen for Bridge wallet updates via Reverb (transfer state, deposits, balance).
 */
export function useWalletBridgeRealtime(options: {
    userId?: number | null
    enabled?: boolean
    onUpdate: (payload: WalletBridgeUpdatePayload) => void
}) {
    const { userId, enabled = true, onUpdate } = options

    useEffect(() => {
        if (!enabled || !userId) {
            return
        }

        const instance = echo()
        const channel = instance.private(`user.${userId}`)

        const handler = (payload: WalletBridgeUpdatePayload) => {
            onUpdate(payload)
        }

        channel.listen('.wallet.bridge.updated', handler)

        return () => {
            channel.stopListening('.wallet.bridge.updated', handler)
            instance.leave(`user.${userId}`)
        }
    }, [enabled, userId, onUpdate])
}
