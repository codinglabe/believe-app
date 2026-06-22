import { motion } from 'framer-motion'
import { BalanceCard, BalanceCardVariant } from './BalanceCard'

interface BalanceDisplayProps {
    balance: number | null
    isLoading: boolean
    onRefresh: () => void
    isSandbox?: boolean
    variant?: BalanceCardVariant
}

export function BalanceDisplay({
    balance,
    isLoading,
    onRefresh,
    isSandbox = false,
    variant = 'compact',
}: BalanceDisplayProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pt-3 pb-2 border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10"
        >
            <BalanceCard
                balance={balance}
                isLoading={isLoading}
                onRefresh={onRefresh}
                isSandbox={isSandbox}
                variant={variant}
            />
        </motion.div>
    )
}
