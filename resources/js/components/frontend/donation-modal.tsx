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
import { route } from "ziggy-js"
import { useNotification } from "./notification-provider"
import { SubscriptionRequiredModal } from "@/components/SubscriptionRequiredModal"

interface DonationModalProps {
  isOpen: boolean
  onClose: () => void
  organization: {
    id: number
    name: string
    image: string
    description: string
    category: string
    rating: number
    user: {
      image: string
      name: string
      email: string
      phone: string
    }
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

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-w-md">
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="h-8 w-8 text-green-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your ${getCurrentAmount()} {donationType !== "one-time" ? `${donationType} ` : ""}donation to{" "}
              {organization.name} has been processed successfully.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">You'll receive a confirmation email shortly.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-3">
            <Heart className="h-5 w-5 text-red-500" />
            Donate to {organization.name}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Support this organization and make a real impact in the world
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Organization Info */}
          <Card className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <img
                  src={organization?.user?.image ? "/" + organization?.user?.image : "/placeholder.svg"}
                  alt={organization.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{organization.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{organization.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {organization.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-400">★</span>
                      <span className="text-gray-600 dark:text-gray-300">{organization.rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
              Payment Method
            </Label>
            <div className="space-y-3">
              {/* Stripe Payment */}
              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'stripe'
                  ? 'border-primary bg-primary/10'
                  : 'border-input hover:border-primary/50'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                  className="w-4 h-4 text-primary"
                />
                <CreditCard className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-semibold">Pay with Card (Stripe)</div>
                  <div className="text-sm text-muted-foreground">Secure payment via Stripe</div>
                </div>
              </label>

              {/* Believe Points Payment - Only for one-time donations */}
              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMethod === 'believe_points'
                  ? 'border-primary bg-primary/10'
                  : 'border-input hover:border-primary/50'
              } ${!canUseBelievePoints ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="believe_points"
                  checked={paymentMethod === 'believe_points'}
                  onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'believe_points')}
                  disabled={!canUseBelievePoints}
                  className="w-4 h-4 text-primary"
                />
                <Coins className="h-5 w-5 text-yellow-600" />
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
                  <div className="text-sm text-muted-foreground">
                    {donationType !== 'one-time' ? (
                      'Available only for one-time donations'
                    ) : (
                      <>
                        Your balance: {currentBalance.toFixed(2)} points
                        {hasEnoughPoints && (
                          <span className="text-green-600 ml-2">
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
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Believe Points can only be used for one-time donations. Please select "One-time" frequency to use Believe Points.
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'believe_points' && donationType === 'one-time' && !hasEnoughPoints && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    You need {pointsRequired.toFixed(2)} points but only have {currentBalance.toFixed(2)} points.
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'stripe' && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
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
            <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
              Donation Frequency
            </Label>
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
              <div className="flex items-center space-x-2 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RadioGroupItem value="one-time" id="one-time" />
                <Label htmlFor="one-time" className="text-gray-900 dark:text-white cursor-pointer flex-1">
                  <div className="font-medium">One-time</div>
                  <div className="text-xs text-gray-500">Single donation</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="text-gray-900 dark:text-white cursor-pointer flex-1">
                  <div className="font-medium">Weekly</div>
                  <div className="text-xs text-gray-500">Every week</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="text-gray-900 dark:text-white cursor-pointer flex-1">
                  <div className="font-medium">Monthly</div>
                  <div className="text-xs text-gray-500">Every month</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">Select Amount</Label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {donationAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  onClick={() => handleAmountSelect(amount)}
                  className="h-12 text-lg"
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <div>
              <Label htmlFor="custom-amount" className="text-sm text-gray-600 dark:text-gray-300 mb-2 block">
                Or enter custom amount
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className="pl-10 h-12 text-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Impact Preview */}
          {getCurrentAmount() > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Your Impact</h4>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">{getImpactText(getCurrentAmount())}</p>
                    {donationType !== "one-time" && (
                      <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
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
            <Label className="text-base font-semibold text-gray-900 dark:text-white">Donor Information</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-gray-900 dark:text-white">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={donorInfo.name}
                  onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-gray-900 dark:text-white">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={donorInfo.email}
                  onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  required
                />
              </div>

            </div>
            <div>
              <Label htmlFor="phone" className="text-gray-900 dark:text-white">
                Phone (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={donorInfo.phone}
                onChange={(e) => setDonorInfo({ ...donorInfo, phone: e.target.value })}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message" className="text-gray-900 dark:text-white">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Share why you're supporting this cause..."
              value={donorInfo.message}
              onChange={(e) => setDonorInfo({ ...donorInfo, message: e.target.value })}
              className="min-h-[80px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
            />
          </div>

          <Separator />

          {/* Donation Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Donation Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${getCurrentAmount().toFixed(2)}
                  {getFrequencyText()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Processing Fee:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${(getCurrentAmount() * 0.029 + 0.3).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">
                  ${(getCurrentAmount() + getCurrentAmount() * 0.029 + 0.3).toFixed(2)}
                  {getFrequencyText()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleDonate}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
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
                      Donate ${getCurrentAmount().toFixed(2)}
                      {getFrequencyText()}
                    </>
                  )}
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            🔒 Your payment information is secure and encrypted
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
