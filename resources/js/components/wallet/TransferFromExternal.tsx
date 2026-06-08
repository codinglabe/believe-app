import { motion } from 'framer-motion'
import { RefreshCw, Plus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExternalAccount } from './types'

interface TransferFromExternalProps {
    externalAccounts: ExternalAccount[]
    selectedExternalAccount: string
    transferAmount: string
    isLoading: boolean
    onAccountChange: (accountId: string) => void
    onAmountChange: (amount: string) => void
    onTransfer: () => void
    onAddBankAccount?: () => void
}

export function TransferFromExternal({
    externalAccounts,
    selectedExternalAccount,
    transferAmount,
    isLoading,
    onAccountChange,
    onAmountChange,
    onTransfer,
    onAddBankAccount,
}: TransferFromExternalProps) {
    const verifiedAccounts = externalAccounts.filter(acc => acc.status === 'verified')
    const isValid = selectedExternalAccount && transferAmount && parseFloat(transferAmount) > 0

    if (verifiedAccounts.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4 space-y-4"
            >
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium mb-1">No bank account linked</p>
                    <p className="text-xs text-muted-foreground mb-4 px-4">
                        Add a verified bank account before transferring funds from your bank.
                    </p>
                    {onAddBankAccount && (
                        <Button
                            onClick={onAddBankAccount}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Bank Account
                        </Button>
                    )}
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="space-y-3">
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Select Bank Account</label>
                    <select
                        value={selectedExternalAccount}
                        onChange={(e) => onAccountChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    >
                        <option value="">Select an account...</option>
                        {verifiedAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.account_holder_name} • ••••{account.account_number.slice(-4)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={transferAmount}
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        />
                    </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                        <strong>Note:</strong> Transfers from external accounts may take 1-3 business days to process.
                    </p>
                </div>
            </div>

            <Button
                onClick={onTransfer}
                disabled={isLoading || !isValid}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
                {isLoading ? (
                    <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    'Initiate Transfer'
                )}
            </Button>
        </motion.div>
    )
}

