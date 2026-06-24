import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
    RefreshCw,
    Building2,
    Plus,
    ArrowDownLeft,
    Trash2,
    Landmark,
    Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExternalAccount } from './types'
import { AddBankAccount, BankAccountFormData } from './AddBankAccount'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ExternalAccountsProps {
    externalAccounts: ExternalAccount[]
    isLoading: boolean
    isLinking?: boolean
    isRemoving?: boolean
    initialShowAddForm?: boolean
    onRefresh: () => void
    onLinkAccount: (accountData: BankAccountFormData) => void | Promise<void>
    onRemoveAccount?: (accountId: string) => void | Promise<void>
    onWithdraw?: () => void
}

function formatAccountType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1)
}

function maskAccountNumber(lastDigits: string): string {
    const digits = lastDigits.replace(/\D/g, '')
    return digits.length >= 4 ? `••••${digits.slice(-4)}` : '••••'
}

export function ExternalAccounts({
    externalAccounts,
    isLoading,
    isLinking = false,
    isRemoving = false,
    initialShowAddForm = false,
    onRefresh,
    onLinkAccount,
    onRemoveAccount,
    onWithdraw,
}: ExternalAccountsProps) {
    const [showAddForm, setShowAddForm] = useState(initialShowAddForm)
    const [accountToRemove, setAccountToRemove] = useState<ExternalAccount | null>(null)

    useEffect(() => {
        if (initialShowAddForm) {
            setShowAddForm(true)
        }
    }, [initialShowAddForm])

    const handleLinkAccount = async (accountData: BankAccountFormData) => {
        await onLinkAccount(accountData)
        setShowAddForm(false)
    }

    const confirmRemove = async () => {
        if (!accountToRemove || !onRemoveAccount) {
            return
        }

        await onRemoveAccount(accountToRemove.id)
        setAccountToRemove(null)
    }

    if (showAddForm) {
        return (
            <AddBankAccount
                isLoading={isLinking}
                onLinkAccount={handleLinkAccount}
                onCancel={() => setShowAddForm(false)}
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
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold">Bank Accounts</h3>
                    <p className="text-xs text-muted-foreground">
                        Link accounts to deposit or withdraw USD
                    </p>
                </div>
                <Button
                    onClick={onRefresh}
                    disabled={isLoading || isRemoving}
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {isLoading && externalAccounts.length === 0 ? (
                <div className="text-center py-12">
                    <RefreshCw className="h-6 w-6 text-muted-foreground mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading accounts...</p>
                </div>
            ) : externalAccounts.length === 0 ? (
                <div className="text-center py-10 rounded-xl border border-dashed border-border bg-muted/20">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/15 to-blue-500/15">
                        <Building2 className="h-7 w-7 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium mb-1">No bank accounts yet</p>
                    <p className="text-xs text-muted-foreground mb-5 px-6">
                        Connect a US bank account to move money in and out of your wallet
                    </p>
                    <Button
                        onClick={() => setShowAddForm(true)}
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Link Bank Account
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {externalAccounts.map((account) => (
                        <div
                            key={account.id}
                            className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
                        >
                            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-purple-600 to-blue-600" />
                            <div className="flex items-start gap-3 pl-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <Landmark className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {account.bank_name || 'Linked Bank Account'}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {account.account_holder_name}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full ${
                                                account.status === 'verified'
                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                            }`}
                                        >
                                            {account.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                                            {formatAccountType(account.account_type)}
                                        </span>
                                        <span>{maskAccountNumber(account.account_number)}</span>
                                    </div>
                                </div>
                                {onRemoveAccount && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={isRemoving || isLinking}
                                        onClick={() => setAccountToRemove(account)}
                                        className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                        aria-label="Remove bank account"
                                    >
                                        {isRemoving && accountToRemove?.id === account.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-2 pt-1">
                        {onWithdraw && (
                            <Button
                                onClick={onWithdraw}
                                size="sm"
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                            >
                                <ArrowDownLeft className="h-3.5 w-3.5 mr-1.5" />
                                Withdraw to Bank
                            </Button>
                        )}
                        <Button
                            onClick={() => setShowAddForm(true)}
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={isLinking || isRemoving}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Link Another Account
                        </Button>
                    </div>
                </div>
            )}

            <AlertDialog
                open={accountToRemove !== null}
                onOpenChange={(open) => {
                    if (!open && !isRemoving) {
                        setAccountToRemove(null)
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove bank account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {accountToRemove ? (
                                <>
                                    This will unlink{' '}
                                    <strong>
                                        {accountToRemove.bank_name || accountToRemove.account_holder_name}
                                    </strong>{' '}
                                    ({maskAccountNumber(accountToRemove.account_number)}). You can link it again
                                    later if needed.
                                </>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                void confirmRemove()
                            }}
                            disabled={isRemoving}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isRemoving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                'Remove Account'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    )
}
