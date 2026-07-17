import { Building2, CreditCard, Gift, Plus, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ActionView } from './types'

interface ServicesMenuProps {
    onNavigate: (view: ActionView) => void
    isCheckingCardWallet?: boolean
    hasBankAccounts?: boolean | null
    isCheckingBankAccounts?: boolean
    onAddBankAccount?: () => void
    /** Opens owned gift cards management (closes wallet). */
    onOpenMyGiftCards?: () => void
}

export function ServicesMenu({
    onNavigate,
    isCheckingCardWallet,
    hasBankAccounts,
    isCheckingBankAccounts,
    onAddBankAccount,
    onOpenMyGiftCards,
}: ServicesMenuProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="space-y-3">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold">Services</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Manage banking, cards, and gift cards
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (hasBankAccounts === false && onAddBankAccount) {
                                onAddBankAccount()
                            } else {
                                onNavigate('external_accounts')
                            }
                        }}
                        className="w-full flex flex-col items-center justify-center p-3 rounded-lg border border-border hover:bg-muted transition-colors group cursor-pointer"
                    >
                        {isCheckingBankAccounts ? (
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2">
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                            </div>
                        ) : (
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                                {hasBankAccounts === false ? (
                                    <Plus className="h-4 w-4 text-white" />
                                ) : (
                                    <Building2 className="h-4 w-4 text-white" />
                                )}
                            </div>
                        )}
                        <p className="text-sm font-medium text-center">
                            {hasBankAccounts === false ? 'Add Bank Account' : 'Bank Accounts'}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => onNavigate('virtual_card')}
                        className="w-full flex flex-col items-center justify-center p-3 rounded-lg border border-border hover:bg-muted transition-colors group cursor-pointer relative"
                    >
                        {isCheckingCardWallet ? (
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2">
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                            </div>
                        ) : (
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                                <CreditCard className="h-4 w-4 text-white" />
                            </div>
                        )}
                        <p className="text-sm font-medium text-center">Cards</p>
                    </button>

                    {onOpenMyGiftCards ? (
                        <button
                            type="button"
                            onClick={onOpenMyGiftCards}
                            className="w-full flex flex-col items-center justify-center p-3 rounded-lg border border-border hover:bg-muted transition-colors group cursor-pointer"
                        >
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                                <Gift className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-sm font-medium text-center">My Gift Cards</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground text-center leading-tight">
                                View, redeem & balances
                            </p>
                        </button>
                    ) : null}
                </div>
            </div>
        </motion.div>
    )
}
