/** Minimum time between /wallet/balance calls (shared across all UI pollers). */
export const WALLET_BALANCE_POLL_MS = 60_000

export type WalletBalanceResponse = {
    success?: boolean
    balance?: number
    local_balance?: number
    organization_balance?: number
    has_subscription?: boolean
}

let lastFetchAt = 0
let inFlight: Promise<WalletBalanceResponse | null> | null = null
let lastResult: WalletBalanceResponse | null = null

/**
 * Fetch wallet balance with global debouncing so navbar, sidebar, and popups
 * do not hammer the server when many tabs or components are mounted.
 */
export async function fetchWalletBalance(options?: {
    force?: boolean
    skipWhenHidden?: boolean
}): Promise<WalletBalanceResponse | null> {
    const force = options?.force ?? false
    const skipWhenHidden = options?.skipWhenHidden ?? true

    if (
        skipWhenHidden &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
    ) {
        return lastResult
    }

    const now = Date.now()
    if (!force && now - lastFetchAt < WALLET_BALANCE_POLL_MS) {
        return lastResult
    }

    if (inFlight) {
        return inFlight
    }

    inFlight = (async () => {
        try {
            const balanceResponse = await fetch(`/wallet/balance?t=${now}`, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                        '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-cache',
            })

            lastFetchAt = Date.now()

            if (balanceResponse.status === 401 || balanceResponse.status === 403) {
                return lastResult
            }

            const contentType = balanceResponse.headers.get('content-type')
            if (!balanceResponse.ok || !contentType?.includes('application/json')) {
                return lastResult
            }

            const data = (await balanceResponse.json()) as WalletBalanceResponse
            lastResult = data
            return data
        } catch {
            return lastResult
        } finally {
            inFlight = null
        }
    })()

    return inFlight
}

export function shouldPollWalletBalance(): boolean {
    return typeof document === 'undefined' || document.visibilityState === 'visible'
}
