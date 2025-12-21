import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { SuccessType } from './types'

interface SuccessMessageProps {
    show: boolean
    successType: SuccessType
    message: string
}

export function SuccessMessage({ show, successType, message }: SuccessMessageProps) {
    if (!show) return null

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-b-xl"
        >
            <div className="text-center space-y-4 p-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                    className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
                >
                    <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                >
                    <h3 className="text-xl font-bold">
                        {successType === 'send' && 'Transaction Sent!'}
                        {successType === 'receive' && 'Address Copied!'}
                        {successType === 'swap' && 'Swap Completed!'}
                        {successType === 'addMoney' && 'Money Added!'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="w-12 h-1 bg-primary/20 rounded-full mx-auto overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 3, ease: 'linear' }}
                            className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                        />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}

