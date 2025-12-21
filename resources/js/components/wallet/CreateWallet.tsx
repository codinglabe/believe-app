import { motion } from 'framer-motion'
import { CheckCircle2, RefreshCw, Wallet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VerificationType } from './types'

interface CreateWalletProps {
    isLoading: boolean
    isSandbox: boolean
    verificationType: VerificationType
    onCreateWallet: () => void
}

export function CreateWallet({
    isLoading,
    isSandbox,
    verificationType,
    onCreateWallet
}: CreateWalletProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 relative z-10"
        >
            <div className="text-center space-y-4 w-full">
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl relative"
                >
                    <CheckCircle2 className="h-12 w-12 text-white" />
                    <motion.div
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 rounded-full bg-green-400/30"
                    />
                </motion.div>

                {/* Title and Description */}
                <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Account Approved!</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Your {verificationType === 'kyb' ? 'business verification (KYB)' : 'identity verification (KYC)'} has been approved.
                    </p>
                </div>

                {/* Create Wallet Button - Works in both sandbox and production */}
                <div className="w-full max-w-sm mx-auto space-y-4 relative z-10">
                    <Button
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!isLoading) {
                                onCreateWallet()
                            }
                        }}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                        size="lg"
                        type="button"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                {isSandbox ? 'Creating Virtual Account...' : 'Creating Wallet...'}
                            </>
                        ) : (
                            <>
                                <Wallet className="h-4 w-4 mr-2" />
                                {isSandbox ? 'Create Virtual Account' : 'Create Wallet'}
                            </>
                        )}
                    </Button>

                    {/* Sandbox Info */}
                    {isSandbox && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-left">
                                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                        Sandbox Mode
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        In sandbox mode, a virtual account will be created instead of a wallet. This allows you to test deposits and transfers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    {!isSandbox && (
                        <p className="text-xs text-muted-foreground">
                            Your wallet and virtual account will be created automatically
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

