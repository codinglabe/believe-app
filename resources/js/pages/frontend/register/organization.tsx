"use client"

import type React from "react"

import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useState } from "react"
import { motion } from "framer-motion"
import { Building2, Mail, Phone, Search, ArrowLeft, Heart, CheckCircle, AlertCircle, Edit3, Send } from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Checkbox } from "@/components/frontend/ui/checkbox"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Link } from "@inertiajs/react"

// Mock IRS data lookup function
const lookupEIN = async (ein: string) => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Mock data based on EIN lookup
  if (ein === "123456789") {
    return {
      name: "Global Water Foundation",
      ico: "John Smith, Executive Director",
      street: "123 Charity Lane",
      city: "New York",
      state: "NY",
      zip: "10001",
      classification: "501(c)(3)",
      ruling: "2015",
      deductibility: "Yes",
      organization: "Corporation",
      status: "Active",
      taxPeriod: "December",
      filingReq: "990",
      nteeCode: "C30",
    }
  }
  return null
}

export default function OrganizationRegisterPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [einError, setEinError] = useState("")
  const [isEditingIRS, setIsEditingIRS] = useState(false)
  const [hasEditedIRS, setHasEditedIRS] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1: EIN Lookup
    ein: "",

    // Step 2: IRS Data (auto-populated)
    name: "",
    ico: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    classification: "",
    ruling: "",
    deductibility: "",
    organization: "",
    status: "",
    taxPeriod: "",
    filingReq: "",
    nteeCode: "",

    // Step 3: Contact Information
    email: "",
    phone: "",
    contactName: "",
    contactTitle: "",

    // Step 4: Additional Information
    website: "",
    description: "",
    mission: "",

    // Terms
    agreeToTerms: false,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Track if IRS data has been edited
    const irsFields = [
      "name",
      "ico",
      "street",
      "city",
      "state",
      "zip",
      "classification",
      "ruling",
      "deductibility",
      "organization",
      "status",
      "taxPeriod",
      "filingReq",
      "nteeCode",
    ]
    if (irsFields.includes(field) && step === 2 && isEditingIRS) {
      setHasEditedIRS(true)
    }
  }

  const handleEINLookup = async () => {
    if (!formData.ein || formData.ein.length !== 9) {
      setEinError("Please enter a valid 9-digit EIN")
      return
    }

    setIsLoading(true)
    setEinError("")

    try {
      const irsData = await lookupEIN(formData.ein)

      if (irsData) {
        setFormData((prev) => ({
          ...prev,
          ...irsData,
        }))
        setStep(2)
      } else {
        setEinError("EIN not found in IRS database. Please verify the number and try again.")
      }
    } catch (error) {
      setEinError("Error looking up EIN. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatEIN = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")
    // Limit to 9 digits and format as XX-XXXXXXX
    if (digits.length <= 2) return digits
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`
  }

  const handleEINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value)
    handleInputChange("ein", formatted.replace("-", ""))
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  const toggleEditMode = () => {
    setIsEditingIRS(!isEditingIRS)
    if (isEditingIRS) {
      // If turning off edit mode, we don't need to do anything special
      // The hasEditedIRS flag will remain true if they made changes
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="max-w-md mx-auto"
          >
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 text-center">
              <CardContent className="pt-8 pb-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {hasEditedIRS ? "Application Submitted Successfully!" : "Registration Completed!"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {hasEditedIRS
                    ? `Thank you for registering ${formData.name} with CareConnect!`
                    : `${formData.name} has been successfully registered with CareConnect!`}
                </p>
                <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <Send className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                    {hasEditedIRS
                      ? `We've sent a verification email to ${formData.email}. Your application will be reviewed within 3-5 business days.`
                      : `We've sent a confirmation email to ${formData.email}. Your organization is now active on our platform!`}
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  <Link href={route('login')}>
                    <Button className="w-full bg-green-600 hover:bg-green-700">Go to Sign In</Button>
                  </Link>
                  <Link href={route('home')}>
                    <Button variant="outline" className="w-full bg-transparent">
                      Continue Browsing
                    </Button>
                  </Link>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Questions about your {hasEditedIRS ? "application" : "registration"}?{" "}
                  <Link href={route("contact")} className="text-blue-600 hover:underline">
                    Contact our support team
                  </Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

    return (
    <FrontendLayout>
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Back Button */}
          <Link
            href={route('register')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to registration options
          </Link>

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href={route('home')} className="inline-flex items-center space-x-2">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-xl shadow-lg">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                CareConnect
              </span>
            </Link>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between px-4 sm:justify-center sm:space-x-4">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      step >= stepNumber
                        ? "bg-gradient-to-r from-green-600 to-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {step > stepNumber ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div
                      className={`w-8 sm:w-16 h-0.5 sm:h-1 mx-1 sm:mx-2 ${
                        step > stepNumber
                          ? "bg-gradient-to-r from-green-600 to-blue-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-3 sm:mt-4">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center px-4">
                Step {step} of 4:{" "}
                {step === 1
                  ? "EIN Verification"
                  : step === 2
                    ? "Organization Details"
                    : step === 3
                      ? "Contact Information"
                      : "Final Details"}
              </span>
            </div>
          </div>

          <Card className="border-0 shadow-2xl bg-white dark:bg-gray-800 mx-2 sm:mx-0">
            <CardHeader className="text-center px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl flex items-center justify-center flex-wrap">
                <Building2 className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                <span className="text-center">Register Your Organization</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-2">
                {step === 1 && "Enter your EIN to verify your organization with the IRS"}
                {step === 2 && "Review and edit your organization details if needed"}
                {step === 3 && "Provide contact information"}
                {step === 4 && "Complete your registration"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6">
              {/* Step 1: EIN Lookup */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      IRS Employer Identification Number (EIN)
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      We'll verify your organization's tax-exempt status with the IRS
                    </p>
                  </div>

                  <div className="max-w-sm sm:max-w-md mx-auto">
                    <Label htmlFor="ein" className="text-base font-medium">
                      EIN (9 digits) *
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="ein"
                        type="text"
                        placeholder="XX-XXXXXXX"
                        value={formatEIN(formData.ein)}
                        onChange={handleEINChange}
                        className="h-12 sm:h-14 text-base sm:text-lg text-center font-mono tracking-wider"
                        maxLength={10}
                      />
                      <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                    </div>

                    {einError && (
                      <Alert className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700 dark:text-red-400">{einError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleEINLookup}
                      disabled={isLoading || formData.ein.length !== 9}
                      className="w-full mt-6 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Verifying with IRS...
                        </>
                      ) : (
                        "Verify Organization"
                      )}
                    </Button>
                  </div>

                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      Don't have an EIN?{" "}
                      <Link href="#" className="text-blue-600 hover:underline">
                        Apply for one here
                      </Link>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: IRS Data Review */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        Organization verified! You can edit any information below if needed.
                      </AlertDescription>
                    </Alert>
                  </div>

                  {hasEditedIRS && (
                    <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                        You've made changes to the IRS data. Your application will require manual review.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={toggleEditMode} variant="outline" size="sm" className="bg-transparent">
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditingIRS ? "Save Changes" : "Edit Information"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Legal Name *</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          required
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="font-medium">{formData.name}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">In Care Of</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.ico}
                          onChange={(e) => handleInputChange("ico", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.ico}</p>
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address *</Label>
                      {isEditingIRS ? (
                        <div className="space-y-2 mt-1">
                          <Input
                            placeholder="Street Address"
                            value={formData.street}
                            onChange={(e) => handleInputChange("street", e.target.value)}
                            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            required
                          />
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              placeholder="City"
                              value={formData.city}
                              onChange={(e) => handleInputChange("city", e.target.value)}
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                              required
                            />
                            <Input
                              placeholder="State"
                              value={formData.state}
                              onChange={(e) => handleInputChange("state", e.target.value)}
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                              required
                            />
                            <Input
                              placeholder="ZIP"
                              value={formData.zip}
                              onChange={(e) => handleInputChange("zip", e.target.value)}
                              className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                              required
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.street}</p>
                          <p>
                            {formData.city}, {formData.state} {formData.zip}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Classification</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.classification}
                          onChange={(e) => handleInputChange("classification", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.classification}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax Deductible</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.deductibility}
                          onChange={(e) => handleInputChange("deductibility", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.deductibility}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Ruling Year</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.ruling}
                          onChange={(e) => handleInputChange("ruling", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.ruling}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization Type</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.organization}
                          onChange={(e) => handleInputChange("organization", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.organization}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.status}
                          onChange={(e) => handleInputChange("status", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-green-600 font-medium">{formData.status}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">NTEE Code</Label>
                      {isEditingIRS ? (
                        <Input
                          value={formData.nteeCode}
                          onChange={(e) => handleInputChange("nteeCode", e.target.value)}
                          className="mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p>{formData.nteeCode}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={() => setStep(1)}
                      variant="outline"
                      className="w-full sm:flex-1 order-2 sm:order-1"
                    >
                      Back to EIN
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={
                        !formData.name || !formData.street || !formData.city || !formData.state || !formData.zip
                      }
                      className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 order-1 sm:order-2"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Information */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contact Information</h3>
                    <p className="text-gray-600 dark:text-gray-400">Provide contact details for your organization</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email">Organization Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="contact@yourorganization.org"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="pl-10 h-12"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contactName">Primary Contact Name *</Label>
                      <Input
                        id="contactName"
                        type="text"
                        placeholder="Contact person's full name"
                        value={formData.contactName}
                        onChange={(e) => handleInputChange("contactName", e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="contactTitle">Contact Title *</Label>
                      <Input
                        id="contactTitle"
                        type="text"
                        placeholder="Executive Director, CEO, etc."
                        value={formData.contactTitle}
                        onChange={(e) => handleInputChange("contactTitle", e.target.value)}
                        className="h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={() => setStep(2)}
                      variant="outline"
                      className="w-full sm:flex-1 order-2 sm:order-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(4)}
                      disabled={!formData.email || !formData.phone || !formData.contactName || !formData.contactTitle}
                      className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 order-1 sm:order-2"
                    >
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Final Details */}
              {step === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Additional Information</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Help supporters learn more about your organization
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="website">Website (Optional)</Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://yourorganization.org"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Organization Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of your organization and its work..."
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        className="min-h-[120px]"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="mission">Mission Statement *</Label>
                      <Textarea
                        id="mission"
                        placeholder="Your organization's mission and goals..."
                        value={formData.mission}
                        onChange={(e) => handleInputChange("mission", e.target.value)}
                        className="min-h-[120px]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed">
                        I agree to the{" "}
                        <Link href="/terms" className="text-green-600 hover:underline">
                          Terms of Service
                        </Link>
                        ,{" "}
                        <Link href="/privacy" className="text-green-600 hover:underline">
                          Privacy Policy
                        </Link>
                        , and{" "}
                        <Link href="/organization-terms" className="text-green-600 hover:underline">
                          Organization Agreement
                        </Link>
                        . I confirm that I have the authority to register this organization and that all information
                        provided is accurate.
                      </Label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      onClick={() => setStep(3)}
                      variant="outline"
                      className="w-full sm:flex-1 order-2 sm:order-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleFinalSubmit}
                      className="w-full sm:flex-1 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      disabled={!formData.agreeToTerms || !formData.description || !formData.mission || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          {hasEditedIRS ? "Submitting Application..." : "Completing Registration..."}
                        </>
                      ) : hasEditedIRS ? (
                        "Submit Application"
                      ) : (
                        "Complete Registration"
                      )}
                    </Button>
                  </div>

                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    <p>
                      {hasEditedIRS
                        ? "Your application will be reviewed within 3-5 business days. We'll contact you at the provided email address with updates."
                        : "Your organization will be active immediately after registration completion."}
                    </p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
            </div>
    </FrontendLayout>
  )
}
