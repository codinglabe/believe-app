import { Wallet, Copy, Check, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from 'lucide-react'
import { ActionView } from './types'
import { formatCurrency, formatAddress } from './utils'

interface WalletScreenProps {
    walletBalance: number | null
    walletAddress: string | null
    isLoading: boolean
    copied: boolean
    isSandbox: boolean
    onRefresh: () => void
    onCopyAddress: () => void
    onActionViewChange: (view: ActionView) => void
}

export function WalletScreen({
    walletBalance,
    walletAddress,
    isLoading,
    copied,
    isSandbox,
    onRefresh,
    onCopyAddress,
    onActionViewChange
}: WalletScreenProps) {
    return (
        <div className="p-4 space-y-4">
            {/* Balance - Prominent display */}
            <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold">
                        ${formatCurrency(walletBalance)}
                    </span>
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        disabled={isLoading}
                        title="Refresh balance"
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Transfer/Deposit Actions - MetaMask style */}
            <div className="grid grid-cols-4 gap-2 pb-4 border-b border-border">
                <button
                    onClick={() => onActionViewChange('addMoney')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <Plus className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">Deposit</span>
                </button>
                <button
                    onClick={() => onActionViewChange('send')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">Send</span>
                </button>
                <button
                    onClick={() => onActionViewChange('receive')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <ArrowDownLeft className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">Receive</span>
                </button>
                <button
                    onClick={() => onActionViewChange('swap')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <ArrowRightLeft className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">Swap</span>
                </button>
            </div>

            {/* Wallet Address - MetaMask style */}
            {walletAddress && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                                <Wallet className="h-4 w-4 text-white" />
                            </div>
                            <code className="text-sm font-mono truncate">
                                {formatAddress(walletAddress)}
                            </code>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onCopyAddress()
                            }}
                            className="p-1.5 rounded-lg hover:bg-background transition-colors flex-shrink-0 ml-2"
                            title="Copy address"
                        >
                            {copied ? (
                                <Check className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Network/Status */}
            <div className="flex items-center justify-between p-2 text-xs">
                <span className="text-muted-foreground">Network</span>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">{isSandbox ? 'Sandbox Virtual Account' : 'Organization Wallet'}</span>
                </div>
            </div>
        </div>
    )
}

