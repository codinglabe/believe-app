import { useEffect } from 'react'
import echo from '@/lib/echo'

export type WalletBridgeUpdatePayload = {
    kind?: string
    event?: string
    transfer_id?: string
    activity_id?: string
    deposit_id?: string
    activity_type?: string
    bridge_state?: string
    status?: string
    amount?: number
    direction?: 'incoming' | 'outgoing'
    refresh_balance?: boolean
    refresh_activity?: boolean
    at?: string
}

export const WALLET_BRIDGE_UPDATE_EVENT = 'believe:wallet-bridge-update'

let subscribedUserId: number | null = null

function ensureWalletBridgeEchoSubscription(userId: number): void {
    if (subscribedUserId === userId) {
        return
    }

    subscribedUserId = userId

    const instance = echo()
    const channel = instance.private(`user.${userId}`)

    channel.listen('.wallet.bridge.updated', (payload: WalletBridgeUpdatePayload) => {
        window.dispatchEvent(
            new CustomEvent<WalletBridgeUpdatePayload>(WALLET_BRIDGE_UPDATE_EVENT, { detail: payload }),
        )
    })

    channel.error((error: unknown) => {
        if (import.meta.env.DEV) {
            console.error('[Wallet] Reverb user channel failed:', error)
        }
    })
}

/**
 * Subscribe to Believe wallet updates via Reverb (transfer/deposit state, balance).
 * Uses one Echo channel per user; dispatches a window event all wallet UIs can share.
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

        ensureWalletBridgeEchoSubscription(userId)

        const handler = (event: Event) => {
            const detail = (event as CustomEvent<WalletBridgeUpdatePayload>).detail
            if (detail) {
                onUpdate(detail)
            }
        }

        window.addEventListener(WALLET_BRIDGE_UPDATE_EVENT, handler)

        return () => {
            window.removeEventListener(WALLET_BRIDGE_UPDATE_EVENT, handler)
        }
    }, [enabled, userId, onUpdate])
}
