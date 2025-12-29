import { RefreshCw, Plus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Building2, CreditCard } from 'lucide-react'
import { ActionView } from './types'
import { formatCurrency } from './utils'

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
    isLoading,
    onRefresh,
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

            {/* Bank Accounts Button */}
            <button
                onClick={() => onActionViewChange('external_accounts')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                        <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium">Bank Accounts</p>
                        <p className="text-xs text-muted-foreground">Manage linked accounts</p>
                    </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

            {/* Virtual Card Button */}
            <button
                onClick={() => onActionViewChange('virtual_card')}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                        <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium">Virtual Card</p>
                        <p className="text-xs text-muted-foreground">View card details</p>
                    </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>

        </div>
    )
}

