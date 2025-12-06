"use client"

import { Head, Link, router } from "@inertiajs/react"
import React from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Sparkles, 
    Star,
    Zap,
    Crown,
    ArrowLeft,
    ArrowRight,
    Mail,
    Bot,
    Shield,
    Users,
    Calendar,
    GraduationCap,
    ShoppingCart,
    Heart,
    Bell,
    FileText,
    Check,
    Gift
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
    stripe_price_id: string | null
    features: PlanFeature[]
}

interface PlansShowProps {
    plan: Plan
}

export default function PlansShow({ plan }: PlansShowProps) {
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

    const handleSubscribe = () => {
        router.post(`/plans/${plan.id}/subscribe`)
    }

    return (
        <AppSidebarLayout>
            <Head title={`${plan.name} Plan - BelieveInUnity.org`} />
            
            <div className="flex h-full flex-1 flex-col gap-4 sm:gap-6 md:gap-8 rounded-xl py-3 px-3 sm:py-4 sm:px-4 md:py-6 md:px-6 lg:px-10">
                {/* Back Button */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <Link href="/plans">
                        <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Back to Plans</span>
                            <span className="sm:hidden">Back</span>
                        </Button>
                    </Link>
                </div>

                {/* Plan Details - Full Width Two Column Layout */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-5 md:gap-6 w-full items-start">
                        {/* Left Side - Plan Information */}
                        <Card className={`border-2 transition-all duration-300 h-fit ${
                            plan.is_popular
                                ? 'border-primary shadow-xl bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5'
                                : 'border-border'
                        }`}>
                            <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
                                {plan.is_popular && (
                                    <div className="flex justify-start mb-2 sm:mb-3">
                                        <Badge className="bg-primary text-primary-foreground text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${getPlanColor(plan.name)} flex items-center justify-center text-white mb-3 sm:mb-4`}>
                                    {getPlanIcon(plan.name)}
                                </div>
                                <CardTitle className="text-2xl sm:text-3xl md:text-3xl mb-2">{plan.name}</CardTitle>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground text-sm sm:text-base md:text-lg">/{plan.frequency}</span>
                                </div>
                                {plan.trial_days > 0 && (
                                    <div className="mb-3 sm:mb-4">
                                        <p className="text-sm sm:text-base font-medium text-primary">
                                            {plan.trial_days} day{plan.trial_days !== 1 ? 's' : ''} free trial
                                        </p>
                                    </div>
                                )}
                                {plan.description && (
                                    <div className="mb-3 sm:mb-4">
                                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                                            {plan.description}
                                        </p>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="px-3 sm:px-6">
                                {/* Custom Fields */}
                                {plan.custom_fields && plan.custom_fields.length > 0 && (
                                    <div className="space-y-2 sm:space-y-3">
                                        <h3 className="text-base sm:text-lg font-semibold">What's Included:</h3>
                                        {plan.custom_fields.map((field) => {
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
                                                <div key={field.key} className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-muted/50">
                                                    <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-xs sm:text-sm">{field.label}</p>
                                                        <p className="text-xs text-muted-foreground break-words">{field.value}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Right Side - Features and Button */}
                        <Card className="border-2 border-border h-fit">
                            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 space-y-4 sm:space-y-6">
                                {/* Features */}
                                {plan.features && plan.features.length > 0 && (
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Features:</h3>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            {plan.features.map((feature) => (
                                                <div key={feature.id} className="flex items-start gap-2">
                                                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0 mt-0.5" />
                                                    <span className="text-xs sm:text-sm text-foreground leading-relaxed break-words">{feature.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Subscribe Button */}
                                <div className="pt-3 sm:pt-4 border-t">
                                    <Button 
                                        onClick={handleSubscribe}
                                        className={`w-full h-10 sm:h-11 md:h-12 text-xs sm:text-sm md:text-base ${
                                            plan.is_popular
                                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                                : 'bg-secondary hover:bg-secondary/80'
                                        }`}
                                    >
                                        <span>
                                            {plan.trial_days > 0 
                                                ? `Start ${plan.trial_days}-Day Free Trial`
                                                : 'Subscribe Now'}
                                        </span>
                                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
                                    </Button>
                                    {plan.trial_days > 0 && (
                                        <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                                            No credit card required for trial. Cancel anytime.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            </div>
        </AppSidebarLayout>
    )
}

