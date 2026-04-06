import { motion } from 'framer-motion'
import { RefreshCw, ArrowDownLeft, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExternalAccount } from './types'

interface WithdrawToExternalProps {
    externalAccounts: ExternalAccount[]
    selectedExternalAccount: string
    withdrawAmount: string
    walletBalance: number | null
    isLoading: boolean
    onAccountChange: (accountId: string) => void
    onAmountChange: (amount: string) => void
    onWithdraw: () => void
}

export function WithdrawToExternal({
    externalAccounts,
    selectedExternalAccount,
    withdrawAmount,
    walletBalance,
    isLoading,
    onAccountChange,
    onAmountChange,
    onWithdraw
}: WithdrawToExternalProps) {
    const verifiedAccounts = externalAccounts.filter(acc => acc.status === 'verified')
    const amount = parseFloat(withdrawAmount) || 0
    const isValid = selectedExternalAccount && withdrawAmount && amount > 0 && walletBalance !== null && amount <= walletBalance

    const handleMaxClick = () => {
        if (walletBalance !== null && walletBalance > 0) {
            onAmountChange(walletBalance.toFixed(2))
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Withdraw to Bank Account</h3>
                </div>


                {/* Select Bank Account */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">
                        Select Bank Account <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={selectedExternalAccount}
                        onChange={(e) => onAccountChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">Select an account...</option>
                        {verifiedAccounts.length === 0 ? (
                            <option value="" disabled>No verified accounts available</option>
                        ) : (
                            verifiedAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.account_holder_name} • {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} • ••••{account.account_number.slice(-4)}
                                </option>
                            ))
                        )}
                    </select>
                    {verifiedAccounts.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            You need at least one verified bank account to withdraw funds
                        </p>
                    )}
                </div>

                {/* Amount Input */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-muted-foreground">
                            Withdrawal Amount <span className="text-red-500">*</span>
                        </label>
                        {walletBalance !== null && walletBalance > 0 && (
                            <button
                                type="button"
                                onClick={handleMaxClick}
                                disabled={isLoading}
                                className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
                            >
                                Use Max
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={walletBalance !== null ? walletBalance : undefined}
                            value={withdrawAmount}
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder="0.00"
                            disabled={isLoading}
                            className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                    {walletBalance !== null && amount > walletBalance && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5">
                            <AlertCircle className="h-3 w-3" />
                            Amount exceeds available balance
                        </p>
                    )}
                    {walletBalance !== null && amount > 0 && amount <= walletBalance && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                            You will receive ${amount.toFixed(2)} in your bank account
                        </p>
                    )}
                </div>

                {/* Info Notice */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                            <p className="text-xs text-blue-900 dark:text-blue-100 font-medium">
                                Withdrawal Processing Time
                            </p>
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                ACH withdrawals typically take 1-3 business days to process. Wire transfers may be faster but may incur additional fees.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    onClick={onWithdraw}
                    disabled={isLoading || !isValid}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing Withdrawal...
                        </>
                    ) : (
                        <>
                            <ArrowDownLeft className="h-4 w-4 mr-2" />
                            Initiate Withdrawal
                        </>
                    )}
                </Button>
            </div>
        </motion.div>
    )
}

