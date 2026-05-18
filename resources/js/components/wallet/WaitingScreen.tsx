import React from 'react'
import { motion } from 'framer-motion'
import { Clock, Loader2 } from 'lucide-react'

interface WaitingScreenProps {
    title: string
    message: string
    subMessage?: string
    variant?: 'default' | 'control_person' | 'business_documents' | 'kyc_verification'
}

const WaitingScreen: React.FC<WaitingScreenProps> = ({
    title,
    message,
    subMessage,
    variant = 'default',
}) => {
    // Different color schemes based on variant
    const variantStyles = {
        default: {
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            icon: 'text-blue-600 dark:text-blue-400',
            ring: 'ring-blue-500/20',
        },
        control_person: {
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            icon: 'text-purple-600 dark:text-purple-400',
            ring: 'ring-purple-500/20',
        },
        business_documents: {
            bg: 'bg-green-100 dark:bg-green-900/30',
            icon: 'text-green-600 dark:text-green-400',
            ring: 'ring-green-500/20',
        },
        kyc_verification: {
            bg: 'bg-orange-100 dark:bg-orange-900/30',
            icon: 'text-orange-600 dark:text-orange-400',
            ring: 'ring-orange-500/20',
        },
    }

    const styles = variantStyles[variant]

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6 min-h-[400px]">
            {/* Animated Icon Container */}
            <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{ 
                    scale: 1, 
                    opacity: 1, 
                    rotate: 0,
                }}
                transition={{ 
                    duration: 0.6,
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                }}
                className="relative"
            >
                {/* Pulsing Background Ring */}
                <motion.div
                    className={`absolute inset-0 rounded-full ${styles.bg} ${styles.ring}`}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    style={{
                        width: '80px',
                        height: '80px',
                        margin: '-10px',
                    }}
                />
                
                {/* Second Pulsing Ring */}
                <motion.div
                    className={`absolute inset-0 rounded-full ${styles.bg} ${styles.ring}`}
                    animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5,
                    }}
                    style={{
                        width: '80px',
                        height: '80px',
                        margin: '-10px',
                    }}
                />

                {/* Main Icon Container */}
                <motion.div
                    className={`w-20 h-20 ${styles.bg} rounded-full flex items-center justify-center relative z-10 shadow-lg`}
                    animate={{
                        boxShadow: [
                            `0 0 0 0 ${styles.icon}40`,
                            `0 0 0 8px ${styles.icon}20`,
                            `0 0 0 0 ${styles.icon}40`,
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    {/* Rotating Clock Icon */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        <Clock className={`h-10 w-10 ${styles.icon}`} />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Animated Text Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-center space-y-3 max-w-md"
            >
                <motion.h3
                    className="text-xl font-bold text-foreground"
                    animate={{
                        opacity: [1, 0.7, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    {title}
                </motion.h3>
                
                <motion.p
                    className="text-sm text-muted-foreground leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    {message}
                </motion.p>

                {subMessage && (
                    <motion.p
                        className="text-xs text-muted-foreground mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                    >
                        {subMessage}
                    </motion.p>
                )}
            </motion.div>

            {/* Animated Loading Dots */}
            <motion.div
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
            >
                {[0, 1, 2].map((index) => (
                    <motion.div
                        key={index}
                        className={`w-2 h-2 rounded-full ${styles.icon.replace('text-', 'bg-').replace('dark:', 'dark:bg-')} opacity-60`}
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: index * 0.2,
                        }}
                    />
                ))}
            </motion.div>
        </div>
    )
}

export default WaitingScreen

