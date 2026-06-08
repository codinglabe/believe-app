import { RefreshCw, Plus, ArrowUpRight, ArrowDownLeft, Building2, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionView } from './types'
import { formatCurrency } from './utils'

interface WalletScreenProps {
    walletBalance: number | null
    walletAddress: string | null
    isLoading: boolean
    copied: boolean
    isSandbox: boolean
    hasBankAccounts?: boolean | null
    isCheckingBankAccounts?: boolean
    onRefresh: () => void
    onCopyAddress: () => void
    onActionViewChange: (view: ActionView) => void
    onAddBankAccount?: () => void
}

export function WalletScreen({
    walletBalance,
    isLoading,
    hasBankAccounts,
    isCheckingBankAccounts,
    onRefresh,
    onActionViewChange,
    onAddBankAccount,
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
                {/* Swap button - commented out */}
                {/* <button
                    onClick={() => onActionViewChange('swap')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <ArrowRightLeft className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">Swap</span>
                </button> */}
                <button
                    onClick={() => onActionViewChange('services_menu')}
                    className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                        <Menu className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium">More</span>
                </button>
            </div>

            {hasBankAccounts === false && onAddBankAccount && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-3">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">No bank account linked</p>
                        <p className="text-xs text-muted-foreground">
                            Add a bank account to withdraw funds or transfer from your bank.
                        </p>
                    </div>
                    <Button
                        onClick={onAddBankAccount}
                        disabled={isCheckingBankAccounts}
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                        {isCheckingBankAccounts ? (
                            <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Checking…
                            </>
                        ) : (
                            <>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Bank Account
                            </>
                        )}
                    </Button>
                </div>
            )}

        </div>
    )
}

