"use client"

import React from 'react'
import { X, CreditCard, ShoppingCart, Gift, DollarSign, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'

interface SubscriptionRequiredModalProps {
    isOpen: boolean
    onClose: () => void
    feature?: 'wallet' | 'products' | 'donations' | 'commissions' | 'general'
    isSupporterView?: boolean // When true, shows message for supporters (organization needs subscription)
}

export function SubscriptionRequiredModal({ isOpen, onClose, feature = 'general', isSupporterView = false }: SubscriptionRequiredModalProps) {
    const handleSubscribe = () => {
        router.visit('/plans', {
            onSuccess: () => {
                onClose()
            }
        })
    }

    const getFeatureInfo = () => {
        if (isSupporterView) {
            switch (feature) {
                case 'donations':
                    return {
                        title: 'Donations Currently Unavailable',
                        description: 'This organization does not have an active subscription plan, so donations are temporarily unavailable. Please check back later or contact the organization directly.',
                        icon: <Gift className="h-12 w-12" />,
                    }
                default:
                    return {
                        title: 'Feature Unavailable',
                        description: 'This organization does not have an active subscription plan, so this feature is temporarily unavailable. Please check back later.',
                        icon: <AlertCircle className="h-12 w-12" />,
                    }
            }
        }
        
        switch (feature) {
            case 'wallet':
                return {
                    title: 'Subscription Required for Wallet',
                    description: 'To access wallet features, manage funds, and make transactions, you need an active subscription.',
                    icon: <CreditCard className="h-12 w-12" />,
                }
            case 'products':
                return {
                    title: 'Subscription Required to Sell Products',
                    description: 'To sell products and accept payments, you need an active subscription plan.',
                    icon: <ShoppingCart className="h-12 w-12" />,
                }
            case 'donations':
                return {
                    title: 'Subscription Required for Donations',
                    description: 'To accept donations and manage donor relationships, you need an active subscription.',
                    icon: <Gift className="h-12 w-12" />,
                }
            case 'commissions':
                return {
                    title: 'Subscription Required for Commissions',
                    description: 'To receive commissions and manage earnings, you need an active subscription.',
                    icon: <DollarSign className="h-12 w-12" />,
                }
            default:
                return {
                    title: 'Subscription Required',
                    description: 'This feature requires an active subscription plan. Subscribe now to unlock all features!',
                    icon: <Sparkles className="h-12 w-12" />,
                }
        }
    }

    const featureInfo = getFeatureInfo()

    const features = [
        'Access to wallet and payment features',
        'Sell products and accept payments',
        'Receive donations from supporters',
        'Earn commissions on sales',
        'Full access to all platform features',
    ]

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 30 
                        }}
                        className="relative z-10 w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>

                        {/* Content */}
                        <div className="p-8">
                            {/* Icon with Animation */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 200, 
                                    damping: 15,
                                    delay: 0.1 
                                }}
                                className="mx-auto w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mb-6 shadow-lg"
                            >
                                <motion.div
                                    animate={{ 
                                        rotate: [0, 10, -10, 0],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ 
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="text-white"
                                >
                                    {featureInfo.icon}
                                </motion.div>
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-bold text-center mb-3"
                            >
                                {featureInfo.title}
                            </motion.h2>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-center text-muted-foreground mb-6"
                            >
                                {featureInfo.description}
                            </motion.p>

                            {/* Features List - Only show for organization users, not supporters */}
                            {!isSupporterView && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="space-y-3 mb-8"
                                >
                                    {features.map((feature, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + index * 0.1 }}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                        >
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ 
                                                    delay: 0.6 + index * 0.1,
                                                    type: "spring",
                                                    stiffness: 200
                                                }}
                                            >
                                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                            </motion.div>
                                            <span className="text-sm font-medium">{feature}</span>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {/* Action Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="flex flex-col sm:flex-row gap-3"
                            >
                                {!isSupporterView ? (
                                    <>
                                        <Button
                                            onClick={handleSubscribe}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                            size="lg"
                                        >
                                            <CreditCard className="h-4 w-4 mr-2" />
                                            View Plans & Subscribe
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                        <Button
                                            onClick={onClose}
                                            variant="outline"
                                            size="lg"
                                            className="flex-1"
                                        >
                                            Maybe Later
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={onClose}
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                    >
                                        Close
                                    </Button>
                                )}
                            </motion.div>
                        </div>

                        {/* Decorative Gradient Background */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

