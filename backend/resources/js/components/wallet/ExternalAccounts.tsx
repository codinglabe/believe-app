import { motion } from 'framer-motion'
import { useState } from 'react'
import { RefreshCw, Building2, Plus, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExternalAccount } from './types'
import { AddBankAccount } from './AddBankAccount'

interface ExternalAccountsProps {
    externalAccounts: ExternalAccount[]
    isLoading: boolean
    onRefresh: () => void
    onLinkAccount: (accountData: {
        routing_number: string
        account_number: string
        account_type: 'checking' | 'savings'
        account_holder_name: string
        bank_name: string
        first_name: string
        last_name: string
        street_line_1: string
        city: string
        state: string
        postal_code: string
        country: string
    }) => void
    onWithdraw?: () => void
}

export function ExternalAccounts({
    externalAccounts,
    isLoading,
    onRefresh,
    onLinkAccount,
    onWithdraw
}: ExternalAccountsProps) {
    const [showAddForm, setShowAddForm] = useState(false)

    const handleLinkClick = () => {
        setShowAddForm(true)
    }

    const handleCancel = () => {
        setShowAddForm(false)
    }

    const handleLinkAccount = async (accountData: {
        routing_number: string
        account_number: string
        account_type: 'checking' | 'savings'
        account_holder_name: string
    }) => {
        await onLinkAccount(accountData)
        setShowAddForm(false)
    }

    // Show AddBankAccount form if user clicked to add
    if (showAddForm) {
        return (
            <AddBankAccount
                isLoading={isLoading}
                onLinkAccount={handleLinkAccount}
                onCancel={handleCancel}
            />
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
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Linked Bank Accounts</h3>
                    <Button
                        onClick={onRefresh}
                        disabled={isLoading}
                        size="sm"
                        variant="outline"
                    >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-8">
                        <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                        <p className="text-xs text-muted-foreground">Loading accounts...</p>
                    </div>
                ) : externalAccounts.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border rounded-lg">
                        <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium mb-1">No bank accounts linked</p>
                        <p className="text-xs text-muted-foreground mb-4">Link a bank account to start transferring funds</p>
                        <Button
                            onClick={handleLinkClick}
                            size="sm"
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Link Bank Account
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {externalAccounts.map((account) => (
                            <div
                                key={account.id}
                                className="p-3 bg-muted rounded-lg border border-border"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{account.account_holder_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)} • 
                                            ••••{account.account_number.slice(-4)}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        account.status === 'verified' 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    }`}>
                                        {account.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div className="space-y-2">
                            {onWithdraw && (
                                <Button
                                    onClick={onWithdraw}
                                    size="sm"
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                >
                                    <ArrowDownLeft className="h-3 w-3 mr-1" />
                                    Withdraw to Bank
                                </Button>
                            )}
                            <Button
                                onClick={handleLinkClick}
                                size="sm"
                                variant="outline"
                                className="w-full"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Link Another Account
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

