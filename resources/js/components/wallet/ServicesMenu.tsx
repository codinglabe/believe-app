import { Building2, CreditCard, ArrowUpRight, Plus, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { ActionView } from './types'

interface ServicesMenuProps {
    onNavigate: (view: ActionView) => void
    hasCardWallet?: boolean | null
    isCheckingCardWallet?: boolean
    hasBankAccounts?: boolean | null
    isCheckingBankAccounts?: boolean
    onAddBankAccount?: () => void
}

export function ServicesMenu({
    onNavigate,
    hasCardWallet,
    isCheckingCardWallet,
    hasBankAccounts,
    isCheckingBankAccounts,
    onAddBankAccount,
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
                    <p className="text-xs text-muted-foreground mt-1">Manage your banking and card services</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <button
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
                        onClick={() => onNavigate('virtual_card')}
                        className="w-full flex flex-col items-center justify-center p-3 rounded-lg border border-border hover:bg-muted transition-colors group cursor-pointer relative"
                    >
                        {isCheckingCardWallet ? (
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2">
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                            </div>
                        ) : (
                            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                                {hasCardWallet === false ? (
                                    <Plus className="h-4 w-4 text-white" />
                                ) : (
                                    <CreditCard className="h-4 w-4 text-white" />
                                )}
                            </div>
                        )}
                        <p className="text-sm font-medium text-center">
                            {hasCardWallet === false ? 'Create Card' : 'Virtual Card'}
                        </p>
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

