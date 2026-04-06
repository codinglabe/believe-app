import { motion } from 'framer-motion'
import { ArrowRightLeft } from 'lucide-react'

export function SwapView() {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-4"
        >
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full">
                    <ArrowRightLeft className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground">
                        The swap feature is under development and will be available soon.
                    </p>
                </div>
            </div>
        </motion.div>
    )
}

