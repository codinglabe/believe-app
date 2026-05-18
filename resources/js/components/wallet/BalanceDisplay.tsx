import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { formatCurrency } from './utils'

interface BalanceDisplayProps {
    balance: number | null
    isLoading: boolean
    onRefresh: () => void
}

export function BalanceDisplay({ balance, isLoading, onRefresh }: BalanceDisplayProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 pb-2 border-b border-border"
        >
            <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Balance</p>
                <div className="flex items-center justify-center gap-2">
                    <motion.span
                        key={balance}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-3xl font-bold"
                    >
                        ${formatCurrency(balance)}
                    </motion.span>
                    <button
                        onClick={onRefresh}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        disabled={isLoading}
                        title="Refresh balance"
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}

