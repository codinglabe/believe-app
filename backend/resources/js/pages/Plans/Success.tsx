"use client"

import { Head, Link, usePage } from "@inertiajs/react"
import React from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight, Wallet } from "lucide-react"
import { motion } from "framer-motion"

interface PlansSuccessProps {
    successMessage?: string
    isWalletSubscription?: boolean
}

export default function PlansSuccess({ successMessage }: PlansSuccessProps) {
    const { url } = usePage()
    // Check if this is a wallet subscription success page
    const isWalletSubscription = url?.includes('/wallet/subscription/success') || successMessage?.toLowerCase().includes('wallet')
    
    // Use FrontendLayout for wallet subscription, AppSidebarLayout for regular plans
    const Layout = isWalletSubscription ? FrontendLayout : AppSidebarLayout
    
    return (
        <Layout>
            <Head title={isWalletSubscription ? "Wallet Subscription Successful - BelieveInUnity.org" : "Subscription Successful - BelieveInUnity.org"} />
            
            <div className={isWalletSubscription ? "min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4" : "flex h-full flex-1 flex-col items-center justify-center gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10"}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md w-full"
                >
                    <Card className="border-2 border-primary/20">
                        <CardContent className="pt-6 pb-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="relative inline-block"
                                >
                                    {isWalletSubscription && (
                                        <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
                                    )}
                                    <div className={`w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ${isWalletSubscription ? 'relative z-10' : ''}`}>
                                        {isWalletSubscription ? (
                                            <Wallet className="h-10 w-10 text-green-500" />
                                        ) : (
                                    <CheckCircle className="h-10 w-10 text-primary" />
                                        )}
                                </div>
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl font-bold mb-2">
                                        {isWalletSubscription ? "Wallet Subscription Activated!" : "Subscription Started Successfully!"}
                                    </h1>
                                    {successMessage && (
                                        <p className="text-primary font-semibold mb-2">
                                            {successMessage}
                                        </p>
                                    )}
                                    {!isWalletSubscription && (
                                        <>
                                    <p className="text-muted-foreground mb-4">
                                        Your 14-day free trial has begun. You now have full access to all plan features.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Your subscription will automatically continue after the trial period ends.
                                    </p>
                                        </>
                                    )}
                                    {isWalletSubscription && (
                                        <p className="text-muted-foreground mb-4">
                                            You can now access your digital wallet and start using all wallet features.
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-3 w-full">
                                    {isWalletSubscription ? (
                                        <>
                                            <Link href="/" className="flex-1">
                                                <Button variant="outline" className="w-full">
                                                    Back to Home
                                                </Button>
                                            </Link>
                                            <Button 
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={() => {
                                                    // Close any modals and refresh the page to show wallet
                                                    window.location.href = '/'
                                                }}
                                            >
                                                Open Wallet
                                                <ArrowRight className="h-4 w-4 ml-2" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                    <Link href="/dashboard" className="flex-1">
                                        <Button className="w-full">
                                            Go to Dashboard
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                    <Link href="/plans" className="flex-1">
                                        <Button variant="outline" className="w-full">
                                            View Plans
                                        </Button>
                                    </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </Layout>
    )
}































