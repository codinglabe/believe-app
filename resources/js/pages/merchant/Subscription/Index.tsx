import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { motion } from 'framer-motion'
import { Crown, Check, Sparkles, ArrowRight, Zap, X } from 'lucide-react'
import { MerchantDashboardLayout } from '@/components/merchant'
import { MerchantCard, MerchantCardContent, MerchantCardHeader, MerchantCardTitle } from '@/components/merchant-ui'
import { MerchantButton } from '@/components/merchant-ui'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface CustomField {
    key: string
    label: string
    value: string
    type: string
}

interface Plan {
    id: number
    name: string
    price: number
    frequency: string
    is_popular: boolean
    description: string
    trial_days: number
    custom_fields: CustomField[]
}

interface CurrentPlan {
    id: number
    name: string
    price: number
    frequency: string
}

interface Props {
    plans: Plan[]
    currentPlan?: CurrentPlan | null
    hasActiveSubscription: boolean
    subscriptionEndsAt?: string | null
    isCanceled?: boolean
}

export default function MerchantSubscriptionIndex({ 
    plans, 
    currentPlan, 
    hasActiveSubscription,
    subscriptionEndsAt,
    isCanceled 
}: Props) {
    const [cancelingSubscription, setCancelingSubscription] = useState(false)
    const [showCancelConfirm, setShowCancelConfirm] = useState(false)

    const handleSubscribe = (planId: number) => {
        router.post(`/subscription/${planId}/subscribe`)
    }

    const handleCancelSubscription = () => {
        setCancelingSubscription(true)
        router.post('/subscription/cancel', {}, {
            onSuccess: () => {
                setShowCancelConfirm(false)
                showSuccessToast('Subscription cancelled successfully. It will remain active until the end of the billing period.')
            },
            onError: (errors) => {
                console.error('Failed to cancel subscription:', errors)
                showErrorToast('Failed to cancel subscription. Please try again.')
            },
            onFinish: () => {
                setCancelingSubscription(false)
            }
        })
    }

    return (
        <>
            <Head title="Subscription Plans" />
            <MerchantDashboardLayout>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-12"
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="p-3 bg-gradient-to-br from-[#FF1493] via-[#DC143C] to-[#E97451] rounded-full">
                                <Crown className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-white">
                                Choose Your Plan
                            </h1>
                        </div>
                        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                            Select the perfect subscription plan for your business needs
                        </p>
                    </motion.div>

                    {/* Current Plan Badge */}
                    {hasActiveSubscription && currentPlan && !isCanceled && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8"
                        >
                            <div className="max-w-2xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-br from-[#FF1493]/10 via-[#DC143C]/10 to-[#E97451]/10 border border-[#FF1493]/20 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-5 h-5 text-green-400" />
                                        <div>
                                            <span className="text-green-400 font-medium">
                                                Current Plan: {currentPlan.name}
                                            </span>
                                            {subscriptionEndsAt && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Cancels on: {new Date(subscriptionEndsAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {!subscriptionEndsAt && (
                                        <>
                                            {!showCancelConfirm ? (
                                                <MerchantButton
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                    onClick={() => setShowCancelConfirm(true)}
                                                >
                                                    <X className="w-4 h-4 mr-2" />
                                                    Cancel Subscription
                                                </MerchantButton>
                                            ) : (
                                                <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 min-w-[200px]">
                                                    <p className="text-xs text-gray-300 mb-2">
                                                        Are you sure? Your subscription will remain active until the end of the billing period.
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <MerchantButton
                                                            size="sm"
                                                            className="flex-1 bg-red-500 hover:bg-red-600"
                                                            onClick={handleCancelSubscription}
                                                            disabled={cancelingSubscription}
                                                        >
                                                            {cancelingSubscription ? 'Canceling...' : 'Confirm'}
                                                        </MerchantButton>
                                                        <MerchantButton
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => setShowCancelConfirm(false)}
                                                            disabled={cancelingSubscription}
                                                        >
                                                            Keep
                                                        </MerchantButton>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
                        {plans.map((plan, index) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <MerchantCard
                                    className={`h-full flex flex-col relative overflow-hidden ${
                                        plan.is_popular
                                            ? 'border-2 border-[#FF1493] shadow-lg shadow-[#FF1493]/50'
                                            : ''
                                    }`}
                                >
                                    {/* Popular Badge */}
                                    {plan.is_popular && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] text-white px-4 py-1 text-xs font-semibold rounded-bl-lg rounded-tr-lg">
                                            Most Popular
                                        </div>
                                    )}

                                    <MerchantCardHeader className="pb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <MerchantCardTitle className="text-2xl text-white">
                                                {plan.name}
                                            </MerchantCardTitle>
                                            {plan.is_popular && (
                                                <Sparkles className="w-5 h-5 text-[#FF1493]" />
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm">{plan.description}</p>
                                    </MerchantCardHeader>

                                    <MerchantCardContent className="flex-1 flex flex-col">
                                        {/* Price */}
                                        <div className="mb-6">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-bold text-white">
                                                    ${plan.price}
                                                </span>
                                                <span className="text-gray-400">
                                                    /{plan.frequency === 'monthly' ? 'mo' : 'yr'}
                                                </span>
                                            </div>
                                            {plan.trial_days > 0 && (
                                                <p className="text-sm text-gray-400 mt-2">
                                                    {plan.trial_days} days free trial
                                                </p>
                                            )}
                                        </div>

                                        {/* Custom Fields */}
                                        {plan.custom_fields && plan.custom_fields.length > 0 && (
                                            <div className="space-y-3 mb-6 flex-1">
                                                {plan.custom_fields.map((field, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
                                                    >
                                                        <span className="text-sm text-gray-300">
                                                            {field.label}
                                                        </span>
                                                        <span className="text-sm font-semibold text-white">
                                                            {field.value}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Subscribe Button */}
                            <MerchantButton
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={hasActiveSubscription && currentPlan?.id === plan.id}
                                className={`w-full mt-auto ${
                                    plan.is_popular
                                        ? 'bg-gradient-to-r from-[#FF1493] via-[#DC143C] to-[#E97451] hover:from-[#FF1493]/90 hover:via-[#DC143C]/90 hover:to-[#E97451]/90 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                                } ${hasActiveSubscription && currentPlan?.id === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {hasActiveSubscription && currentPlan?.id === plan.id
                                    ? 'Current Plan'
                                    : 'Subscribe Now'}
                                {plan.is_popular && !(hasActiveSubscription && currentPlan?.id === plan.id) && (
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                )}
                            </MerchantButton>
                                    </MerchantCardContent>
                                </MerchantCard>
                            </motion.div>
                        ))}
                    </div>

                    {/* Features Info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center"
                    >
                        <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
                            <Zap className="w-4 h-4" />
                            <span>All plans include access to all features</span>
                        </div>
                    </motion.div>
                </div>
            </MerchantDashboardLayout>
        </>
    )
}
