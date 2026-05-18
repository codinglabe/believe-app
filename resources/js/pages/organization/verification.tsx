"use client"
import { useState, useCallback } from "react"
import { Head, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import { usePlaidLink } from "react-plaid-link"
import {
  Building,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  BanknoteIcon as Bank,
  Lock,
  Users,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Alert, AlertDescription } from "@/components/frontend/ui/alert"
import { Progress } from "@/components/frontend/ui/progress"
import AppLayout from "@/layouts/app-layout"
import type { BreadcrumbItem } from "@/types"

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Bank Verification",
    href: "/verification/ownership",
  },
]

interface Organization {
  id: number
  name: string
  ein: string
  city: string
  state: string
}

export default function PlaidVerificationPage() {
  const { organization, linkToken } = usePage().props as {
    organization: Organization
    linkToken: string
  }

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    setIsLoading(true)
    setCurrentStep(2)
    setProgress(25)

    try {
      // Step 1: Exchange public token for access token
      setProgress(50)
      const exchangeResponse = await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({
          public_token,
          metadata,
        }),
      })

      const exchangeData = await exchangeResponse.json()

      if (!exchangeData.success) {
        throw new Error(exchangeData.message || "Failed to exchange token")
      }

      // Step 2: Verify ownership
      setProgress(75)
      setCurrentStep(3)

      const verifyResponse = await fetch("/api/plaid/verify-ownership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
        },
        body: JSON.stringify({
          access_token: exchangeData.access_token,
          account_id: exchangeData.account_id,
          metadata,
        }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyData.success) {
        throw new Error(verifyData.message || "Verification failed")
      }

      setProgress(100)
      setCurrentStep(4)

      // Redirect to results page
      setTimeout(() => {
        router.visit("/verification/results")
      }, 1500)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
      setIsLoading(false)
      setCurrentStep(1)
      setProgress(0)
    }
  }, [])

  const onExit = useCallback((err: any, metadata: any) => {
    if (err != null) {
      setError("Bank connection was cancelled or failed")
    }
    setIsLoading(false)
    setCurrentStep(1)
    setProgress(0)
  }, [])

  const config = {
    token: linkToken,
    onSuccess,
    onExit,
  }

  const { open, ready } = usePlaidLink(config)

  const handleStartVerification = () => {
    if (ready) {
      setError(null)
      setCurrentStep(1)
      open()
    }
  }

  const steps = [
    {
      number: 1,
      title: "Connect Bank Account",
      description: "Securely connect your organization's bank account",
      icon: Bank,
      color: "blue",
    },
    {
      number: 2,
      title: "Exchange Credentials",
      description: "Securely exchange authentication tokens",
      icon: Lock,
      color: "indigo",
    },
    {
      number: 3,
      title: "Verify Ownership",
      description: "Verify organization ownership and identity",
      icon: Users,
      color: "purple",
    },
    {
      number: 4,
      title: "Complete Verification",
      description: "Finalize verification and generate results",
      icon: CheckCircle,
      color: "green",
    },
  ]

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Bank Verification" />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
                <Shield className="w-10 h-10 text-white" />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Organization Verification</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">
                  Verify your organization ownership through secure bank account connection
                </p>
              </div>
            </div>

            {/* Organization Info */}
            <Card className="shadow-xl border-2 border-blue-200 dark:border-blue-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Building className="w-6 h-6 text-blue-600" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization Name</label>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">{organization.name}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">EIN (Tax ID)</label>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">{organization.ein}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</label>
                    <div className="text-lg text-gray-900 dark:text-white">
                      {organization.city}, {organization.state}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Steps */}
            {isLoading && (
              <Card className="shadow-xl">
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verification Progress</h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Step {currentStep} of 4</span>
                    </div>

                    <Progress value={progress} className="h-3" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {steps.map((step) => {
                        const Icon = step.icon
                        const isActive = currentStep === step.number
                        const isCompleted = currentStep > step.number

                        return (
                          <div
                            key={step.number}
                            className={`p-4 rounded-lg border-2 transition-all duration-300 ${isActive
                                ? `border-${step.color}-500 bg-${step.color}-50 dark:bg-${step.color}-900/20`
                                : isCompleted
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                              }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive
                                    ? `bg-${step.color}-500 text-white`
                                    : isCompleted
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-300 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                                  }`}
                              >
                                {isCompleted ? (
                                  <div className="">
                                    <CheckCircle className="w-5 h-5" />
                                  </div>
                                ) : isActive ? (
                                  <div className=""><Loader2 className="w-5 h-5 animate-spin" /></div>

                                ) : (
                                  <div className=""><Icon className="w-5 h-5" /></div>
                                )}
                              </div>
                              <span
                                className={`font-medium ${isActive || isCompleted
                                    ? "text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-400"
                                  }`}
                              >
                                {step.title}
                              </span>
                            </div>
                            <p
                              className={`text-sm ${isActive || isCompleted
                                  ? "text-gray-700 dark:text-gray-300"
                                  : "text-gray-500 dark:text-gray-500"
                                }`}
                            >
                              {step.description}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Alert */}
            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300">
                  <strong>Verification Failed:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Verification Process */}
            {!isLoading && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Bank className="w-6 h-6 text-green-600" />
                    Bank Account Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">What we'll verify:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-blue-800 dark:text-blue-300">Bank account ownership</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-blue-800 dark:text-blue-300">Organization name match</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-blue-800 dark:text-blue-300">Account holder identity</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-blue-800 dark:text-blue-300">EIN/Tax ID verification</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={handleStartVerification}
                      disabled={!ready || isLoading}
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 px-8 py-4 text-lg font-semibold"
                    >
                      {!ready ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5 mr-2" />
                          Connect Bank Account
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Lock className="w-6 h-6 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Your Data is Secure</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          We use bank-level security through Plaid to connect to your account. We never store your
                          banking credentials and only access read-only information needed for verification. Your
                          financial data remains completely private and secure.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}
