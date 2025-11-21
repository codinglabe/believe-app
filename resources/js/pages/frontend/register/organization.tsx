"use client"
import type React from "react"
import FrontendLayout from "@/layouts/frontend/frontend-layout"
import { useEffect, useState, useRef, useMemo } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  Mail,
  Phone,
  Search,
  ArrowLeft,
  Heart,
  CheckCircle,
  AlertCircle,
  Send,
  EyeOff,
  Eye,
  ShieldCheck,
  Upload,
  ImageIcon,
  X,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Input } from "@/components/frontend/ui/input"
import { Label } from "@/components/frontend/ui/label"
import { Textarea } from "@/components/frontend/ui/textarea"
import { Checkbox } from "@/components/frontend/ui/checkbox"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Link, usePage } from "@inertiajs/react"
import { route } from "ziggy-js"

// Types
interface EINLookupResponse {
  success: boolean
  data?: any
  message?: string
  errors?: Record<string, string[]>
}

interface RegistrationResponse {
  success: boolean
  message?: string
  organization?: any
  errors?: Record<string, string[]>
}

export default function OrganizationRegisterPage({ referralCode }: { referralCode: string }) {
  const { csrf_token } = usePage<PageProps>().props
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [einError, setEinError] = useState("")
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [isManualEntry, setIsManualEntry] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [csrfToken, setCsrfToken] = useState(csrf_token || "")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (referralCode) {
      setFormData((prev) => ({
        ...prev,
        referralCode: referralCode,
      }))
    }
  }, [referralCode])

  // Form data state
  const [einData, setEinData] = useState({ ein: "" })
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
    tax_period: "",
    filing_req: "",
    ntee_code: "",
    // Step 3: Contact Information
    email: "",
    phone: "",
    contact_name: "",
    contact_title: "",
    password: "",
    password_confirmation: "",
    // Step 4: Additional Information
    website: "",
    description: "",
    mission: "",
    image: null as File | null,
    // Terms
    agree_to_terms: false,
    has_edited_irs_data: false,
    referralCode: referralCode,
  })

  const passwordRequirements = useMemo(() => {
    const password = formData.password || ""
    return [
      {
        id: "length",
        label: "At least 8 characters",
        met: password.length >= 8,
      },
      {
        id: "lowercase",
        label: "At least one lowercase letter",
        met: /[a-z]/.test(password),
      },
      {
        id: "uppercase",
        label: "At least one uppercase letter",
        met: /[A-Z]/.test(password),
      },
      {
        id: "number",
        label: "At least one number",
        met: /[0-9]/.test(password),
      },
      {
        id: "symbol",
        label: "At least one symbol",
        met: /[^A-Za-z0-9]/.test(password),
      },
    ]
  }, [formData.password])

  const allPasswordRequirementsMet = useMemo(() => passwordRequirements.every((requirement) => requirement.met), [passwordRequirements])

  const passwordsMatch = useMemo(() => {
    if (!formData.password && !formData.password_confirmation) {
      return false
    }
    return formData.password === formData.password_confirmation
  }, [formData.password, formData.password_confirmation])

  // Multiple methods to get CSRF token
  const getCsrfToken = () => {
    // Method 1: From Inertia props (most reliable)
    if (csrf_token) {
      return csrf_token
    }

    // Method 2: From state
    if (csrfToken) {
      return csrfToken
    }

    // Method 3: From meta tag (fallback)
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
    if (metaToken) {
      setCsrfToken(metaToken)
      return metaToken
    }

    // Method 4: From cookie (if using cookie-based CSRF)
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.split("=")[1]

    if (cookieToken) {
      const decodedToken = decodeURIComponent(cookieToken)
      setCsrfToken(decodedToken)
      return decodedToken
    }

    console.error("CSRF token not found!")
    return ""
  }

  // Ensure CSRF token is available on component mount
  useEffect(() => {
    const token = getCsrfToken()
    if (token && !csrfToken) {
      setCsrfToken(token)
    }
  }, [csrf_token])

  const handleInputChange = (field: string, value: string | boolean | File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (file) {
      // Check file type and size
      if (!file.type.startsWith('image/')) {
        setErrors({ image: 'Please select an image file' })
        return
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors({ image: 'Image size should be less than 5MB' })
        return
      }

      handleInputChange("image", file)

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Clear error if any
      if (errors.image) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.image
          return newErrors
        })
      }
    }
  }

  const removeImage = () => {
    handleInputChange("image", null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleEinInputChange = (field: string, value: string) => {
    setEinData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Clear EIN error when user types
    setEinError("")
  }

  const formatEIN = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.length <= 2) return digits
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`
  }

  const handleEINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value)
    const cleanEin = formatted.replace("-", "")
    handleEinInputChange("ein", cleanEin)
  }

  const handleEINLookup = async () => {
    if (!einData.ein || einData.ein.length !== 9) {
      setEinError("Please enter a valid 9-digit EIN")
      return
    }

    console.log("Starting EIN lookup for:", einData.ein)
    setIsLoading(true)
    setEinError("")
    setLookupStatus('loading')

    const token = getCsrfToken()
    if (!token) {
      setEinError("Security token not available. Please refresh the page.")
      setIsLoading(false)
      setLookupStatus('error')
      return
    }

    // Reset editable fields before lookup
    setFormData((prev) => ({
      ...prev,
      ein: einData.ein,
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
      tax_period: "",
      filing_req: "",
      ntee_code: "",
      has_edited_irs_data: false,
    }))
    setIsManualEntry(false)

    try {
      const response = await fetch(route("register.organization.lookup-ein"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({ ein: einData.ein }),
      })

      const data: EINLookupResponse = await response.json()

      console.log("EIN lookup response:", data)

      if (data.success && data.data) {
        // Update form data with IRS data
        const irsData = data.data

        setFormData((prev) => ({
          ...prev,
          ein: einData.ein,
          name: irsData.name || "",
          ico: irsData.ico || "",
          street: irsData.street || "",
          city: irsData.city || "",
          state: irsData.state || "",
          zip: irsData.zip || "",
          classification: irsData.classification || "",
          ruling: irsData.ruling || "",
          deductibility: irsData.deductibility || "",
          organization: irsData.organization || "",
          status: irsData.status || "",
          tax_period: irsData.tax_period || "",
          filing_req: irsData.filing_req || "",
          ntee_code: irsData.ntee_code || "",
          has_edited_irs_data: false,
        }))

        setLookupStatus('success')
        setIsManualEntry(false)
        setStep(2)
      } else {
        const cleanEin = einData.ein
        setFormData((prev) => ({
          ...prev,
          ein: cleanEin,
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
          tax_period: "",
          filing_req: "",
          ntee_code: "",
          has_edited_irs_data: true,
        }))
        setLookupStatus('success')
        setIsManualEntry(true)
        setStep(2)
      }
    } catch (error) {
      console.error("EIN lookup error:", error)
      setEinError("Error looking up EIN. Please try again.")
      setLookupStatus('error')
      setIsManualEntry(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalSubmit = async () => {
    if (!formData.agree_to_terms || !formData.description || !formData.mission) {
      return
    }

    setIsLoading(true)
    setErrors({})

    const token = getCsrfToken()
    if (!token) {
      setEinError("Security token not available. Please refresh the page.")
      setIsLoading(false)
      return
    }

    try {
      // Create FormData object for file upload
      const formDataToSend = new FormData()

      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData.image) {
          formDataToSend.append('image', formData.image)
        } else {
          formDataToSend.append(key, formData[key as keyof typeof formData] as string | Blob)
        }
      })

      const response = await fetch(route("register.organization.store"), {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
        },
        body: formDataToSend,
      })

      const data: RegistrationResponse = await response.json()

      console.log("Registration response:", data)

      if (data.success) {
        setRegistrationSuccess(true)
        setSuccessMessage(data.message || "Organization registered successfully!")
        setStep(5)
      } else {
        // Handle validation errors
        if (data.errors) {
          const formattedErrors: Record<string, string> = {}
          Object.entries(data.errors).forEach(([key, value]) => {
            formattedErrors[key] = Array.isArray(value) ? value[0] : value
          })
          setErrors(formattedErrors)
        }
      }
    } catch (error) {
      console.error("Registration error:", error)
      setErrors({ general: "Registration failed. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return einData.ein.length === 9
      case 2:
        return isManualEntry
          ? !!(formData.name && formData.street && formData.city && formData.state && formData.zip)
          : lookupStatus === 'success'
      case 3:
        return !!(
          formData.image &&
          formData.email &&
          formData.phone &&
          formData.contact_name &&
          formData.contact_title &&
          formData.password &&
          formData.password_confirmation
        )
      case 4:
        return !!(formData.agree_to_terms && formData.description && formData.mission)
      default:
        return false
    }
  }

  const goToStep = (targetStep: number) => {
    // Allow going back or forward if current step is valid
    if (targetStep < step || validateStep(step)) {
      setStep(targetStep)
    }
  }

  // Success state
  if (registrationSuccess || step === 5) {
    return (
      <FrontendLayout>
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

                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Registration Completed!</h2>

                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {successMessage || `${formData.name} has been successfully registered with CareConnect!`}
                  </p>

                  <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                    <Send className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                      We've sent a confirmation email to {formData.email}. Your organization is now active on our
                      platform!
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Link href={route("login")}>
                      <Button className="w-full bg-green-600 hover:bg-green-700">Go to Sign In</Button>
                    </Link>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Questions about your registration?{" "}
                    <Link href={route("contact")} className="text-blue-600 hover:underline">
                      Contact our support team
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </FrontendLayout>
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
              href={route("register", { ref: referralCode })}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to registration options
            </Link>

            {/* Logo */}
            <div className="text-center mb-8">
              <Link href={route("home")} className="inline-flex items-center space-x-2">
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
                    <button
                      onClick={() => goToStep(stepNumber)}
                      disabled={stepNumber > step && !validateStep(step)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 ${step >= stepNumber
                          ? "bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
                        } ${stepNumber <= step ? "cursor-pointer" : "cursor-not-allowed"}`}
                    >
                      {step > stepNumber ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : stepNumber}
                    </button>
                    {stepNumber < 4 && (
                      <div
                        className={`w-8 sm:w-16 h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all duration-200 ${step > stepNumber
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
                  {step === 2 && "Review your organization details"}
                  {step === 3 && "Provide contact information and create account"}
                  {step === 4 && "Complete your registration"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6">
                {/* General Error Alert */}
                {errors.general && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 dark:text-red-400">{errors.general}</AlertDescription>
                  </Alert>
                )}

                {/* Step 1: EIN Lookup */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >

                    {referralCode && (
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Referral Code Applied
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          <div className="flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            <span className="font-bold text-green-600">{referralCode}</span>
                          </div>
                        </p>
                      </div>
                    )}
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
                          value={formatEIN(einData.ein)}
                          onChange={handleEINChange}
                          className={`h-12 sm:h-14 text-base sm:text-lg text-center font-mono tracking-wider ${errors.ein ? "border-red-500" : ""}`}
                          maxLength={10}
                        />
                        <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      {errors.ein && <p className="mt-2 text-sm text-red-600">{errors.ein}</p>}

                      {einError && (
                        <Alert className="mt-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700 dark:text-red-400">{einError}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleEINLookup}
                        disabled={isLoading || !validateStep(1)}
                        className="w-full mt-6 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                        <a
                          href="https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Apply for one here
                        </a>
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
                    <div className="space-y-4">
                      {isManualEntry ? (
                        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-700 dark:text-amber-400">
                            This EIN isn’t in the IRS file we have on record. Please enter your organization details so we can continue the tax exemption review.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-400">
                            Organization verified! Please review the information below.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    {isManualEntry ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="org-name">Legal Name *</Label>
                          <Input
                            id="org-name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="Organization legal name"
                          />
                          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                        </div>

                        <div>
                          <Label htmlFor="org-ico">In Care Of</Label>
                          <Input
                            id="org-ico"
                            value={formData.ico ?? ""}
                            onChange={(e) => handleInputChange("ico", e.target.value)}
                            placeholder="c/o person or department"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-street">Street *</Label>
                          <Input
                            id="org-street"
                            value={formData.street}
                            onChange={(e) => handleInputChange("street", e.target.value)}
                            placeholder="Street address"
                          />
                          {errors.street && <p className="text-red-600 text-sm mt-1">{errors.street}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="org-city">City *</Label>
                            <Input
                              id="org-city"
                              value={formData.city}
                              onChange={(e) => handleInputChange("city", e.target.value)}
                              placeholder="City"
                            />
                            {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                          </div>
                          <div>
                            <Label htmlFor="org-state">State *</Label>
                            <Input
                              id="org-state"
                              value={formData.state}
                              onChange={(e) => handleInputChange("state", e.target.value)}
                              placeholder="State"
                            />
                            {errors.state && <p className="text-red-600 text-sm mt-1">{errors.state}</p>}
                          </div>
                          <div>
                            <Label htmlFor="org-zip">ZIP *</Label>
                            <Input
                              id="org-zip"
                              value={formData.zip}
                              onChange={(e) => handleInputChange("zip", e.target.value)}
                              placeholder="ZIP"
                            />
                            {errors.zip && <p className="text-red-600 text-sm mt-1">{errors.zip}</p>}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="org-classification">Classification</Label>
                          <Input
                            id="org-classification"
                            value={formData.classification ?? ""}
                            onChange={(e) => handleInputChange("classification", e.target.value)}
                            placeholder="Classification"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-deductibility">Deductibility</Label>
                          <Input
                            id="org-deductibility"
                            value={formData.deductibility ?? ""}
                            onChange={(e) => handleInputChange("deductibility", e.target.value)}
                            placeholder="Deductibility"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-ruling">Ruling Year</Label>
                          <Input
                            id="org-ruling"
                            value={formData.ruling ?? ""}
                            onChange={(e) => handleInputChange("ruling", e.target.value)}
                            placeholder="YYYY"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-type">Organization Type</Label>
                          <Input
                            id="org-type"
                            value={formData.organization ?? ""}
                            onChange={(e) => handleInputChange("organization", e.target.value)}
                            placeholder="Type"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-status">Status</Label>
                          <Input
                            id="org-status"
                            value={formData.status ?? ""}
                            onChange={(e) => handleInputChange("status", e.target.value)}
                            placeholder="Status"
                          />
                        </div>

                        <div>
                          <Label htmlFor="org-ntee">NTEE Code</Label>
                          <Input
                            id="org-ntee"
                            value={formData.ntee_code ?? ""}
                            onChange={(e) => handleInputChange("ntee_code", e.target.value)}
                            placeholder="NTEE"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Legal Name *</Label>
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="font-medium">{formData.name || "No data available"}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">In Care Of</Label>
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p>{formData.ico || "N/A"}</p>
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address *</Label>
                            <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p>{formData.street || "No street address"}</p>
                              <p>
                                {formData.city || "No city"}, {formData.state || "No state"} {formData.zip || "No ZIP"}
                              </p>
                            </div>
                          </div>

                          {[
                            { key: "classification", label: "Classification" },
                            { key: "deductibility", label: "Tax Deductible" },
                            { key: "ruling", label: "Ruling Year" },
                            { key: "organization", label: "Organization Type" },
                            { key: "status", label: "Status" },
                            { key: "ntee_code", label: "NTEE Code" },
                          ].map(({ key, label }) => (
                            <div key={key}>
                              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
                              <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <p className={key === "status" ? "text-green-600 font-medium" : ""}>
                                  {(formData[key as keyof typeof formData] as string) || "N/A"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={() => {
                          setStep(1)
                          setIsManualEntry(false)
                          setLookupStatus('idle')
                        }}
                        variant="outline"
                        className="w-full sm:flex-1 order-2 sm:order-1"
                      >
                        Back to EIN
                      </Button>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:flex-1 order-1 sm:order-2">
                        <Button
                          onClick={() => setStep(3)}
                          disabled={!validateStep(2)}
                          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50"
                        >
                          Continue
                        </Button>
                      </div>
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Contact Information & Account
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Provide contact details and create your account
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Label htmlFor="image">Your Photo*</Label>
                        <div className="mt-2 flex items-center justify-center w-full">
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            {imagePreview ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="w-full h-full object-contain rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={removeImage}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  PNG, JPG, GIF up to 5MB
                                </p>
                              </div>
                            )}
                            <input
                              id="image-upload"
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        </div>
                        {errors.image && <p className="text-red-600 text-sm mt-1">{errors.image}</p>}
                      </div>

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
                        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
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
                        {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
                      </div>

                      <div>
                        <Label htmlFor="contact_name">Primary Contact Name *</Label>
                        <Input
                          id="contact_name"
                          type="text"
                          placeholder="Contact person's full name"
                          value={formData.contact_name}
                          onChange={(e) => handleInputChange("contact_name", e.target.value)}
                          className="h-12"
                          required
                        />
                        {errors.contact_name && <p className="text-red-600 text-sm mt-1">{errors.contact_name}</p>}
                      </div>

                      <div>
                        <Label htmlFor="contact_title">Contact Title *</Label>
                        <Input
                          id="contact_title"
                          type="text"
                          placeholder="Executive Director, CEO, etc."
                          value={formData.contact_title}
                          onChange={(e) => handleInputChange("contact_title", e.target.value)}
                          className="h-12"
                          required
                        />
                        {errors.contact_title && <p className="text-red-600 text-sm mt-1">{errors.contact_title}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={(e) => handleInputChange("password", e.target.value)}
                            className={errors.password ? "border-red-500" : ""}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-red-600 text-sm">{errors.password}</p>}
                        {formData.password && !allPasswordRequirementsMet && (
                          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-3 text-xs">
                            <p className="mb-2 font-medium text-primary">Your password must include:</p>
                            <div className="space-y-1">
                              {passwordRequirements.map((requirement) => (
                                <div
                                  key={requirement.id}
                                  className={`flex items-center gap-2 ${requirement.met ? "text-emerald-600" : "text-muted-foreground"}`}
                                >
                                  {requirement.met ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4" />
                                  )}
                                  <span>{requirement.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {formData.password && allPasswordRequirementsMet && (
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Password meets all requirements</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password_confirmation">Confirm Password *</Label>
                        <div className="relative">
                          <Input
                            id="password_confirmation"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={formData.password_confirmation}
                            onChange={(e) => handleInputChange("password_confirmation", e.target.value)}
                            className={errors.password_confirmation ? "border-red-500" : ""}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password_confirmation && (
                          <p className="text-red-600 text-sm">{errors.password_confirmation}</p>
                        )}
                        {formData.password_confirmation && (
                          <div
                            className={`flex items-center gap-2 text-xs ${
                              passwordsMatch ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {passwordsMatch ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <span>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>
                          </div>
                        )}
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
                        disabled={!validateStep(3)}
                        className="w-full sm:flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 order-1 sm:order-2 disabled:opacity-50"
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
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Additional Information
                      </h3>
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
                        {errors.website && <p className="text-red-600 text-sm mt-1">{errors.website}</p>}
                      </div>

                      <div>
                        <Label htmlFor="description">Organization Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Brief description of your organization and its work..."
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          className="min-h-[120px] resize-none"
                          required
                        />
                        <div className="text-right text-sm text-gray-500 mt-1">{formData.description.length}/2000</div>
                        {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
                      </div>

                      <div>
                        <Label htmlFor="mission">Mission Statement *</Label>
                        <Textarea
                          id="mission"
                          placeholder="Your organization's mission and goals..."
                          value={formData.mission}
                          onChange={(e) => handleInputChange("mission", e.target.value)}
                          className="min-h-[120px] resize-none"
                          required
                        />
                        <div className="text-right text-sm text-gray-500 mt-1">{formData.mission.length}/2000</div>
                        {errors.mission && <p className="text-red-600 text-sm mt-1">{errors.mission}</p>}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          checked={formData.agree_to_terms}
                          onCheckedChange={(checked) => handleInputChange("agree_to_terms", checked as boolean)}
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
                      {errors.agree_to_terms && <p className="text-red-600 text-sm">{errors.agree_to_terms}</p>}
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
                        className="w-full sm:flex-1 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50"
                        disabled={!validateStep(4) || isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Completing Registration...
                          </>
                        ) : (
                          "Complete Registration"
                        )}
                      </Button>
                    </div>

                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      <p>Your organization will be active immediately after registration completion.</p>
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
