"use client"

import { Head, router } from "@inertiajs/react"
import React, { useState } from "react"
import AppSidebarLayout from "@/layouts/app/app-sidebar-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Check,
  ArrowRight,
  Lock,
  Video,
  MessageCircle,
  ShoppingBag,
  Star,
  Feather,
  Building2,
  X,
} from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"
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
  type: string
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

interface OneTimeFee {
  label: string
  amount: string
}

interface PlansIndexProps {
  plans: Plan[]
  addOns: AddOn[]
  currentPlan?: CurrentPlan | null
  oneTimeFee?: OneTimeFee | null
}

function getPlanIcon(name: string) {
  const n = name.toLowerCase()
  if (n.includes("pro") || n.includes("impact")) return Building2
  if (n.includes("community")) return Star
  return Feather
}

export default function PlansIndex({ plans, addOns, currentPlan, oneTimeFee }: PlansIndexProps) {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleSubscribe = (planId: number) => {
    router.post(`/plans/${planId}/subscribe`)
  }

  const handleConfirmCancel = () => {
    setIsCancelling(true)
    router.post("/plans/cancel", {}, {
      onFinish: () => {
        setIsCancelling(false)
        setShowCancelModal(false)
      },
    })
  }

  // Unlimited features (shared across plans) for "Included Across All Plans"
  const unlimitedFeatures = plans.length > 0
    ? plans
        .flatMap((p) => p.features.filter((f) => f.is_unlimited))
        .filter((f, i, arr) => arr.findIndex((x) => x.name === f.name) === i)
        .map((f) => f.name)
    : []

  // Split into 3 columns for "Included Across All Plans"
  const colSize = Math.ceil(unlimitedFeatures.length / 3) || 1
  const includedCol1 = unlimitedFeatures.slice(0, colSize)
  const includedCol2 = unlimitedFeatures.slice(colSize, colSize * 2)
  const includedCol3 = unlimitedFeatures.slice(colSize * 2)

  const whyChoose = [
    "All-in-one nonprofit operating system",
    "Fundraising + engagement + commerce in one platform",
    "Built-in video conferencing & livestreaming",
    "Designed for modern mission-driven organizations",
  ]

  return (
    <AppSidebarLayout>
      <Head title="Pricing Plans for Organizations - Believe In Unity" />

      <div className="min-h-screen bg-background">
        {/* Title section — gradient header strip only, matches dashboard feel */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Pricing Plans for Organizations
            </h1>
            <p className="text-xl text-white/90">
              Simple. Transparent. Built for Impact.
            </p>
          </div>
        </div>

        {/* Subsidized Cost for Nonprofits + pricing cards */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-xl font-semibold text-center text-foreground mb-8">
            Subsidized Cost for Nonprofits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const IconComponent = getPlanIcon(plan.name)
              const isPopular = plan.is_popular
              const isCurrent = currentPlan?.id === plan.id
              const annualField = plan.custom_fields?.find(
                (f) => f.type === "text" && /annual|prepay|year/i.test(String(f.label + f.value))
              ) || plan.custom_fields?.find((f) => f.type === "currency" && f.key !== "ein_setup_fee")
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="h-full"
                >
                  <Card
                    className={`h-full flex flex-col rounded-xl border-2 overflow-hidden ${
                      isPopular
                        ? "border-primary bg-card shadow-lg ring-2 ring-primary/20 scale-[1.02]"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex justify-center mb-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                            isPopular ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <IconComponent className="h-6 w-6" />
                        </div>
                      </div>
                      <CardTitle className="text-2xl text-center text-foreground">
                        {plan.name}
                      </CardTitle>
                      <div className="flex flex-col items-center gap-1 mt-2">
                        <span className="text-3xl font-bold text-foreground">
                          ${Number(plan.price).toFixed(0)}/{plan.frequency === "monthly" ? "month" : plan.frequency}
                        </span>
                        {annualField && (
                          <span className="text-sm text-muted-foreground text-center">
                            {annualField.label}: {annualField.value}
                          </span>
                        )}
                        {plan.trial_days > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {plan.trial_days}-day free trial
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col pt-0">
                      <ul className="space-y-2.5 mb-6 flex-1">
                        {plan.features.map((feature) => (
                          <li key={feature.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                            <span className="text-foreground">{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                      {isCurrent ? (
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            size="lg"
                            disabled
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Current Plan
                          </Button>
                          <Button
                            className="w-full"
                            size="lg"
                            variant="destructive"
                            onClick={() => setShowCancelModal(true)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => handleSubscribe(plan.id)}
                        >
                          Get started
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* One-time fee bar */}
        {oneTimeFee && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="rounded-xl bg-muted/50 border border-border px-6 py-4 flex items-center justify-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                One-Time {oneTimeFee.label} • ${oneTimeFee.amount}
              </span>
            </div>
          </div>
        )}

        {/* Included Across All Plans — 3 columns */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Included Across All Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Unity Video Hub</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Built-in Video Conferencing & Livestreaming
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {includedCol1.map((name) => (
                  <li key={name} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{name}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Communication</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Push alerts, newsletters, and engagement
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {includedCol2.map((name) => (
                  <li key={name} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{name}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Commerce & Events</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Marketplace, donations, events, and campaigns
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {includedCol3.map((name) => (
                  <li key={name} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Why Organizations Choose */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-center text-foreground mb-8">
            Why Organizations Choose Believe In Unity
          </h2>
          <ul className="space-y-4">
            {whyChoose.map((item) => (
              <li key={item} className="flex items-center gap-3 text-muted-foreground">
                <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                <span className="text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer CTA */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center border-t border-border">
          <p className="text-lg text-muted-foreground">
            Start Today:{" "}
            <a
              href="/"
              className="font-semibold text-foreground underline hover:text-primary"
            >
              www.BelieveInUnity.org
            </a>
          </p>
        </div>
      </div>

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
