"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Wallet, Sparkles, CheckCircle2, ArrowRight, Gift, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'
import { showSuccessToast, showErrorToast } from '@/lib/toast'
import { getCsrfToken } from '@/components/wallet/utils'

interface Plan {
    id: number
    name: string
    price: number
    one_time_fee?: number | null
    frequency: string
    is_popular?: boolean
    description?: string
    trial_days?: number
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
    }, [isOpen])

    const fetchPlans = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/wallet/plans', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            })

            if (response.ok) {
                const data = await response.json()
                const plansData = data.plans || []
                
                // Debug: Log plans data to check one_time_fee
                console.log('Plans data received:', plansData)
                
                if (plansData.length > 0) {
                    setPlans(plansData)
                    // Auto-select first plan if available
                    setSelectedPlan(plansData[0].id)
                } else {
                    // Fallback to default plans if no plans found
                    setPlans([
                        { id: 1, name: 'Monthly', price: 3.00, frequency: 'monthly', trial_days: 14 },
                        { id: 2, name: 'Annual', price: 30, frequency: 'annually', trial_days: 14 },
                    ])
                    setSelectedPlan(1)
                }
            } else {
                throw new Error('Failed to fetch plans')
            }
        } catch (error) {
            console.error('Failed to fetch plans:', error)
            // Fallback to default plans if API fails
            setPlans([
                { id: 1, name: 'Monthly', price: 3.00, frequency: 'monthly', trial_days: 14 },
                { id: 2, name: 'Annual', price: 30, frequency: 'annually', trial_days: 14 },
            ])
            setSelectedPlan(1)
        } finally {
            setIsLoading(false)
        }
    }


    // Helper function to refresh CSRF token by making a GET request
    const refreshCsrfToken = async (): Promise<string> => {
        try {
            // Make a simple GET request to refresh the session and get CSRF token
            await fetch('/wallet/plans', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })
            // Try to get token again after the request
            return getCsrfToken()
        } catch (e) {
            console.warn('Failed to refresh CSRF token:', e)
            return ''
        }
    }

    const handleSubscribe = async () => {
        if (!selectedPlan) {
            showErrorToast('Please select a plan')
            return
        }

        setIsSubscribing(true) // Internal state name
        try {
            // Get CSRF token with validation - try multiple times if needed
            let csrfToken = getCsrfToken()

            // If token is missing, try to refresh it
            if (!csrfToken) {
                csrfToken = await refreshCsrfToken()
            }

            if (!csrfToken) {
                showErrorToast('CSRF token not found. Please refresh the page and try again.')
                setIsSubscribing(false)
                setTimeout(() => {
                    window.location.reload()
                }, 2000)
                return
            }

            const response = await fetch(`/wallet/subscribe/${selectedPlan}`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
                cache: 'no-store',
            })

            // Check if response is OK - handle CSRF token mismatch
            if (!response.ok) {
                const contentType = response.headers.get('content-type')
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json()
                    
                    // If CSRF token mismatch, try refreshing and retrying once
                    if (response.status === 419 || errorData.message?.includes('CSRF') || errorData.message?.includes('419')) {
                        console.warn('CSRF token mismatch detected, refreshing token and retrying...')
                        
                        // Refresh token
                        const newToken = await refreshCsrfToken()
                        if (newToken) {
                            // Retry the request with fresh token
                            const retryResponse = await fetch(`/wallet/subscribe/${selectedPlan}`, {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                    'X-CSRF-TOKEN': newToken,
                                    'X-Requested-With': 'XMLHttpRequest',
                                },
                                credentials: 'include',
                                cache: 'no-store',
                            })

                            if (retryResponse.ok) {
                                const retryData = await retryResponse.json()
                                if (retryData.success && retryData.url) {
                                    // Redirect to Stripe checkout
                                    window.location.href = retryData.url
                                    return
                                }
                            }
                        }
                        
                        // If retry failed, show error and reload
                        showErrorToast('Session expired. Please refresh the page and try again.')
                        setIsSubscribing(false)
                        setTimeout(() => {
                            window.location.reload()
                        }, 2000)
                        return
                    }
                }
                
                // Handle other errors
                const errorData = await response.json().catch(() => ({ message: 'Failed to become a member. Please try again.' }))
                showErrorToast(errorData.message || 'Failed to become a member. Please try again.')
                setIsSubscribing(false)
                return
            }

            const data = await response.json()

            if (data.success && data.url) {
                // Redirect to Stripe checkout
                window.location.href = data.url
            } else {
                showErrorToast(data.message || 'Failed to become a member. Please try again.')
                setIsSubscribing(false)
            }
        } catch (error) {
            console.error('Membership error:', error)
            showErrorToast('Failed to become a member. Please try again.')
            setIsSubscribing(false)
        }
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
                                <div className="text-muted-foreground text-xs leading-relaxed space-y-1">
                                    <p>One‑line explainer (always directly under it)</p>
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
                                                        {isAnnual && (
                                                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-medium">
                                                                Save ${(3.00 * 12 - 30).toFixed(2)}
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
                            <p className="text-[10px] text-center text-muted-foreground mt-3">
                                💡 Start with a 14-day free trial membership!
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}

