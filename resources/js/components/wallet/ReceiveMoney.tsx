import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { DepositInstructions } from './types'
import { CryptoDepositPanel } from './CryptoDepositPanel'

interface ReceiveMoneyProps {
    isLoading: boolean
    qrCodeUrl: string | null
    depositInstructions: DepositInstructions | null
    walletAddress: string | null
    copied: boolean
    onCopyAddress: () => void
    isSandbox?: boolean
}

export function ReceiveMoney({
    isLoading,
    isSandbox = false,
}: ReceiveMoneyProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                <p className="text-sm text-muted-foreground">Loading receive options…</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4"
        >
            <CryptoDepositPanel isSandbox={isSandbox} variant="receive" />
        </motion.div>
    )
}
