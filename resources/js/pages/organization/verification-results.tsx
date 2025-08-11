"use client"
import { Head, router, usePage } from "@inertiajs/react"
import { motion } from "framer-motion"
import {
  Building,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  Shield,
  Award,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/frontend/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/frontend/ui/card"
import { Badge } from "@/components/frontend/ui/badge"
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
  {
    title: "Results",
    href: "/verification/results",
  },
]

export default function BankVerificationResults() {
  const { verification, organization } = usePage().props as any
console.log(verification)
  const getOverallStatus = () => {
    if (verification.verification_status === "verified") {
      return {
        status: "success",
        title: "Verification Successful",
        description: "Your organization has been successfully verified!",
        icon: CheckCircle,
        color: "green",
      }
    } else if (verification.verification_status === "name_mismatch") {
      return {
        status: "warning",
        title: "Partial Verification",
        description: "Some verification checks need review.",
        icon: AlertTriangle,
        color: "yellow",
      }
    } else {
      return {
        status: "error",
        title: "Verification Failed",
        description: "Verification could not be completed.",
        icon: XCircle,
        color: "red",
      }
    }
  }

  const overallStatus = getOverallStatus()
  const StatusIcon = overallStatus.icon

  const verificationChecks = [
    {
      id: "bank_connection",
      label: "Bank Account Connected",
      description: "Successfully connected to organization bank account",
      passed: true,
      critical: true,
    },
    {
      id: "account_ownership",
      label: "Account Ownership Verified",
      description: "Bank account belongs to authorized person",
      passed: verification.verification_status !== "rejected",
      critical: true,
    },
    {
      id: "name_match",
      label: "Name Verification",
      description: `Profile name matches bank account holder (${verification.name_similarity_score}% match)`,
      passed: verification.name_similarity_score >= 80,
      critical: true,
      score: verification.name_similarity_score,
    },
    {
      id: "organization_match",
      label: "Organization Verification",
      description: "Bank account linked to registered organization",
      passed: verification.organization_match_score >= 70,
      critical: false,
      score: verification.organization_match_score,
    },
    {
      id: "ein_verification",
      label: "EIN/Tax ID Check",
      description: "Organization tax identification verified",
      passed: verification.ein_verified,
      critical: false,
    },
    {
      id: "address_verification",
      label: "Address Verification",
      description: "Organization address matches bank records",
      passed: verification.address_match_score >= 60,
      critical: false,
      score: verification.address_match_score,
    },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const downloadCertificate = () => {
    router.post("/verification/download-certificate", {
      verification_id: verification.id,
    })
  }

  const retryVerification = () => {
    router.visit("/verification/ownership")
  }

  const CheckItem = ({
    check,
    index,
  }: {
    check: any
    index: number
  }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-6 rounded-xl border-2 transition-all duration-300 ${
        check.passed
          ? "border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
          : check.critical
            ? "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
            : "border-yellow-200 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            check.passed
              ? "bg-green-500 text-white"
              : check.critical
                ? "bg-red-500 text-white"
                : "bg-yellow-500 text-white"
          }`}
        >
          {check.passed ? (
            <CheckCircle className="w-6 h-6" />
          ) : check.critical ? (
            <XCircle className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3
              className={`text-lg font-semibold ${
                check.passed
                  ? "text-green-900 dark:text-green-300"
                  : check.critical
                    ? "text-red-900 dark:text-red-300"
                    : "text-yellow-900 dark:text-yellow-300"
              }`}
            >
              {check.label}
            </h3>

            {check.critical && !check.passed && (
              <Badge variant="destructive" className="text-xs">
                CRITICAL
              </Badge>
            )}

            {check.score !== undefined && (
              <Badge
                className={`${
                  check.score >= 80
                    ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                    : check.score >= 60
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                      : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                }`}
              >
                {check.score}%
              </Badge>
            )}
          </div>

          <p
            className={`text-sm ${
              check.passed
                ? "text-green-700 dark:text-green-400"
                : check.critical
                  ? "text-red-700 dark:text-red-400"
                  : "text-yellow-700 dark:text-yellow-400"
            }`}
          >
            {check.description}
          </p>

          {check.score !== undefined && (
            <div className="mt-3">
              <Progress
                value={check.score}
                className={`h-2 ${
                  check.score >= 80
                    ? "[&>div]:bg-green-500"
                    : check.score >= 60
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-red-500"
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Bank Verification Results" />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Header Status */}
            <div className="text-center space-y-6">
              <div
                className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
                  overallStatus.status === "success"
                    ? "bg-gradient-to-br from-green-500 to-emerald-600"
                    : overallStatus.status === "warning"
                      ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                      : "bg-gradient-to-br from-red-500 to-red-600"
                }`}
              >
                <StatusIcon className="w-12 h-12 text-white" />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{overallStatus.title}</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">{overallStatus.description}</p>
              </div>
            </div>

            {/* Organization Summary */}
            <Card className="shadow-xl border-2 border-blue-200 dark:border-blue-700">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Building className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{organization?.name}</h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        EIN: {organization?.ein} • {organization?.city}, {organization?.state}
                      </p>
                    </div>
                  </div>

                  <Badge
                    className={`px-4 py-2 text-lg font-semibold ${
                      overallStatus.status === "success"
                        ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                        : overallStatus.status === "warning"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                          : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100"
                    }`}
                  >
                    {verification.verification_status === "verified"
                      ? "VERIFIED"
                      : verification.verification_status === "name_mismatch"
                        ? "NEEDS REVIEW"
                        : "FAILED"}
                  </Badge>
                </div>

                {/* Success Message */}
                {verification.verification_status === "verified" && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center gap-3 mb-3">
                      <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <h3 className="text-lg font-semibold text-green-900 dark:text-green-300">
                        Congratulations! Your organization is now verified.
                      </h3>
                    </div>
                    <p className="text-green-700 dark:text-green-400">
                      You now have full access to all platform features and can create courses, accept payments, and
                      manage your organization.
                    </p>
                  </div>
                )}

                {/* Warning Message */}
                {verification.verification_status === "name_mismatch" && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300">
                        Manual Review Required
                      </h3>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-400">
                      Some verification checks need manual review. Our team will contact you within 24 hours.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {verification.verification_status === "rejected" && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="flex items-center gap-3 mb-3">
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      <h3 className="text-lg font-semibold text-red-900 dark:text-red-300">Verification Failed</h3>
                    </div>
                    <p className="text-red-700 dark:text-red-400 mb-2">{verification.rejection_reason}</p>
                    <p className="text-red-600 dark:text-red-500 text-sm">
                      Please ensure the bank account belongs to your organization and try again.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification Checks */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="w-7 h-7" />
                  Verification Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {verificationChecks.map((check, index) => (
                    <CheckItem key={check.id} check={check} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bank Account Summary */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-blue-600" />
                  Connected Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{verification.bank_name}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">Bank Name</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 capitalize">
                      {verification.account_type}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">Account Type</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      ••••{verification.account_mask}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">Account Ending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Timeline */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  Verification Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Started:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(verification.created_at)}
                    </span>
                  </div>

                  {verification.verified_at && (
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-green-600 dark:text-green-400">Completed:</span>
                      <span className="font-semibold text-green-900 dark:text-green-300">
                        {formatDate(verification.verified_at)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {verification.verification_status === "verified" && (
                <Button
                  onClick={downloadCertificate}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-8 py-3"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </Button>
              )}

              {verification.verification_status !== "verified" && (
                <Button
                  onClick={retryVerification}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 px-8 py-3"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}

              <Button variant="outline" onClick={() => router.visit("/dashboard")} className="px-8 py-3">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            {/* Security Notice */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Your Data is Secure</h3>
                    <p className="text-blue-700 dark:text-blue-400 text-sm">
                      All verification data is encrypted and processed through secure channels. We never store sensitive
                      banking information and only access the minimum data required for verification purposes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}
