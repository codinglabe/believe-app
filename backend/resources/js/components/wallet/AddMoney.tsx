import { motion } from 'framer-motion'
import { RefreshCw, Copy, Building2, AlertCircle } from 'lucide-react'
import { DepositInstructions, PaymentMethod } from './types'
import { showSuccessToast } from '@/lib/toast'

interface AddMoneyProps {
    isLoading: boolean
    depositInstructions: DepositInstructions | null
    selectedPaymentMethod: PaymentMethod
    onPaymentMethodChange: (method: PaymentMethod) => void
}

export function AddMoney({
    isLoading,
    depositInstructions,
    selectedPaymentMethod,
    onPaymentMethodChange
}: AddMoneyProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!depositInstructions) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4 space-y-4"
            >
                <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No deposit instructions available</p>
                </div>
            </motion.div>
        )
    }

    const hasAch = (depositInstructions.payment_rails && depositInstructions.payment_rails.includes('ach_push')) || 
                   depositInstructions.payment_rail === 'ach_push'
    const hasWire = (depositInstructions.payment_rails && depositInstructions.payment_rails.includes('wire')) || 
                    depositInstructions.payment_rail === 'wire'
    const hasMultiple = (hasAch && hasWire) || (depositInstructions.payment_rails && depositInstructions.payment_rails.length > 1)

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="space-y-4">
                {/* Payment Method Tabs - Only show if multiple payment methods available */}
                {hasMultiple && (
                    <div className="relative flex gap-2 p-1 bg-muted rounded-lg">
                        {/* Animated background indicator */}
                        <motion.div
                            className="absolute inset-y-1 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 shadow-md"
                            initial={false}
                            animate={{
                                x: selectedPaymentMethod === 'ach' ? 0 : '100%',
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 30,
                            }}
                            style={{
                                width: 'calc(50% - 0.25rem)',
                            }}
                        />
                        
                        {hasAch && (
                            <motion.button
                                onClick={() => onPaymentMethodChange('ach')}
                                className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md z-10 ${
                                    selectedPaymentMethod === 'ach'
                                        ? 'text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <motion.span
                                    animate={{
                                        scale: selectedPaymentMethod === 'ach' ? 1.05 : 1,
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 25,
                                    }}
                                >
                                    ACH
                                </motion.span>
                            </motion.button>
                        )}
                        {hasWire && (
                            <motion.button
                                onClick={() => onPaymentMethodChange('wire')}
                                className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md z-10 ${
                                    selectedPaymentMethod === 'wire'
                                        ? 'text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <motion.span
                                    animate={{
                                        scale: selectedPaymentMethod === 'wire' ? 1.05 : 1,
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 400,
                                        damping: 25,
                                    }}
                                >
                                    WIRE
                                </motion.span>
                            </motion.button>
                        )}
                    </div>
                )}

                {/* Bank Details Section */}
                <div className="p-4 bg-gradient-to-br from-purple-600/10 via-blue-600/10 to-purple-600/10 dark:from-purple-900/30 dark:via-blue-900/30 dark:to-purple-900/30 rounded-xl border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-200/30 dark:border-purple-700/30">
                        <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                            <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="text-base font-bold text-foreground">
                            {selectedPaymentMethod === 'ach' ? 'ACH Deposit Details' : 'Wire Transfer Details'}
                        </h3>
                    </div>
                    
                    <div className="space-y-3.5">
                        {depositInstructions.bank_name && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Name</p>
                                <p className="text-sm font-semibold text-foreground">{depositInstructions.bank_name}</p>
                            </div>
                        )}
                        
                        {depositInstructions.bank_address && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bank Address</p>
                                <p className="text-sm text-foreground break-words">{depositInstructions.bank_address}</p>
                            </div>
                        )}
                        
                        {depositInstructions.bank_routing_number && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Routing Number</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-background/50 dark:bg-background/30 border border-border rounded-lg font-mono text-sm font-semibold text-foreground">
                                        {depositInstructions.bank_routing_number}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(depositInstructions.bank_routing_number || '')
                                            showSuccessToast('Routing number copied!')
                                        }}
                                        className="p-2 hover:bg-background/50 rounded-lg border border-border transition-colors"
                                        title="Copy routing number"
                                    >
                                        <Copy className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {depositInstructions.bank_account_number && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account Number</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-background/50 dark:bg-background/30 border border-border rounded-lg font-mono text-sm font-semibold text-foreground">
                                        {depositInstructions.bank_account_number}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(depositInstructions.bank_account_number || '')
                                            showSuccessToast('Account number copied!')
                                        }}
                                        className="p-2 hover:bg-background/50 rounded-lg border border-border transition-colors"
                                        title="Copy account number"
                                    >
                                        <Copy className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {depositInstructions.bank_beneficiary_name && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beneficiary Name</p>
                                <p className="text-sm font-semibold text-foreground break-words">{depositInstructions.bank_beneficiary_name}</p>
                            </div>
                        )}
                        
                        {depositInstructions.bank_beneficiary_address && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Beneficiary Address</p>
                                <p className="text-sm text-foreground break-words">{depositInstructions.bank_beneficiary_address}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Instructions Card */}
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                    <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1.5">
                                How to Deposit via {selectedPaymentMethod === 'ach' ? 'ACH' : 'Wire Transfer'}
                            </p>
                            <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                                {selectedPaymentMethod === 'ach' 
                                    ? 'Use the bank details above to make an ACH deposit. ACH transfers typically take 1-3 business days to process. Funds will be credited to your wallet once the transfer is processed.'
                                    : 'Use the bank details above to make a wire transfer. Wire transfers are typically processed same-day or within 1 business day. Funds will be credited to your wallet once the transfer is processed.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

