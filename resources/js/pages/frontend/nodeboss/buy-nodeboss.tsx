"use client"

import { useState } from "react"
import { DollarSign, Info, ArrowLeft, Target, TrendingUp, Users, CheckCircle, Clock, Shield } from "lucide-react"
import { useForm, Link } from "@inertiajs/react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/frontend/ui/textarea"
import type { NodeBoss } from "@/types/nodeboss"
import type { Auth } from "@/types"

interface Statistics {
  total_target_amount: number
  total_sold_amount: number
  remaining_amount: number
  progress_percentage: number
}

interface OpenShare {
  id: number
  node_id: string
  cost: number
  sold: number
  remaining: number
  status: string
}

interface Props {
  nodeBoss: NodeBoss
  statistics: Statistics
  openShares: OpenShare[]
  auth: Auth
  user: {
    name: string
    email: string
  } | null
}

export default function BuyNodeBossPage({ nodeBoss, statistics, openShares, auth, user }: Props) {
  const suggestedAmounts =
    typeof nodeBoss.suggested_amounts === "string"
      ? JSON.parse(nodeBoss.suggested_amounts)
      : nodeBoss.suggested_amounts || [10, 25, 50, 100, 250, 500]

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [donorInfo, setDonorInfo] = useState({
    name: user?.name || "",
    email: user?.email || "",
    message: "",
  })
  const [isProcessing, setIsProcessing] = useState(false)

  // Add useForm hook for Laravel Inertia
  const { data, setData, post, processing, errors } = useForm({
    node_boss_id: nodeBoss.id,
    amount: 0,
    buyer_name: user?.name || "",
    buyer_email: user?.email || "",
    message: "",
  })

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount)
    setCustomAmount("")
    setData("amount", amount)
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setSelectedAmount(null)
    setData("amount", Number.parseFloat(value) || 0)
  }

  const getCurrentAmount = () => {
    return Number(selectedAmount) || Number.parseFloat(customAmount) || 0
  }

  const handlePurchase = async () => {
    const amountToPurchase = getCurrentAmount()
    if (amountToPurchase <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (amountToPurchase > statistics.remaining_amount) {
      alert(`Amount exceeds remaining funds. Maximum available: $${statistics.remaining_amount.toLocaleString()}`)
      return
    }

    // Update form data
    setData({
      ...data,
      amount: amountToPurchase,
      buyer_name: donorInfo.name,
      buyer_email: donorInfo.email,
      message: donorInfo.message,
    })

    // Basic validation for required fields
    if (!donorInfo.name || !donorInfo.email) {
      alert("Please fill in all required fields")
      return
    }

    setIsProcessing(true)

    // Submit using Inertia
    post("/node-share/purchase", {
      onSuccess: () => {
        // Will redirect to Stripe checkout
      },
      onError: (errors) => {
        console.error("Purchase failed:", errors)
        setIsProcessing(false)
      },
      onFinish: () => {
        setIsProcessing(false)
      },
    })
  }

  const getImpactText = (amount: number) => {
    if (amount >= 500) return "🚀 Become a major contributor and significantly accelerate project completion!"
    if (amount >= 250) return "⭐ Make a substantial impact and help reach our funding milestone!"
    if (amount >= 100) return "💪 Your investment will make a meaningful difference to this project!"
    if (amount >= 50) return "🎯 Help us get closer to our funding goal with this solid contribution!"
    if (amount >= 25) return "✨ Every contribution counts and brings us closer to success!"
    return "🙏 Your support, no matter the size, is truly valuable and appreciated!"
  }

  const handleResetForm = () => {
    setSelectedAmount(null)
    setCustomAmount("")
    setDonorInfo({ name: user?.name || "", email: user?.email || "", message: "" })
    setData({
      node_boss_id: nodeBoss.id,
      amount: 0,
      buyer_name: user?.name || "",
      buyer_email: user?.email || "",
      message: "",
    })
  }

  const processingFee = getCurrentAmount() * 0.029 + 0.3
  const totalPayment = getCurrentAmount() + processingFee

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-10xl">
          {/* Header */}
          <div className="mb-8 animate-in slide-in-from-top duration-700">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/node-boss">
                <Button variant="outline" size="sm" className="hover:scale-105 transition-transform ">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Projects
                </Button>
              </Link>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                Invest in {nodeBoss.name}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Join the future of blockchain infrastructure. Your investment helps build cutting-edge technology that
                powers the decentralized world.
              </p>
            </div>
          </div>

          {/* Display errors if any */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-in slide-in-from-top duration-300">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Please fix the following errors:</h4>
              {Object.entries(errors).map(([key, message]) => (
                <p key={key} className="text-red-600 dark:text-red-400 text-sm">
                  • {message as string}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Project Info & Statistics */}
            <div className="lg:col-span-1 space-y-6">
              {/* Project Overview */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0  backdrop-blur-sm animate-in slide-in-from-left duration-500">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Project Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{nodeBoss.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{nodeBoss.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {nodeBoss.is_closed ? "Closed" : "Active"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {openShares.length} Active Shares
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Funding Progress */}
              {/* <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0  backdrop-blur-sm animate-in slide-in-from-left duration-700">
                <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Funding Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {statistics.progress_percentage}%
                        </span>
                      </div>
                      <Progress value={statistics.progress_percentage} className="h-3 bg-gray-200 dark:bg-gray-700" />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ${statistics.total_sold_amount.toLocaleString()} of $
                        {statistics.total_target_amount.toLocaleString()} raised
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Target Amount</p>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">
                              ${statistics.total_target_amount.toLocaleString()}
                            </p>
                          </div>
                          <Target className="h-8 w-8 text-green-500" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Amount Raised</p>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                              ${statistics.total_sold_amount.toLocaleString()}
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8 text-blue-500" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Remaining</p>
                            <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                              ${statistics.remaining_amount.toLocaleString()}
                            </p>
                          </div>
                          <Clock className="h-8 w-8 text-orange-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card> */}

              {/* Available Shares */}
              {/* {openShares.length > 0 && (
                <Card className="shadow-xl hover:shadow-2xl transition-all duration-300 border-0  backdrop-blur-sm animate-in slide-in-from-left duration-900">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Available Shares ({openShares.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {openShares.slice(0, 3).map((share) => (
                        <div
                          key={share.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{share.node_id}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ${share.remaining.toLocaleString()} available
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Open
                          </Badge>
                        </div>
                      ))}
                      {openShares.length > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{openShares.length - 3} more shares available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )} */}
            </div>

            {/* Right Column - Investment Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm animate-in slide-in-from-right duration-500">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <DollarSign className="h-6 w-6" />
                    Make Your Investment
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-8">
                    {/* Amount Selection */}
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold text-gray-900 dark:text-white">
                        Select Investment Amount
                      </Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {suggestedAmounts.map((amount: number) => (
                          <Button
                            key={amount}
                            variant={selectedAmount === amount ? "default" : "outline"}
                            onClick={() => handleAmountSelect(amount)}
                            className={`h-16 text-lg font-semibold transition-all duration-200 ${
                              selectedAmount === amount
                                ? "bg-blue-600 hover:bg-blue-700 scale-105 shadow-lg"
                                : "hover:scale-105 hover:shadow-md "
                            }`}
                            disabled={amount > statistics.remaining_amount}
                          >
                            ${amount}
                          </Button>
                        ))}
                      </div>

                      {/* Custom Amount */}
                      {/* <div className="space-y-2">
                        <Label htmlFor="custom-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Or enter custom amount (max ${statistics.remaining_amount.toLocaleString()})
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                          <Input
                            id="custom-amount"
                            type="number"
                            placeholder="0.00"
                            value={customAmount}
                            onChange={(e) => handleCustomAmountChange(e.target.value)}
                            className="pl-12 h-14 text-lg  border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            max={statistics.remaining_amount}
                          />
                        </div>
                        {getCurrentAmount() > statistics.remaining_amount && (
                          <p className="text-red-500 text-sm flex items-center gap-1">
                            <Info className="h-4 w-4" />
                            Amount exceeds remaining funds. Max: ${statistics.remaining_amount.toLocaleString()}
                          </p>
                        )}
                      </div> */}
                    </div>

                    {/* Impact Preview */}
                    {getCurrentAmount() > 0 && (
                      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800 animate-in zoom-in duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500 rounded-full">
                              <Info className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-lg">
                                Your Investment Impact
                              </h4>
                              <p className="text-blue-800 dark:text-blue-200">{getImpactText(getCurrentAmount())}</p>
                              <div className="mt-3 p-3 bg-white/50 rounded-lg">
                                <p className="text-sm text-blue-700 dark:text-blue-100">
                                  Your ${getCurrentAmount().toLocaleString()} investment represents{" "}
                                  <strong>
                                    {((getCurrentAmount() / statistics.total_target_amount) * 100).toFixed(2)}%
                                  </strong>{" "}
                                  of the total project funding goal.
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Investor Information */}
                    <div className="space-y-4">
                      <Label className="text-lg font-semibold text-gray-900 dark:text-white">Your Information</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Full Name *
                          </Label>
                          <Input
                            id="name"
                            placeholder="Enter your full name"
                            value={donorInfo.name}
                            onChange={(e) => setDonorInfo({ ...donorInfo, name: e.target.value })}
                            className="h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Address *
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email address"
                            value={donorInfo.email}
                            onChange={(e) => setDonorInfo({ ...donorInfo, email: e.target.value })}
                            className="h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Message to Project Team (Optional)
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Share your thoughts, questions, or words of encouragement with the project team..."
                        value={donorInfo.message}
                        onChange={(e) => setDonorInfo({ ...donorInfo, message: e.target.value })}
                        className="min-h-[100px] border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-transparent"
                      />
                    </div>

                    <Separator className="my-6" />

                    {/* Purchase Summary */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        Investment Summary
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-300">Investment Amount:</span>
                          <span className="font-semibold text-lg text-gray-900 dark:text-white">
                            ${getCurrentAmount().toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-300">Processing Fee (2.9% + $0.30):</span>
                          <span className="font-medium text-gray-900 dark:text-white">${processingFee.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-lg text-gray-900 dark:text-white">Total Payment:</span>
                          <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                            ${totalPayment.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <Button
                        variant="outline"
                        onClick={handleResetForm}
                        className="flex-1 h-14 text-lg"
                        disabled={isProcessing || processing}
                      >
                        Reset Form
                      </Button>
                      <Button
                        onClick={handlePurchase}
                        className="flex-1 h-14 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        disabled={
                          getCurrentAmount() <= 0 ||
                          getCurrentAmount() > statistics.remaining_amount ||
                          !donorInfo.name ||
                          !donorInfo.email ||
                          isProcessing ||
                          processing
                        }
                      >
                        {isProcessing || processing ? (
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing Investment...
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5" />
                            Invest ${getCurrentAmount().toFixed(2)}
                            <Shield className="h-5 w-5" />
                          </div>
                        )}
                      </Button>
                    </div>

                    {/* Security Notice */}
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                        <Shield className="h-5 w-5" />
                        <span className="font-medium">Secure Payment Processing</span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Your payment information is encrypted and processed securely through Stripe. We never store your
                        payment details.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </FrontendLayout>
  )
}
