"use client"

import { Head, router } from "@inertiajs/react"
import React, { useState } from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { 
    Sparkles, 
    Check, 
    Star,
    Zap,
    Crown,
    ArrowRight,
    Mail,
    Bot,
    Shield,
    Users,
    Gift,
    Calendar,
    GraduationCap,
    ShoppingCart,
    Heart,
    Bell,
    FileText,
    X
} from "lucide-react"
import { motion } from "framer-motion"

interface PlanFeature {
    id: number
    name: string
    description: string | null
    icon: string | null
    is_unlimited: boolean
}

interface CustomField {
    key: string
    label: string
    value: string
    type: 'text' | 'number' | 'currency' | 'boolean'
    icon?: string
    description?: string
}

interface Plan {
    id: number
    name: string
    price: number
    frequency: string
    is_popular: boolean
    description: string | null
    trial_days: number
    custom_fields: CustomField[]
    features: PlanFeature[]
}

interface AddOn {
    name: string
    price: string
    description: string
}

interface CurrentPlan {
    id: number
    name: string
    price: number
    frequency: string
}

interface PlansIndexProps {
    plans: Plan[]
    addOns: AddOn[]
    currentPlan?: CurrentPlan | null
}

export default function PlansIndex({ plans, addOns, currentPlan }: PlansIndexProps) {
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)

    const handleSubscribe = (planId: number) => {
        router.post(`/plans/${planId}/subscribe`)
    }

    const handleCancelClick = () => {
        setShowCancelModal(true)
    }

    const handleConfirmCancel = () => {
        setIsCancelling(true)
        router.post('/plans/cancel', {}, {
            onFinish: () => {
                setIsCancelling(false)
                setShowCancelModal(false)
            }
        })
    }

    // Icon mapping function
    const getIconComponent = (iconName: string | null) => {
        if (!iconName) return Calendar
        
        const iconMap: Record<string, React.ComponentType<any>> = {
            Calendar, GraduationCap, Heart, ShoppingCart, FileText, Bell, Users,
            Mail, Bot, Shield, Gift, Sparkles, Star, Zap, Crown, ArrowRight
        }
        
        // Try exact match first
        if (iconMap[iconName]) {
            return iconMap[iconName]
        }
        
        // Try case-insensitive match
        const lowerName = iconName.toLowerCase()
        for (const [key, value] of Object.entries(iconMap)) {
            if (key.toLowerCase() === lowerName) {
                return value
            }
        }
        
        return Calendar // Default fallback
    }

    // Get all unlimited features from all plans
    const unlimitedFeatures = plans
        .flatMap(plan => plan.features.filter(f => f.is_unlimited))
        .filter((feature, index, self) => 
            index === self.findIndex(f => f.name === feature.name)
        )
        .map(feature => {
            const IconComponent = getIconComponent(feature.icon)
            return {
                icon: IconComponent,
                text: feature.name,
                description: feature.description
            }
        })

    // If no unlimited features in database, use default
    const defaultUnlimitedFeatures = [
        { icon: Calendar, text: "Unlimited Events", description: null },
        { icon: GraduationCap, text: "Unlimited Courses", description: null },
        { icon: Heart, text: "Unlimited Donations", description: null },
        { icon: ShoppingCart, text: "Unlimited Marketplace", description: null },
        { icon: FileText, text: "Unlimited Campaign Pages", description: null },
        { icon: Bell, text: "Unlimited Push Newsletter Alerts (FREE)", description: null },
        { icon: Users, text: "Unlimited Volunteer Management & Groups", description: null },
    ]

    const displayFeatures = unlimitedFeatures.length > 0 ? unlimitedFeatures : defaultUnlimitedFeatures

    const getPlanIcon = (name: string) => {
        const nameLower = name.toLowerCase()
        if (nameLower.includes('pro')) {
            return <Crown className="h-6 w-6" />
        } else if (nameLower.includes('community')) {
            return <Star className="h-6 w-6" />
        }
        return <Zap className="h-6 w-6" />
    }

    const getPlanColor = (name: string) => {
        const nameLower = name.toLowerCase()
        if (nameLower.includes('pro')) {
            return "from-purple-500 to-pink-500"
        } else if (nameLower.includes('community')) {
            return "from-blue-500 to-indigo-500"
        }
        return "from-green-500 to-emerald-500"
    }

    return (
        <AppSidebarLayout>
            <Head title="Upgrade Plans - BelieveInUnity.org" />
            
            <div className="flex h-full flex-1 flex-col gap-8 rounded-xl py-4 px-4 md:py-6 md:px-10">
                {/* Header */}
                <motion.div 
                    className="text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-7 w-7 text-primary" />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold">
                            BelieveInUnity.org Pricing
                        </h1>
                    </div>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-2">
                        Unlimited Mission Tools. Pay Only for Growth.
                    </p>
                    <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
                        Everything Your Nonprofit Needs — Just $9 to Start
                    </p>
                </motion.div>

                {/* Unlimited Features */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
                        <CardHeader>
                            <CardTitle className="text-center text-2xl mb-2">
                                ✨ Unlimited Features (All Plans)
                            </CardTitle>
                            <CardDescription className="text-center">
                                These powerful tools are included with every plan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {displayFeatures.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                                        <feature.icon className="h-5 w-5 text-primary flex-shrink-0" />
                                        <div>
                                            <span className="text-sm font-medium">{feature.text}</span>
                                            {feature.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Current Plan Status */}
                {currentPlan && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="max-w-2xl mx-auto"
                    >
                        <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 dark:from-green-500/20 dark:via-green-500/10 dark:to-green-500/20 border-green-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <Check className="h-6 w-6 text-green-500" />
                                    <h3 className="text-2xl font-bold">
                                        You're Subscribed!
                                    </h3>
                                </div>
                                <p className="text-center text-lg text-muted-foreground mb-4">
                                    You're currently on the <span className="font-semibold text-foreground">{currentPlan.name}</span> plan
                                </p>
                                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <span>${currentPlan.price}</span>
                                    <span>/</span>
                                    <span>{currentPlan.frequency}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Plans Grid */}
                <div>
                    <h2 className="text-2xl font-bold text-center mb-6">
                        ⭐ Subscription Tiers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
                        {plans.map((plan, index) => (
                            <motion.div
                                key={plan.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                whileHover={{ y: -5 }}
                                className="h-full"
                            >
                                <Card className={`h-full flex flex-col border-2 transition-all duration-300 ${
                                    plan.is_popular
                                        ? 'border-primary shadow-xl scale-105 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5'
                                        : 'border-border hover:border-primary/50'
                                }`}>
                                    <CardHeader className="pb-4">
                                        {plan.is_popular && (
                                            <div className="flex justify-center mb-3">
                                                <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
                                                    Most Popular
                                                </Badge>
                                            </div>
                                        )}
                                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getPlanColor(plan.name)} flex items-center justify-center text-white mb-4 mx-auto`}>
                                            {getPlanIcon(plan.name)}
                                        </div>
                                        <CardTitle className="text-2xl text-center mb-2">{plan.name}</CardTitle>
                                        <div className="flex items-baseline justify-center gap-1 mb-2">
                                            <span className="text-4xl font-bold">${plan.price}</span>
                                            <span className="text-muted-foreground text-sm">/{plan.frequency}</span>
                                        </div>
                                        {plan.trial_days && plan.trial_days > 0 && (
                                            <div className="mb-4 px-2">
                                                <p className="text-sm font-semibold text-primary text-center">
                                                    {plan.trial_days} day{plan.trial_days !== 1 ? 's' : ''} free trial
                                                </p>
                                            </div>
                                        )}
                                        {plan.description && (
                                            <div className="mb-4 px-2">
                                                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                                                    {plan.description}
                                                </p>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col">
                                        <div className="space-y-4 mb-6 flex-1">
                                            {/* Dynamic Custom Fields */}
                                            {plan.custom_fields && plan.custom_fields.length > 0 && plan.custom_fields.map((field) => {
                                                // Get icon component
                                                const getIconComponent = (iconName: string | undefined) => {
                                                    if (!iconName) return Mail
                                                    const iconMap: Record<string, React.ComponentType<any>> = {
                                                        Mail, Bot, Shield, Users, Calendar, GraduationCap, Heart, ShoppingCart, FileText, Bell, Gift, Sparkles, Star, Zap, Crown
                                                    }
                                                    const lowerName = iconName.toLowerCase()
                                                    for (const [key, value] of Object.entries(iconMap)) {
                                                        if (key.toLowerCase() === lowerName) {
                                                            return value
                                                        }
                                                    }
                                                    return Mail
                                                }
                                                
                                                const IconComponent = getIconComponent(field.icon)
                                                
                                                return (
                                                    <div key={field.key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                                        <IconComponent className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-sm">{field.label}</p>
                                                            {field.type === 'number' && field.description ? (
                                                                <p className="text-xs text-muted-foreground">{field.description}</p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">{field.value}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        {currentPlan && currentPlan.id === plan.id ? (
                                            <div className="space-y-2">
                                                <Button 
                                                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                                                    size="lg"
                                                    disabled
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    <span>Current Plan</span>
                                                </Button>
                                                <Button 
                                                    className="w-full bg-destructive hover:bg-destructive/90 text-white"
                                                    size="lg"
                                                    onClick={handleCancelClick}
                                                    variant="destructive"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    <span>Cancel Subscription</span>
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button 
                                                className={`w-full ${
                                                    plan.is_popular
                                                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                                        : 'bg-primary/90 hover:bg-primary text-primary-foreground'
                                                }`}
                                                size="lg"
                                                onClick={() => handleSubscribe(plan.id)}
                                            >
                                                <span>{currentPlan ? 'Switch Plan' : 'Get Started'}</span>
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Usage-Based Add-Ons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center text-2xl mb-2">
                                🔁 Usage-Based Add-Ons
                            </CardTitle>
                            <CardDescription className="text-center">
                                Scale your outreach as you grow
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {addOns.map((addOn, idx) => (
                                    <div key={idx} className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h4 className="font-semibold text-sm">{addOn.name}</h4>
                                            <Badge variant="outline" className="text-xs">
                                                {addOn.price}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{addOn.description}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Value Message */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="text-center"
                >
                    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 dark:from-primary/20 dark:via-primary/10 dark:to-primary/20 border-primary/30">
                        <CardContent className="pt-6">
                            <h3 className="text-2xl font-bold mb-2">
                                Unlimited Impact.
                            </h3>
                            <p className="text-lg text-muted-foreground">
                                Only pay when you grow your outreach.
                            </p>
                            <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-4 w-4 text-primary" />
                                    <span>Push = Free</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span>Email = Revenue driver</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-primary" />
                                    <span>AI = Revenue driver</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Cancel Subscription Confirmation Modal */}
            <ConfirmationModal
                isOpen={showCancelModal}
                onChange={setShowCancelModal}
                title="Cancel Subscription"
                description="Are you sure you want to cancel your subscription? This action cannot be undone and no refund will be issued."
                confirmLabel="Yes, Cancel Subscription"
                cancelLabel="Keep Subscription"
                onConfirm={handleConfirmCancel}
                isLoading={isCancelling}
            />
        </AppSidebarLayout>
    )
}
