"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Heart, CreditCard, DollarSign, Info, Check, Coins, Shield, AlertCircle } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/frontend/ui/radio-group"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/frontend/ui/dialog"
import { Badge } from "@/components/frontend/ui/badge"
import { Separator } from "@/components/frontend/ui/separator"
import { router, usePage } from "@inertiajs/react"
import { useNotification } from "./notification-provider"
import { SubscriptionRequiredModal } from "@/components/SubscriptionRequiredModal"

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  organization: {
    id: number
    name: string
    description?: string
    mission?: string
    user?: {
      image?: string | null
      name?: string | null
      email?: string | null
      phone?: string | null
    } | null
    registered_organization?: {
      id: number
      name?: string | null
      user?: {
        image?: string | null
        name?: string | null
        email?: string | null
      } | null
    } | null
  }
}

const donationAmounts = [25, 50, 100, 250, 500, 1000]

export default function DonationModal({ isOpen, onClose, organization }: DonationModalProps) {
  const pageProps = usePage().props as any
  const user = pageProps.auth?.user || null
  const flash = usePage().props
  const { showNotification } = useNotification()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [donationType, setDonationType] = useState("one-time")
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'believe_points'>('stripe')

  // Get user's Believe Points balance
  const currentBalance = parseFloat(user?.believe_points || '0') || 0

  // Get the correct organization ID - use registered_organization.id if available, otherwise organization.id
  const organizationId = (organization as any).registered_organization?.id || organization.id

  const [donorInfo, setDonorInfo] = useState({
    organization_id: organizationId,
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
  }

  const getCurrentAmount = () => {
    return selectedAmount || Number.parseFloat(customAmount) || 0
  }

  const pointsRequired = getCurrentAmount() // 1$ = 1 believe point
  const hasEnoughPoints = currentBalance >= pointsRequired

  // Believe Points only available for one-time donations
  const canUseBelievePoints = donationType === 'one-time' && hasEnoughPoints

  useEffect(() => {
    if (flash?.warning) {
      // Show warning notification
      showNotification({
        type: "warning",
        message: typeof flash?.warning === "string" ? flash.warning : "Warning",
      })
    }
    // Check for subscription required flash message
    if ((flash as any)?.subscription_required || (flash as any)?.errors?.subscription) {
      setShowSubscriptionModal(true)
    }
  }, [flash, showNotification])

  const handleDonate = () => {
    setIsProcessing(true)
    // Get the correct organization ID
    const orgId = (organization as any).registered_organization?.id || organization.id
    // Simulate API call
    router.post(route("donations.store"), {
      organization_id: orgId,
      amount: getCurrentAmount(),
      frequency: donationType,
      message: donorInfo.message,
      payment_method: paymentMethod,
    }, {
      onSuccess: () => {
        setIsProcessing(false)
        setIsSuccess(false)
        onClose()
        // Reset form
        setSelectedAmount(null)
        setCustomAmount("")
        setDonationType("one-time")
        const orgId = (organization as any).registered_organization?.id || organization.id
        setDonorInfo({
          organization_id: orgId,
          name: "",
          email: "",
          phone: "",
          message: "",
        })
      },
      onError: (errors) => {
        setIsProcessing(false)
        // Check if subscription is required
        if (errors.subscription || (flash as any)?.subscription_required) {
          setShowSubscriptionModal(true)
        } else {
          // Handle other errors (e.g., show notification)
          showNotification({
            type: "error",
            title: "Donation Failed",
            message: errors.message || "Failed to process donation. Please try again.",
          })
        }
      }
    })

  }

  const getFrequencyText = () => {
    switch (donationType) {
      case "weekly":
        return "/week"
      case "monthly":
        return "/month"
      default:
        return ""
    }
  }

  const getImpactText = (amount: number) => {
    if (amount >= 1000) return "Fund a major project initiative"
    if (amount >= 500) return "Support 50+ families for a month"
    if (amount >= 250) return "Provide resources for 25 families"
    if (amount >= 100) return "Help 10 families in need"
    if (amount >= 50) return "Support 5 families"
    if (amount >= 25) return "Help 2-3 families"
    return "Every dollar makes a difference"
  }

  const amount = getCurrentAmount()
  const stripeFee = paymentMethod === "stripe" && amount > 0 ? amount * 0.029 + 0.3 : 0
  const total = amount + stripeFee

  const orgAvatar =
    (organization as any)?.registered_organization?.user?.image ||
    organization?.user?.image ||
    null

  const orgDescription =
    (organization?.description && organization.description.trim() !== ""
      ? organization.description
      : organization?.mission) || ""

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#0b1220] text-white border border-white/10 shadow-2xl rounded-2xl max-w-md">
          <div className="text-center py-8 px-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="h-8 w-8 text-emerald-400" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">Thank You!</h3>
            <p className="text-white/80 mb-4">
              Your ${amount} {donationType !== "one-time" ? `${donationType} ` : ""}donation to{" "}
              {organization.name} has been processed successfully.
            </p>
            <p className="text-sm text-white/60">You'll receive a confirmation email shortly.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0b1220] text-white border border-white/10 shadow-2xl rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-600/15 via-blue-600/10 to-transparent">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-rose-400" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm text-white/70">Donate</span>
                <span className="block text-xl font-semibold tracking-tight">{organization.name}</span>
              </span>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Support this organization and make a real impact.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6">
          {/* Organization Info */}
          <Card className="bg-white/5 border border-white/10">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {orgAvatar ? (
                    <img
                      src={String(orgAvatar).startsWith("/") ? String(orgAvatar) : `/${orgAvatar}`}
                      alt={organization.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-white/80">
                      {organization?.name?.[0]?.toUpperCase?.() ?? "O"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{organization.name}</h4>
                  {orgDescription ? (
                    <p className="text-sm text-white/70 mt-1 line-clamp-2">{orgDescription}</p>
                  ) : (
                    <p className="text-sm text-white/60 mt-1">Support their mission with a donation.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Payment Method</Label>
            <div className="space-y-3">
              {/* Stripe Payment */}
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all bg-white/5 ${
                paymentMethod === 'stripe'
                  ? 'border-purple-400/50 ring-1 ring-purple-400/20'
                  : 'border-white/10 hover:border-white/20'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                  className="w-4 h-4 text-purple-500"
                />
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white/80" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Pay with Card</div>
                  <div className="text-sm text-white/60">Secure checkout via Stripe</div>
                </div>
              </label>

              {/* Believe Points Payment - Only for one-time donations */}
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all bg-white/5 ${
                paymentMethod === 'believe_points'
                  ? 'border-purple-400/50 ring-1 ring-purple-400/20'
                  : 'border-white/10 hover:border-white/20'
              } ${!canUseBelievePoints ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="believe_points"
                  checked={paymentMethod === 'believe_points'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                  disabled={!canUseBelievePoints}
                  className="w-4 h-4 text-purple-500"
                />
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    Pay with Believe Points
                    {donationType !== 'one-time' && (
                      <Badge variant="secondary" className="text-xs">
                        One-time only
                      </Badge>
                    )}
                    {donationType === 'one-time' && !hasEnoughPoints && (
                      <Badge variant="destructive" className="text-xs">
                        Insufficient
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-white/60">
                    {donationType !== 'one-time' ? (
                      'Available only for one-time donations'
                    ) : (
                      <>
                        Your balance: {currentBalance.toFixed(2)} points
                        {hasEnoughPoints && (
                          <span className="text-emerald-300 ml-2">
                            (You'll have {(currentBalance - pointsRequired).toFixed(2)} points remaining)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </label>
            </div>

            {paymentMethod === 'believe_points' && donationType !== 'one-time' && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Believe Points can only be used for one-time donations. Please select "One-time" frequency to use Believe Points.
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'believe_points' && donationType === 'one-time' && !hasEnoughPoints && (
              <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-rose-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    You need {pointsRequired.toFixed(2)} points but only have {currentBalance.toFixed(2)} points.
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'stripe' && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-blue-200">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">
                    Your payment information is secure and encrypted. We use Stripe for payment processing.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Donation Type */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Donation Frequency</Label>
            <RadioGroup
              value={donationType}
              onValueChange={(value) => {
                setDonationType(value)
                // Reset to Stripe if switching to recurring (Believe Points only for one-time)
                if (value !== 'one-time' && paymentMethod === 'believe_points') {
                  setPaymentMethod('stripe')
                }
              }}
              className="grid grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2 border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10 transition-colors">
                <RadioGroupItem value="one-time" id="one-time" />
                <Label htmlFor="one-time" className="cursor-pointer flex-1">
                  <div className="font-medium">One-time</div>
                  <div className="text-xs text-white/60">Single donation</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10 transition-colors">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="cursor-pointer flex-1">
                  <div className="font-medium">Weekly</div>
                  <div className="text-xs text-white/60">Every week</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-white/10 rounded-xl p-3 bg-white/5 hover:bg-white/10 transition-colors">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="cursor-pointer flex-1">
                  <div className="font-medium">Monthly</div>
                  <div className="text-xs text-white/60">Every month</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Amount</Label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {donationAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  onClick={() => handleAmountSelect(amount)}
                  className={
                    selectedAmount === amount
                      ? "h-12 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
                      : "h-12 text-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white"
                  }
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <div>
              <Label htmlFor="custom-amount" className="text-sm text-white/70 mb-2 block">
                Or enter custom amount
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-10 h-12 text-lg bg-white/5 border-white/10 focus-visible:ring-purple-500/30 focus-visible:border-purple-400/50"
                />
              </div>
            </div>
          </div>

          {/* Impact Preview */}
          {getCurrentAmount() > 0 && (
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-200 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-100 mb-1">Your Impact</h4>
                    <p className="text-blue-100/80 text-sm">{getImpactText(getCurrentAmount())}</p>
                    {donationType !== "one-time" && (
                      <p className="text-blue-100/70 text-xs mt-1">
                        That's ${(getCurrentAmount() * (donationType === "weekly" ? 52 : 12)).toLocaleString()} per
                        year!
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Donor Information */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Donor Information</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={donorInfo.name}
                  onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
                  className="bg-white/5 border-white/10 focus-visible:ring-purple-500/30 focus-visible:border-purple-400/50"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={donorInfo.email}
                  onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
                  className="bg-white/5 border-white/10 focus-visible:ring-purple-500/30 focus-visible:border-purple-400/50"
                  required
                />
              </div>

            </div>
            <div>
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={donorInfo.phone}
                onChange={(e) => setDonorInfo({ ...donorInfo, phone: e.target.value })}
                className="bg-white/5 border-white/10 focus-visible:ring-purple-500/30 focus-visible:border-purple-400/50"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Share why you're supporting this cause..."
              value={donorInfo.message}
              onChange={(e) => setDonorInfo({ ...donorInfo, message: e.target.value })}
              className="min-h-[80px] bg-white/5 border-white/10 focus-visible:ring-purple-500/30 focus-visible:border-purple-400/50"
            />
          </div>

          <Separator />

          {/* Donation Summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="font-semibold mb-3">Donation Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Amount:</span>
                <span className="font-medium">
                  ${amount.toFixed(2)}
                  {getFrequencyText()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Processing Fee:</span>
                <span className="font-medium">${stripeFee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>
                  ${total.toFixed(2)}
                  {getFrequencyText()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDonate}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
              disabled={
                getCurrentAmount() === 0 ||
                !donorInfo.name ||
                !donorInfo.email ||
                isProcessing ||
                (paymentMethod === 'believe_points' && !hasEnoughPoints)
              }
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>
                  {paymentMethod === 'believe_points' ? (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Donate {pointsRequired.toFixed(2)} Points
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Donate ${amount.toFixed(2)}
                      {getFrequencyText()}
                    </>
                  )}
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-white/60 flex items-center justify-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Your payment information is secure and encrypted.</span>
          </div>
        </div>
      </DialogContent>

      {/* Subscription Required Modal - Supporter View */}
      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        feature="donations"
        isSupporterView={true}
      />
    </Dialog>
  )
}
