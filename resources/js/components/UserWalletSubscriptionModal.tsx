"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Wallet, Sparkles, CheckCircle2, ArrowRight, Gift, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'
import { showErrorToast } from '@/lib/toast'
import { walletFetch } from '@/components/wallet/utils'

interface Plan {
    id: number
    name: string
    price: number
    one_time_fee?: number | null
    frequency: string
    is_popular?: boolean
    description?: string
    trial_days?: number
    savings?: number | null
}

interface UserWalletSubscriptionModalProps {
    isOpen: boolean
    onClose: () => void
}

export function UserWalletSubscriptionModal({ isOpen, onClose }: UserWalletSubscriptionModalProps) {
    const [mounted, setMounted] = useState(false)
    const [plans, setPlans] = useState<Plan[]>([])
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubscribing, setIsSubscribing] = useState(false) // Keep internal state name for consistency

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Fetch plans when modal opens
    useEffect(() => {
        if (isOpen && plans.length === 0) {
            fetchPlans()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const fetchPlans = async () => {
        setIsLoading(true)
        try {
            const timestamp = Date.now()
            const response = await walletFetch(`/wallet/plans?t=${timestamp}`, {
                method: 'GET',
            })

            if (response.ok) {
                const data = await response.json()
                const plansData = data.plans || []
                
                if (plansData.length > 0) {
                    setPlans(plansData)
                    setSelectedPlan(plansData[0].id)
                } else {
                    setPlans([])
                    setSelectedPlan(null)
                    showErrorToast('No wallet plans available. Please contact support.')
                }
            } else {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || 'Failed to fetch plans')
            }
        } catch (error) {
            setPlans([])
            setSelectedPlan(null)
            const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet plans. Please try again later.'
            showErrorToast(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubscribe = () => {
        if (!selectedPlan) {
            showErrorToast('Please select a plan')
            return
        }

        setIsSubscribing(true)

        router.post(`/wallet/subscribe/${selectedPlan}`, {}, {
            preserveState: true,
            preserveScroll: true,
            only: [],
            onError: (errors) => {
                const errorMessage = errors.message || errors.error || 'Failed to become a member. Please try again.'
                showErrorToast(errorMessage)
                setIsSubscribing(false)
            },
            onFinish: () => {
                // Reset loading state if redirect doesn't happen
                setIsSubscribing(false)
            }
        })
    }

    if (!mounted) return null

    const modalContent = (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    key="modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal - Perfectly Centered */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 30 
                        }}
                        className="relative z-10 w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg hover:bg-muted transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {/* Content */}
                        <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
                            {/* Icon and Title */}
                            <div className="flex flex-col items-center text-center mb-4">
                                <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-3">
                                    <Wallet className="h-8 w-8 text-primary" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground mb-1.5">
                                    Owner Platform Access Fee
                                </h2>
                                <div className="text-muted-foreground text-xs leading-relaxed">
                                    <p>Covers identity verification, secure accounts, and the tools owners use to earn, pay, and support each other — while keeping fees low for the community.</p>
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-xs text-foreground mb-3 flex items-center gap-2">
                                    <Gift className="h-3.5 w-3.5 text-primary" />
                                    Choose Your Plan
                                </h3>
                                
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : plans.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <p className="text-sm text-muted-foreground mb-2">No wallet plans available</p>
                                        <p className="text-xs text-muted-foreground">Please contact support for assistance.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {plans.map((plan) => {
                                            const isSelected = selectedPlan === plan.id
                                            const isMonthly = plan.frequency === 'monthly'
                                            const isAnnual = plan.frequency === 'annually'
                                            
                                            return (
                                                <motion.div
                                                    key={plan.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: plan.id * 0.1 }}
                                                    onClick={() => setSelectedPlan(plan.id)}
                                                    className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'border-primary bg-primary/10 dark:bg-primary/20 shadow-lg ring-2 ring-primary/20'
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                                        </div>
                                                    )}
                                                    
                                                    <div className="text-center">
                                                        <p className="text-xs font-semibold text-foreground mb-1.5">
                                                            {isMonthly ? 'Monthly' : isAnnual ? 'Annual' : plan.name}
                                                        </p>
                                                        <div className="flex items-baseline justify-center gap-0.5 mb-1">
                                                            <span className="text-lg font-bold text-primary">
                                                                ${plan.price.toFixed(2)}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                /{isMonthly ? 'mo' : 'yr'}
                                                            </span>
                                                        </div>
                                                        {(plan.one_time_fee !== null && plan.one_time_fee !== undefined && Number(plan.one_time_fee) > 0) && (
                                                            <div className="mb-1.5">
                                                                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                                    + ${Number(plan.one_time_fee).toFixed(2)} setup fee
                                                                </p>
                                                            </div>
                                                        )}
                                                        {plan.description && (
                                                            <p className="text-[10px] text-muted-foreground mt-1 px-1 text-center leading-relaxed">
                                                                {plan.description}
                                                            </p>
                                                        )}
                                                        {plan.trial_days && plan.trial_days > 0 && (
                                                            <div className="mt-1.5">
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                                                    {plan.trial_days} Day Free
                                                                </span>
                                                            </div>
                                                        )}
                                                        {plan.savings && plan.savings > 0 && (
                                                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-medium">
                                                                Save ${plan.savings.toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Features List */}
                            <div className="bg-muted/50 rounded-lg p-3 mb-4">
                                <h3 className="font-semibold text-xs text-foreground mb-2 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    What You'll Get:
                                </h3>
                                <ul className="space-y-1.5">
                                    <li className="flex items-center gap-1.5 text-xs text-foreground">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        <span>Access to Digital Wallet</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-xs text-foreground">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        <span>Send and receive payments</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-xs text-foreground">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        <span>Manage your funds securely</span>
                                    </li>
                                    <li className="flex items-center gap-1.5 text-xs text-foreground">
                                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                                        <span>Track all transactions</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={handleSubscribe}
                                    disabled={!selectedPlan || isSubscribing || isLoading}
                                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-white font-semibold py-2.5 text-sm"
                                >
                                    {isSubscribing ? (
                                        <>
                                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <span>Become a Member</span>
                                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="flex-1 py-2.5 text-sm"
                                    disabled={isSubscribing}
                                >
                                    Maybe Later
                                </Button>
                            </div>

                            {/* Additional Info */}
                            {plans.length > 0 && plans.some(p => p.trial_days && p.trial_days > 0) && (
                            <p className="text-[10px] text-center text-muted-foreground mt-3">
                                    💡 Start with a {Math.max(...plans.filter(p => p.trial_days).map(p => p.trial_days || 0))}-day free trial membership!
                            </p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}

