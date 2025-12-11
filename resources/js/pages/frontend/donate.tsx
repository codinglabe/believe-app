"use client"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, CreditCard, Shield, Users, Zap, Search, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { router, usePage } from "@inertiajs/react" // Using actual Inertia router for clarity in this context
import { RadioGroup, RadioGroupItem } from "@/components/frontend/ui/radio-group"
import { Textarea } from "@/components/frontend/ui/textarea"
import { useNotification } from "@/components/frontend/notification-provider"

// Define the expected props structure for an Inertia page
interface Organization {
  id: number
  name: string
  description: string
  image: string // Assuming image is a URL
  raised: number
  goal: number
  supporters: number
}

interface User {
  name: string
  email: string
  // Add other user properties if needed
}

interface DonatePageProps {
  organizations: Organization[] // Initial list of organizations (could be all or pre-filtered by Laravel)
  user?: User | null // Optional user data if logged in
  message?: string // Optional message from controller
  searchQuery?: string // The current search query from the URL, passed by Laravel
}

const donationAmounts = [25, 50, 100, 250, 500, 1000]

// The component now accepts props from Laravel via Inertia
export default function DonatePage({
  organizations: initialOrganizations, // Renamed to avoid conflict with local state
  user,
  searchQuery: initialSearchQuery = "", // Initialize with prop from Laravel
}: DonatePageProps) {
  const flash = usePage().props
  const { showNotification } = useNotification()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [donationType, setDonationType] = useState("one-time")
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery) // Initialize with prop from Laravel
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSearchingOrganizations, setIsSearchingOrganizations] = useState(false) // New state for search loading

  // State to hold the organizations currently displayed in the search results dropdown.
  // In a real Inertia app, this would typically be `organizations` prop itself,
  // which gets updated by Laravel after an `router.get` visit.
  // Here, we simulate that filtering locally for the sandbox.
  const [displayedOrganizations, setDisplayedOrganizations] = useState<Organization[]>(initialOrganizations)

  // Donor Information States, pre-filled if user prop is provided
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("")
  const [donorMessage, setDonorMessage] = useState("") // Renamed to avoid conflict with page message prop

  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Function to simulate Inertia.js dynamic search (router.get)
  // This function is now called explicitly, e.g., on Enter key press.
  const performSearch = useCallback(
    async (query: string) => {
      setIsSearchingOrganizations(true)
      // In a real Inertia app, you'd do:
      router.get("/donate", { search: query }, { preserveScroll: true, preserveState: true, replace: true })
      // And the `organizations` prop would be updated by Inertia after the server responds.
      const lowerCaseQuery = query.toLowerCase()
      const filtered = initialOrganizations.filter(
        (cause) =>
          cause.name.toLowerCase().includes(lowerCaseQuery) || cause.description.toLowerCase().includes(lowerCaseQuery),
      )
      setDisplayedOrganizations(filtered)
      setIsSearchingOrganizations(false)
    },
    [initialOrganizations],
  ) // Depend on initialOrganizations to filter from the full list

  // Effect to update displayedOrganizations when initialOrganizations prop changes (from Laravel)
  // This is crucial for a real Inertia app where Laravel sends new filtered data.
  useEffect(() => {
    setDisplayedOrganizations(initialOrganizations)
    // If the initial search query is present, also perform a local filter for the sandbox
    if (initialSearchQuery) {
      const lowerCaseQuery = initialSearchQuery.toLowerCase()
      const filtered = initialOrganizations.filter(
        (cause) =>
          cause.name.toLowerCase().includes(lowerCaseQuery) || cause.description.toLowerCase().includes(lowerCaseQuery),
      )
      setDisplayedOrganizations(filtered)
    }
  }, [initialOrganizations, initialSearchQuery])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (flash?.warning) {
      // Show warning notification
      showNotification({
        type: "warning",
        message: typeof flash?.warning === "string" ? flash.warning : "Warning",
      })
    }
  }, [flash, showNotification])

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

  const selectedCause = useMemo(() => {
    // Find selected cause from the *initial* full list of organizations
    // This ensures the selected cause details remain consistent even if search results change.
    return initialOrganizations.find((cause) => cause.id === selectedCauseId)
  }, [selectedCauseId, initialOrganizations])

  const handleCauseSelect = (id: number) => {
    setSelectedCauseId(id)
    setSearchQuery("") // Clear search query after selection
    setIsSearchFocused(false) // Hide search results
  }

  const handleClearCauseSelection = () => {
    setSelectedCauseId(null)
    setSearchQuery("") // Clear search query when clearing selection
    setIsSearchFocused(true) // Show search input again
  }

  const handleSubmit = async () => {
    setSubmissionError(null)
    setIsSubmitting(true)

    if (!selectedCauseId) {
      setSubmissionError("Please select a non-profit organization.")
      setIsSubmitting(false)
      return
    }

    if (getCurrentAmount() <= 0) {
      setSubmissionError("Please enter a valid donation amount.")
      setIsSubmitting(false)
      return
    }

    // Data to be sent to your Laravel backend via Inertia.js
    const donationData = {
      organization_id: selectedCauseId,
      amount: getCurrentAmount(),
      frequency: donationType,
      message: donorMessage,
      // In a real Inertia app, if the user is logged in, Laravel already knows their ID.
      // If not logged in, you might pass name, email, phone here for guest donations.
      name: name,
      email: email,
      phone: phone,
    }

    // In a real Inertia.js application, you would use:
    router.post("/donate", donationData, {
      onStart: () => setIsSubmitting(true),
      onFinish: () => setIsSubmitting(false),
      onSuccess: () => {

      },
      onError: (errors) => {
        setSubmissionError(errors.message || "Failed to process donation. Please try again.")
        console.error("Donation submission errors:", errors)
      },
    })
  }

  return (
    <FrontendLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 py-12 sm:py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center justify-center mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <Heart className="h-8 w-8 sm:h-10 sm:w-10 text-white fill-white" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                Make a Difference Today
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8">
                Your donation, no matter the size, creates real impact in communities worldwide. Join thousands of
                supporters making positive change happen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl mx-auto mt-8">
                <div className="text-center p-4 sm:p-5 bg-white/10 backdrop-blur-sm rounded-xl">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white">$2.5M+</div>
                  <div className="text-sm sm:text-base text-white/90">Total Donated</div>
                </div>
                <div className="text-center p-4 sm:p-5 bg-white/10 backdrop-blur-sm rounded-xl">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white">15,000+</div>
                  <div className="text-sm sm:text-base text-white/90">Active Donors</div>
                </div>
                <div className="text-center p-4 sm:p-5 bg-white/10 backdrop-blur-sm rounded-xl">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white">500+</div>
                  <div className="text-sm sm:text-base text-white/90">Projects Funded</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Donation Form */}
            <div className="lg:col-span-2">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 dark:from-purple-700 dark:via-blue-700 dark:to-purple-800 rounded-t-xl px-6 py-4 mb-0">
                  <div className="flex items-center text-white">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mr-3">
                      <Heart className="h-5 w-5 text-white fill-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold">Make Your Donation</h2>
                  </div>
                  {selectedCause && (
                    <p className="text-white/90 text-sm mt-2 ml-[3.25rem]">
                      You are donating to{" "}
                      <span className="font-semibold text-white">{selectedCause.name}</span>.
                      <Button
                        variant="link"
                        onClick={handleClearCauseSelection}
                        className="p-0 h-auto ml-2 text-sm text-white/90 hover:text-white underline"
                      >
                        (Change)
                      </Button>
                    </p>
                  )}
                </div>
                <Card className="mb-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg rounded-t-none">
                  <CardContent className="space-y-6 pt-6">
                    {/* Organization Search and Selection */}
                    <div className="relative" ref={searchContainerRef}>
                      <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
                        Select Non-Profit Organization
                      </Label>
                      <AnimatePresence mode="wait">
                        {selectedCause ? (
                          <motion.div
                            key="selected-cause"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={selectedCause.image || "/placeholder.svg"}
                                alt={selectedCause.name}
                                width={32}
                                height={32}
                                className="rounded-full object-cover h-8 w-8"
                              />
                              <span className="font-medium">{selectedCause.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={handleClearCauseSelection}>
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="search-input"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                              <Input
                                type="text"
                                placeholder="Search for non-profit organizations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    performSearch(searchQuery)
                                  }
                                }}
                                className="w-full pl-12 pr-10 h-12 sm:h-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 shadow-sm"
                              />
                              {searchQuery && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSearchQuery("")}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:bg-transparent"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <AnimatePresence>
                              {isSearchFocused && (searchQuery || displayedOrganizations.length > 0) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-2 max-h-60 overflow-y-auto"
                                >
                                  {isSearchingOrganizations ? (
                                    <div className="p-4 text-center text-gray-600 dark:text-gray-300 flex items-center justify-center">
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching organizations...
                                    </div>
                                  ) : displayedOrganizations.length === 0 ? (
                                    <p className="p-3 text-center text-gray-600 dark:text-gray-300">
                                      No non-profit organizations found matching your search.
                                    </p>
                                  ) : (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {displayedOrganizations.map((cause) => (
                                        <motion.div
                                          key={cause.id}
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.1 }}
                                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3"
                                          onClick={() => handleCauseSelect(cause.id)}
                                        >
                                          <img
                                            src={cause.image || "/placeholder.svg"}
                                            alt={cause.name}
                                            width={40}
                                            height={40}
                                            className="rounded-md object-cover"
                                          />
                                          <div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                              {cause.name}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-1">
                                              {cause.description}
                                            </div>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

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
                        <div className="flex items-center space-x-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all duration-200 cursor-pointer">
                          <RadioGroupItem value="one-time" id="one-time" className="border-purple-600" />
                          <Label htmlFor="one-time" className="text-gray-900 dark:text-white cursor-pointer flex-1">
                            <div className="font-semibold">One-time</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Single donation</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all duration-200 cursor-pointer">
                          <RadioGroupItem value="weekly" id="weekly" className="border-purple-600" />
                          <Label htmlFor="weekly" className="text-gray-900 dark:text-white cursor-pointer flex-1">
                            <div className="font-semibold">Weekly</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Every week</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-all duration-200 cursor-pointer">
                          <RadioGroupItem value="monthly" id="monthly" className="border-purple-600" />
                          <Label htmlFor="monthly" className="text-gray-900 dark:text-white cursor-pointer flex-1">
                            <div className="font-semibold">Monthly</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Every month</div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {/* Amount Selection */}
                    <div>
                      <Label className="text-base font-semibold mb-3 block text-gray-900 dark:text-white">
                        Select Amount
                      </Label>
                      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-4">
                        {donationAmounts.map((amount) => (
                          <Button
                            key={amount}
                            variant={selectedAmount === amount ? "default" : "outline"}
                            onClick={() => handleAmountSelect(amount)}
                            className={`h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all duration-200 ${
                              selectedAmount === amount
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg"
                                : "border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20"
                            }`}
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
                            className="pl-8 h-12 sm:h-14 text-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Recurring Donation Impact */}
                    {getCurrentAmount() > 0 && donationType !== "one-time" && (
                      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800 shadow-md">
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-3 text-lg">
                              Your {donationType} impact
                            </h4>
                            <div className="text-3xl font-bold text-purple-800 dark:text-purple-200 mb-2">
                              ${getCurrentAmount()}
                              {getFrequencyText()}
                            </div>
                            <p className="text-purple-700 dark:text-purple-300 text-sm font-medium">
                              That's ${getAnnualImpact().toLocaleString()} per year making a difference!
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {/* Donor Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-gray-900 dark:text-white">
                          Name
                        </Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-gray-900 dark:text-white font-semibold">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-900 dark:text-white font-semibold">
                        Phone (Optional)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-12 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      />
                    </div>
                    {/* Message */}
                    <div>
                      <Label htmlFor="message" className="text-gray-900 dark:text-white font-semibold">
                        Message (Optional)
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Share why you're supporting this cause..."
                        value={donorMessage}
                        onChange={(e) => setDonorMessage(e.target.value)}
                        className="min-h-[100px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                      />
                    </div>
                    {submissionError && <div className="text-red-500 text-sm text-center">{submissionError}</div>}
                    {/* Payment Button */}
                    <Button
                      size="lg"
                      className="w-full h-14 sm:h-16 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={handleSubmit}
                      disabled={getCurrentAmount() === 0 || !selectedCauseId || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" />
                          Donate ${getCurrentAmount().toFixed(2)}
                          {getFrequencyText()}
                        </>
                      )}
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
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 dark:from-purple-700 dark:via-blue-700 dark:to-purple-800 rounded-t-xl px-5 py-3 mb-0">
                  <h3 className="text-base font-bold text-white">Your Impact</h3>
                </div>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md rounded-t-none">
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
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 dark:from-purple-700 dark:via-blue-700 dark:to-purple-800 rounded-t-xl px-5 py-3 mb-0">
                  <h3 className="text-base font-bold text-white">
                    Why Donate Through {import.meta.env.VITE_APP_NAME}?
                  </h3>
                </div>
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md rounded-t-none">
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
                {/* Card Header */}
                <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 dark:from-purple-700 dark:via-blue-700 dark:to-purple-800 rounded-t-xl px-5 py-3 mb-0">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Heart className="h-4 w-4 text-white fill-white" />
                    Recurring Donations
                  </h3>
                </div>
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800 shadow-md rounded-t-none">
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
        </div>
      </div>
    </FrontendLayout>
  )
}
