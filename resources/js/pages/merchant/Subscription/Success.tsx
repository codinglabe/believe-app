import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { MerchantDashboardLayout } from '@/components/merchant'
import { MerchantButton } from '@/components/merchant-ui'

interface Props {
    planId?: number
}

export default function MerchantSubscriptionSuccess({ planId }: Props) {
    return (
        <>
            <Head title="Subscription Successful" />
            <MerchantDashboardLayout>
                <div className="max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="text-center"
                    >
                        {/* Success Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="flex justify-center mb-6"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                <div className="relative p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full">
                                    <CheckCircle2 className="w-16 h-16 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl sm:text-4xl font-bold text-white mb-4"
                        >
                            Subscription Activated!
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-lg text-gray-300 mb-8"
                        >
                            Your subscription has been successfully activated. You now have full access to all features.
                        </motion.p>

                        {/* Sparkle Animation */}
                        <motion.div
                            animate={{
                                rotate: [0, 360],
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            className="flex justify-center mb-8"
                        >
                            <Sparkles className="w-12 h-12 text-[#FF1493]" />
                        </motion.div>

                        {/* Action Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <Link href="/dashboard">
                                <MerchantButton className="bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1493]/90 hover:via-[#DC143C]/90 hover:to-[#E97451]/90 text-white px-8">
                                    Go to Dashboard
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </MerchantButton>
                            </Link>
                            <Link href="/offers">
                                <MerchantButton className="bg-gray-700 hover:bg-gray-600 text-white px-8">
                                    View Offers
                                </MerchantButton>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </MerchantDashboardLayout>
        </>
    )
}
