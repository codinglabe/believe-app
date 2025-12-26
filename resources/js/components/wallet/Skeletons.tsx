import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function SplashScreen() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-purple-950/20"
        >
            {/* Animated Wallet Icon */}
            <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{
                    scale: [0.8, 1.1, 1],
                    rotate: [-10, 10, 0],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                className="relative"
            >
                <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Wallet className="h-10 w-10 text-white" />
                </div>
                {/* Pulsing ring effect */}
                <motion.div
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.div>

            {/* Loading Text */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-2"
            >
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Loading Wallet
                </h3>
                <p className="text-sm text-muted-foreground">
                    Securing your financial data...
                </p>
            </motion.div>

            {/* Loading Dots */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-2"
            >
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="w-2 h-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </motion.div>
        </motion.div>
    )
}

export function BalanceSkeleton() {
    return (
        <div className="text-center py-4 space-y-2">
            <Skeleton className="h-4 w-24 mx-auto" />
            <Skeleton className="h-10 w-32 mx-auto" />
        </div>
    )
}

export function WalletAddressSkeleton() {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
            </div>
        </div>
    )
}

export function SearchResultsSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function ActivitySkeleton() {
    return (
        <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                </div>
            ))}
        </div>
    )
}

export function QRCodeSkeleton() {
    return (
        <div className="flex items-center justify-center p-8">
            <Skeleton className="h-64 w-64 rounded-lg" />
        </div>
    )
}

export function DepositInstructionsSkeleton() {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
        </div>
    )
}

