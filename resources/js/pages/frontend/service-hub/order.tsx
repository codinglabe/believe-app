"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Badge } from "@/components/frontend/ui/badge"
import { Separator } from "@/components/frontend/ui/separator"
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Check,
  Package,
  Clock,
  Shield,
  Sparkles,
  FileText,
  MessageSquare,
  Wallet,
  CheckCircle2,
  Star,
  Zap,
  Gift,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { Link, router, usePage } from "@inertiajs/react"
import React, { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
import axios from "axios"

interface Gig {
  id: number
  slug: string
  title: string
  image: string | null
  seller: {
    id: number
    name: string
    avatar: string | null
    rating: number
  }
}

interface Package {
  id: number
  name: string
  price: number
  deliveryTime: string
  features: string[]
}

interface State {
  state: string
  state_code: string
  base_sales_tax_rate: number
}

interface PageProps extends Record<string, unknown> {
  gig: Gig & {
    accepts_believe_points?: boolean
  }
  package: Package
  userBelievePoints?: number
  pointsRequired?: number
  hasEnoughPoints?: boolean
}

export default function ServiceOrder() {
  const { gig, package: selectedPackage, userBelievePoints: userBelievePointsProp = 0, pointsRequired: pointsRequiredProp = 0, hasEnoughPoints: hasEnoughPointsProp = false } = usePage<PageProps>().props

  // Ensure values are numbers
  const userBelievePoints = typeof userBelievePointsProp === 'number' ? userBelievePointsProp : parseFloat(userBelievePointsProp) || 0
  const pointsRequired = typeof pointsRequiredProp === 'number' ? pointsRequiredProp : parseFloat(pointsRequiredProp) || 0
  const hasEnoughPoints = hasEnoughPointsProp && userBelievePoints >= pointsRequired

  const [orderData, setOrderData] = useState({
    requirements: "",
    specialInstructions: "",
    paymentMethod: (gig.accepts_believe_points && hasEnoughPoints) ? "believe_points" : "stripe",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null)

  // Calculate fees when payment method changes
  React.useEffect(() => {
    const calculateFees = async () => {
      try {
        const response = await axios.post('/service-hub/calculate-fees', {
          gig_id: gig.id,
          package_id: selectedPackage.id,
          payment_method: orderData.paymentMethod,
        })
        if (response.data.success) {
          setFeeBreakdown(response.data.fees)
        }
      } catch (error) {
        console.error('Failed to calculate fees:', error)
      }
    }

    calculateFees()
  }, [orderData.paymentMethod, gig.id, selectedPackage.id])

  const subtotal = selectedPackage.price
  // Buyer pays only the service amount, no sales tax or fees
  const total = feeBreakdown?.total_buyer_pays || subtotal

  const steps = [
    { number: 1, label: "Details", icon: FileText },
    { number: 2, label: "Payment", icon: CreditCard },
    { number: 3, label: "Review", icon: CheckCircle2 },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Validate Believe Points balance before submission
    if (orderData.paymentMethod === 'believe_points' && !hasEnoughPoints) {
      showErrorToast(`Insufficient Believe Points. You need ${pointsRequired.toFixed(2)} points but only have ${userBelievePoints.toFixed(2)} points.`)
      setIsProcessing(false)
      return
    }

    // For Believe Points payments, use Inertia router
    if (orderData.paymentMethod === 'believe_points') {
      router.post('/service-hub/create-order', {
        gig_id: gig.id,
        package_id: selectedPackage.id,
        requirements: orderData.requirements,
        special_instructions: orderData.specialInstructions || null,
        payment_method: orderData.paymentMethod,
      }, {
        onSuccess: () => {
          showSuccessToast("Order placed successfully!")
          router.visit('/service-hub/order/success')
        },
        onError: (errors) => {
          setIsProcessing(false)
          console.error('Order submission error:', errors)
        },
      })
      return
    }

    // For Stripe payments: Create order and Stripe checkout session in one call
    if (orderData.paymentMethod === 'stripe') {
      try {
        // Create order and Stripe checkout session in one step
        const checkoutResponse = await axios.post('/service-hub/checkout/create-session', {
          gig_id: gig.id,
          package_id: selectedPackage.id,
          requirements: orderData.requirements,
          special_instructions: orderData.specialInstructions || null,
        })

        if (checkoutResponse.data.success && checkoutResponse.data.url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutResponse.data.url
        } else {
          setIsProcessing(false)
          showErrorToast("Failed to create payment session. Please try again.")
        }
      } catch (error: any) {
        setIsProcessing(false)
        if (error.response?.data?.error) {
          showErrorToast(error.response.data.error)
        } else {
          console.error('Checkout error:', error)
          showErrorToast("Failed to process order. Please try again.")
        }
      }
    }
  }

  return (
    <FrontendLayout>
      <Head title="Place Order - Service Hub" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Header with gradient */}
        <div className="relative overflow-hidden border-b bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,transparent)]" />
          <div className="container mx-auto px-4 py-6 relative z-10">
            <div className="flex items-center gap-4">
              <Link href={`/service-hub/${gig.slug}`}>
                <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Complete Your Order</h1>
                <p className="text-sm text-white/90">Just a few steps to get started</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = currentStep >= step.number
                const isCurrent = currentStep === step.number
                return (
                  <div key={step.number} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isCurrent ? 1.1 : 1,
                          backgroundColor: isActive ? "rgb(59, 130, 246)" : "rgb(203, 213, 225)",
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 ${isActive ? "bg-blue-500" : "bg-muted"}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Service Summary - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <CardHeader className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Service Summary</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="flex gap-4">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="w-28 h-28 rounded-xl overflow-hidden bg-muted flex-shrink-0 shadow-md ring-2 ring-primary/20"
                        >
                        <img
                          src={gig.image || '/placeholder-image.jpg'}
                          alt={gig.title}
                          className="w-full h-full object-cover"
                        />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {gig.title}
                          </h3>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                                <img src={gig.seller.avatar || '/placeholder-avatar.jpg'} alt={gig.seller.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{gig.seller.name}</p>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs text-muted-foreground">{gig.seller.rating}</span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
                              {selectedPackage.name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Package Details - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-muted/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        Package Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Package</span>
                          <p className="font-semibold text-lg mt-1">{selectedPackage.name}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">Delivery</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-4 w-4 text-primary" />
                            <p className="font-semibold">{selectedPackage.deliveryTime}</p>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Gift className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold">What's Included:</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedPackage.features.map((feature, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span>{feature}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Requirements - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-2 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        Project Requirements
                      </CardTitle>
                      <CardDescription>
                        Help the seller understand exactly what you need
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <Label htmlFor="requirements" className="text-base font-semibold mb-2 block">
                          Describe Your Project <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="requirements"
                          placeholder="Tell us about your project goals, target audience, style preferences, colors, and any specific requirements..."
                          value={orderData.requirements}
                          onChange={(e) =>
                            setOrderData({ ...orderData, requirements: e.target.value })
                          }
                          className="mt-2 min-h-[120px] text-base"
                          rows={6}
                        />
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Zap className="h-3 w-3" />
                          <span>Detailed requirements help sellers deliver exactly what you need</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="specialInstructions" className="text-base font-semibold mb-2 block">
                          Additional Notes <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                        </Label>
                        <Textarea
                          id="specialInstructions"
                          placeholder="Any special instructions, deadlines, or additional context..."
                          value={orderData.specialInstructions}
                          onChange={(e) =>
                            setOrderData({ ...orderData, specialInstructions: e.target.value })
                          }
                          className="mt-2"
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Payment Method - Enhanced */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-2 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <CreditCard className="h-5 w-5 text-green-600" />
                        </div>
                        Payment Method
                      </CardTitle>
                      <CardDescription>Choose how you'd like to pay</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {/* <motion.label
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                            orderData.paymentMethod === "wallet"
                              ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50 bg-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="wallet"
                            checked={orderData.paymentMethod === "wallet"}
                            onChange={(e) =>
                              setOrderData({ ...orderData, paymentMethod: e.target.value })
                            }
                            className="h-5 w-5 text-primary"
                          />
                          <div className="p-3 rounded-lg bg-blue-500/10">
                            <Wallet className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg">Wallet Balance</div>
                            <div className="text-sm text-muted-foreground">
                              Pay instantly using your wallet balance
                            </div>
                          </div>
                          {orderData.paymentMethod === "wallet" && (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          )}
                        </motion.label> */}
                        {/* Stripe Payment Option */}
                        <motion.label
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex items-center gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                            orderData.paymentMethod === "stripe"
                              ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50 bg-background"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="stripe"
                            checked={orderData.paymentMethod === "stripe"}
                            onChange={(e) =>
                              setOrderData({ ...orderData, paymentMethod: e.target.value })
                            }
                            className="h-5 w-5 text-primary"
                          />
                          <div className="p-3 rounded-lg bg-purple-500/10">
                            <CreditCard className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-lg">Credit/Debit Card</div>
                            <div className="text-sm text-muted-foreground">
                              Secure payment via Stripe
                            </div>
                          </div>
                          {orderData.paymentMethod === "stripe" && (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          )}
                        </motion.label>

                        {/* Believe Points Payment Option */}
                        {gig.accepts_believe_points && (
                          <motion.label
                            whileHover={hasEnoughPoints ? { scale: 1.02 } : {}}
                            whileTap={hasEnoughPoints ? { scale: 0.98 } : {}}
                            className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all ${
                              !hasEnoughPoints
                                ? "border-gray-300 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                                : orderData.paymentMethod === "believe_points"
                                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20 cursor-pointer"
                                : "border-border hover:border-primary/50 bg-background cursor-pointer"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="believe_points"
                              checked={orderData.paymentMethod === "believe_points"}
                              onChange={(e) => {
                                if (hasEnoughPoints) {
                                  setOrderData({ ...orderData, paymentMethod: e.target.value })
                                }
                              }}
                              disabled={!hasEnoughPoints}
                              className="h-5 w-5 text-primary disabled:cursor-not-allowed"
                            />
                            <div className="p-3 rounded-lg bg-green-500/10">
                              <Sparkles className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-lg">Believe Points</div>
                              {hasEnoughPoints ? (
                                <div className="text-sm text-muted-foreground">
                                  Pay with Believe Points (Lower fees for seller)
                                </div>
                              ) : (
                                <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                                  Insufficient Balance: You need {pointsRequired.toFixed(2)} points but only have {userBelievePoints.toFixed(2)} points
                                </div>
                              )}
                            </div>
                            {orderData.paymentMethod === "believe_points" && hasEnoughPoints && (
                              <CheckCircle2 className="h-6 w-6 text-primary" />
                            )}
                            {!hasEnoughPoints && (
                              <AlertCircle className="h-6 w-6 text-red-500" />
                            )}
                          </motion.label>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Order Summary Sidebar - Enhanced */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="sticky top-24 space-y-6"
                >
                  <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-background via-background to-primary/5">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">Service Amount</span>
                          <span className="font-semibold">${subtotal.toFixed(2)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border-2 border-primary/20">
                          <span className="text-lg font-bold">Total</span>
                          <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            ℹ️ All fees (platform fee, transaction fee, and sales tax) are deducted from the seller's earnings.
                          </p>
                        </div>
                        {feeBreakdown?.transaction_fee_discount > 0 && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                              ✓ Using Believe Points helps sellers save on transaction fees
                            </p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Trust Badges - Enhanced */}
                      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <Shield className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="font-medium">Secure Payment</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Lock className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">Money-Back Guarantee</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="font-medium">Quality Assured</span>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit}>
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-lg h-14 shadow-lg hover:shadow-xl transition-all"
                          disabled={!orderData.requirements.trim() || isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-5 w-5" />
                              Complete Order
                            </>
                          )}
                        </Button>
                      </form>

                      <p className="text-xs text-center text-muted-foreground leading-relaxed">
                        By placing this order, you agree to our{" "}
                        <Link href="/terms-of-service" className="text-primary hover:underline">
                          Terms of Service
                        </Link>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}

