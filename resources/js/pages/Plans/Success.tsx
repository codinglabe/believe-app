"use client"

import { Head, Link } from "@inertiajs/react"
import React from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function PlansSuccess() {
    return (
        <AppSidebarLayout>
            <Head title="Subscription Successful - BelieveInUnity.org" />
            
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 rounded-xl py-4 px-4 md:py-6 md:px-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-md w-full"
                >
                    <Card className="border-2 border-primary/20">
                        <CardContent className="pt-6 pb-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <CheckCircle className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold mb-2">
                                        Subscription Started Successfully!
                                    </h1>
                                    <p className="text-muted-foreground mb-4">
                                        Your 14-day free trial has begun. You now have full access to all plan features.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Your subscription will automatically continue after the trial period ends.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full">
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
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </AppSidebarLayout>
    )
}

























