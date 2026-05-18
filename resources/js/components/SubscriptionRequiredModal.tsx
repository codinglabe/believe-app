"use client"

import React, { useEffect, useState } from 'react'
import { X, CreditCard, ShoppingCart, Gift, DollarSign, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Mail, Shield, Building2, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'
import { cn } from '@/lib/utils'

interface SubscriptionRequiredModalProps {
    isOpen: boolean
    onClose: () => void
    feature?: 'wallet' | 'products' | 'donations' | 'commissions' | 'newsletter_targeting' | 'general'
    isSupporterView?: boolean // When true, shows message for supporters (organization needs subscription)
    /** For donation supporter view: distinguishes Care Alliance (hub nonprofit must be subscribed). */
    donationRecipientKind?: 'organization' | 'care_alliance'
    /** One-time USD price for newsletter Pro targeting (lifetime). */
    newsletterPayOnceUsd?: number
    /** When false, hide the pay-once button (e.g. admin disabled checkout). */
    newsletterPayOnceEnabled?: boolean
    /** Override checkout (e.g. tests). Default: POST `newsletter.purchase-pro-targeting` with loading state. */
    onNewsletterPayOnce?: () => void
}

export function SubscriptionRequiredModal({
    isOpen,
    onClose,
    feature = 'general',
    isSupporterView = false,
    donationRecipientKind = 'organization',
    newsletterPayOnceUsd = 0,
    newsletterPayOnceEnabled = true,
    onNewsletterPayOnce,
}: SubscriptionRequiredModalProps) {
    const [newsletterCheckoutPending, setNewsletterCheckoutPending] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setNewsletterCheckoutPending(false)
        }
    }, [isOpen])

    const handleSubscribe = () => {
        router.visit('/plans', {
            onSuccess: () => {
                onClose()
            }
        })
    }

    const startNewsletterProCheckout = () => {
        if (newsletterCheckoutPending) {
            return
        }
        if (onNewsletterPayOnce) {
            onNewsletterPayOnce()
            return
        }
        setNewsletterCheckoutPending(true)
        router.post(
            route('newsletter.purchase-pro-targeting'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setNewsletterCheckoutPending(false),
                onError: () => setNewsletterCheckoutPending(false),
            }
        )
    }

    const getFeatureInfo = () => {
        if (isSupporterView) {
            switch (feature) {
                case 'donations':
                    return donationRecipientKind === 'care_alliance'
                        ? {
                              title: 'Donations Currently Unavailable',
                              description:
                                  'The nonprofit that receives donations for this Care Alliance does not have an active subscription plan, so donations are temporarily unavailable. Please check back later or contact the alliance or that organization directly.',
                              icon: <Gift className="h-12 w-12" />,
                          }
                        : {
                              title: 'Donations Currently Unavailable',
                              description:
                                  'This organization does not have an active subscription plan, so donations are temporarily unavailable. Please check back later or contact the organization directly.',
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
            case 'newsletter_targeting':
                return {
                    title: 'Pro Engagement targeting',
                    description:
                        newsletterPayOnceEnabled && newsletterPayOnceUsd > 0
                            ? 'Unlock advanced audience selection for this account. Separate from your platform subscription — pay once, use forever.'
                            : 'By role, Organizations, and Custom targeting require a one-time unlock when your administrator enables checkout.',
                    icon: <Mail className="h-12 w-12" />,
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                        className="relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
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
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8">
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
                                className="mb-6 text-center text-sm text-muted-foreground sm:text-base"
                            >
                                {featureInfo.description}
                            </motion.p>

                            {feature === 'newsletter_targeting' &&
                                newsletterPayOnceEnabled &&
                                newsletterPayOnceUsd > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5 p-5 shadow-inner"
                                >
                                    <div className="flex flex-col items-center gap-1 border-b border-border/60 pb-4 text-center">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                            Lifetime unlock
                                        </span>
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
                                                ${newsletterPayOnceUsd.toFixed(2)}
                                            </span>
                                            <span className="text-sm font-medium text-muted-foreground">USD</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">One payment · this account · no subscription product required</p>
                                    </div>
                                    <ul className="mt-4 space-y-3">
                                        {[
                                            { icon: Shield, text: 'By role — segment by supporter roles' },
                                            { icon: Building2, text: 'Organizations — full nonprofit directory' },
                                            { icon: Layers, text: 'Custom — mix users, orgs, and roles' },
                                        ].map(({ icon: Icon, text }) => (
                                            <li key={text} className="flex gap-3 text-sm">
                                                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200">
                                                    <Icon className="h-4 w-4" aria-hidden />
                                                </span>
                                                <span className="min-w-0 pt-1 leading-snug text-foreground">{text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}

                            {/* Features List - Only show for organization users, not supporters */}
                            {!isSupporterView && feature !== 'newsletter_targeting' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="space-y-3 mb-8"
                                >
                                    {features.map((line, index) => (
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
                                            <span className="text-sm font-medium">{line}</span>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {/* Action Buttons */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className={cn(
                                    'flex w-full min-w-0 flex-col gap-3',
                                    feature === 'newsletter_targeting' && 'sm:max-w-none'
                                )}
                            >
                                {!isSupporterView ? (
                                    feature === 'newsletter_targeting' ? (
                                        <div className="flex w-full min-w-0 flex-row gap-3">
                                            {newsletterPayOnceEnabled && newsletterPayOnceUsd > 0 ? (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="lg"
                                                        onClick={onClose}
                                                        className="min-h-11 flex-1 touch-manipulation text-base font-semibold"
                                                    >
                                                        Not now
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={newsletterCheckoutPending}
                                                        onClick={startNewsletterProCheckout}
                                                        className="min-h-11 flex-1 touch-manipulation bg-gradient-to-r from-amber-600 to-orange-600 text-base font-semibold text-white hover:from-amber-700 hover:to-orange-700"
                                                        size="lg"
                                                    >
                                                        {newsletterCheckoutPending ? 'Opening…' : 'Pay'}
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="lg"
                                                    onClick={onClose}
                                                    className="min-h-11 w-full touch-manipulation text-base font-semibold"
                                                >
                                                    Not now
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
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
                                    )
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

