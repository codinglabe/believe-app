"use client"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState } from "react"
import { motion } from "framer-motion"
import { Heart, CreditCard, Shield, Users, Zap } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/frontend/ui/radio-group"
import { Textarea } from "@/components/frontend/ui/textarea"

const donationAmounts = [25, 50, 100, 250, 500, 1000]

const featuredCauses = [
  {
    id: 1,
    name: "Emergency Relief Fund",
    description: "Immediate assistance for communities affected by natural disasters",
    image: "/placeholder.svg?height=200&width=300",
    raised: 75000,
    goal: 100000,
    supporters: 1250,
  },
  {
    id: 2,
    name: "Education Access Initiative",
    description: "Providing educational resources to underserved communities",
    image: "/placeholder.svg?height=200&width=300",
    raised: 45000,
    goal: 80000,
    supporters: 890,
  },
  {
    id: 3,
    name: "Clean Water Project",
    description: "Building sustainable water infrastructure worldwide",
    image: "/placeholder.svg?height=200&width=300",
    raised: 120000,
    goal: 150000,
    supporters: 2100,
  },
]

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [donationType, setDonationType] = useState("one-time")
  const [selectedCause, setSelectedCause] = useState<number | null>(null)

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

  const getAnnualImpact = () => {
    const amount = getCurrentAmount()
    if (donationType === "weekly") return amount * 52
    if (donationType === "monthly") return amount * 12
    return amount
  }

    return (
    <FrontendLayout>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-green-600 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
              Make a Difference Today
            </h1>
            <p className="text-xl mb-8 opacity-90 text-gray-700 dark:text-gray-300">
              Your donation, no matter the size, creates real impact in communities worldwide. Join thousands of
              supporters making positive change happen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">$2.5M+</div>
                <div className="opacity-90 text-gray-600 dark:text-gray-300">Total Donated</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">15,000+</div>
                <div className="opacity-90 text-gray-600 dark:text-gray-300">Active Donors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">500+</div>
                <div className="opacity-90 text-gray-600 dark:text-gray-300">Projects Funded</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Donation Form */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <Card className="mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center text-gray-900 dark:text-white">
                    <Heart className="mr-3 h-6 w-6 text-red-500" />
                    Make Your Donation
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">
                    Choose your donation amount and frequency to help us create positive change
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Donation Type */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
                      Donation Frequency
                    </Label>
                    <RadioGroup
                      value={donationType}
                      onValueChange={setDonationType}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
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
                    <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
                      Select Amount
                    </Label>
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
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          id="custom-amount"
                          type="number"
                          placeholder="0.00"
                          value={customAmount}
                          onChange={(e) => handleCustomAmountChange(e.target.value)}
                          className="pl-8 h-12 text-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recurring Donation Impact */}
                  {getCurrentAmount() > 0 && donationType !== "one-time" && (
                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Your {donationType} impact
                          </h4>
                          <div className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-1">
                            ${getCurrentAmount()}
                            {getFrequencyText()}
                          </div>
                          <p className="text-blue-700 dark:text-blue-300 text-sm">
                            That's ${getAnnualImpact().toLocaleString()} per year making a difference!
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Donor Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name" className="text-gray-900 dark:text-white">
                        First Name
                      </Label>
                      <Input
                        id="first-name"
                        placeholder="John"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last-name" className="text-gray-900 dark:text-white">
                        Last Name
                      </Label>
                      <Input
                        id="last-name"
                        placeholder="Doe"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-900 dark:text-white">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-900 dark:text-white">
                        Phone (Optional)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
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
                      className="min-h-[100px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  {/* Payment Button */}
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
                    disabled={getCurrentAmount() === 0}
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    Donate ${getCurrentAmount().toFixed(2)}
                    {getFrequencyText()}
                  </Button>

                  {/* Security Notice */}
                  <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 pt-4">
                    <Shield className="mr-2 h-4 w-4" />
                    Secure payment powered by Stripe
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Impact Summary */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Your Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  {getCurrentAmount() > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-gray-900 dark:text-white">
                        <span>Your donation:</span>
                        <span className="font-semibold">
                          ${getCurrentAmount().toFixed(2)}
                          {getFrequencyText()}
                        </span>
                      </div>
                      {donationType !== "one-time" && (
                        <div className="flex justify-between text-gray-900 dark:text-white">
                          <span>Annual impact:</span>
                          <span className="font-semibold text-green-600">${getAnnualImpact().toLocaleString()}</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                        <p>• ${Math.round(getCurrentAmount() * 0.85)} goes directly to programs</p>
                        <p>• ${Math.round(getCurrentAmount() * 0.15)} covers platform costs</p>
                      </div>
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-green-600">100% tax-deductible</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300">Select an amount to see your impact</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Why Donate */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">
                    Why Donate Through CareConnect?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Verified Organizations</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          All organizations are thoroughly vetted
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Direct Impact</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">85% goes directly to programs</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Transparent Reporting</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Track your donation's impact</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recurring Donation Benefits */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">💚 Recurring Donations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Predictable funding for organizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Greater long-term impact</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Cancel anytime from your profile</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Featured Causes */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Featured Causes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredCauses.map((cause, index) => (
              <motion.div
                key={cause.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <div className="relative overflow-hidden rounded-t-lg">
                    <img
                      src={cause.image || "/placeholder.svg"}
                      alt={cause.name}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">{cause.name}</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">{cause.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(cause.raised / cause.goal) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${cause.raised.toLocaleString()} raised
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">${cause.goal.toLocaleString()} goal</span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{cause.supporters} supporters</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
            </div>
    </FrontendLayout>
  )
}
