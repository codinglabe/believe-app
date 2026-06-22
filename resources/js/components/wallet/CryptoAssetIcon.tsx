import { Icon } from '@iconify/react'
import { cn } from '@/lib/utils'

const TOKEN_ICON_IDS: Record<string, string> = {
    usdc: 'cryptocurrency-color:usdc',
    usdt: 'cryptocurrency-color:usdt',
}

const CHAIN_ICON_IDS: Record<string, string> = {
    ethereum: 'cryptocurrency-color:eth',
    solana: 'cryptocurrency-color:sol',
}

const CHAIN_LABELS: Record<string, string> = {
    ethereum: 'Ethereum',
    solana: 'Solana',
}

const TOKEN_LABELS: Record<string, string> = {
    usdc: 'USDC',
    usdt: 'USDT',
}

export function getCryptoTokenLabel(currency: string): string {
    return TOKEN_LABELS[currency.toLowerCase()] ?? currency.toUpperCase()
}

export function getCryptoChainLabel(chain: string): string {
    return CHAIN_LABELS[chain.toLowerCase()] ?? chain.charAt(0).toUpperCase() + chain.slice(1)
}

interface CryptoAssetIconProps {
    currency: string
    chain?: string
    size?: 'sm' | 'md' | 'lg'
    showChainBadge?: boolean
    className?: string
}

const sizeMap = {
    sm: { token: 28, badge: 14, ring: 'ring-2' },
    md: { token: 40, badge: 18, ring: 'ring-2' },
    lg: { token: 56, badge: 22, ring: 'ring-[3px]' },
}

export function CryptoAssetIcon({
    currency,
    chain,
    size = 'md',
    showChainBadge = true,
    className,
}: CryptoAssetIconProps) {
    const dims = sizeMap[size]
    const tokenIcon = TOKEN_ICON_IDS[currency.toLowerCase()] ?? 'lucide:coins'
    const chainIcon = chain ? CHAIN_ICON_IDS[chain.toLowerCase()] : null

    return (
        <div className={cn('relative inline-flex shrink-0', className)}>
            <Icon icon={tokenIcon} width={dims.token} height={dims.token} className="rounded-full" />
            {showChainBadge && chainIcon && (
                <span
                    className={cn(
                        'absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-background',
                        dims.ring,
                        'ring-background',
                    )}
                >
                    <Icon icon={chainIcon} width={dims.badge} height={dims.badge} className="rounded-full" />
                </span>
            )}
        </div>
    )
}

interface CryptoNetworkBadgeProps {
    currency: string
    chain: string
    className?: string
}

export function CryptoNetworkBadge({ currency, chain, className }: CryptoNetworkBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground',
                className,
            )}
        >
            <CryptoAssetIcon currency={currency} chain={chain} size="sm" showChainBadge={false} />
            <span>
                {getCryptoTokenLabel(currency)} · {getCryptoChainLabel(chain)}
            </span>
        </span>
    )
}
