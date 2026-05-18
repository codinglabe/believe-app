"use client"

import React, { useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  XCircle,
  CheckCircle,
  Shield,
  User,
  Hash,
  MapPin,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"
const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "KYC Verification", href: "/admin/kyc-verification" },
  { title: "Submission Details", href: "#" },
]

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
    icon: <Clock className="h-4 w-4" />,
  },
  in_review: {
    label: "In Review",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    icon: <FileText className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  verified: {
    label: "Verified",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    icon: <XCircle className="h-4 w-4" />,
  },
  not_submitted: {
    label: "Not Submitted",
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800",
    icon: <Clock className="h-4 w-4" />,
  },
}

interface ResidentialAddress {
  street_line_1?: string
  street_line_2?: string
  city?: string
  subdivision?: string
  state?: string
  postal_code?: string
  country?: string
}

interface IdentifyingInformation {
  type?: string
  issuing_country?: string
  number?: string
}

interface Submission {
  id: number
  first_name: string
  last_name: string
  email: string
  birth_date: string | null
  residential_address: ResidentialAddress
  identifying_information: IdentifyingInformation[]
  submission_status: string
  bridge_customer_id: string | null
  id_front_image_path: string | null
  id_back_image_path: string | null
  id_front_image_url: string | null
  id_back_image_url: string | null
  created_at: string
  updated_at: string
  bridge_integration: {
    id: number
    user?: {
      id: number
      name: string
      email: string
    }
    organization?: {
      id: number
      name: string
    }
  }
  submission_data?: {
    rejection_reason?: string
    rejected_at?: string
    rejected_by?: number
    approved_at?: string
    approved_by?: number
    approval_notes?: string
  }
}

interface PageProps {
  submission: Submission
}

export default function AdminKycVerificationShow({ submission }: PageProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [approvalNotes, setApprovalNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const statusInfo = statusConfig[submission.submission_status] || statusConfig.pending

  const handleApprove = () => {
    setIsProcessing(true)
    router.post(
      route("admin.kyc-verification.approve", submission.id),
      { notes: approvalNotes },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("KYC submission approved successfully")
          setIsProcessing(false)
          setShowApproveDialog(false)
          setApprovalNotes("")
        },
        onError: () => {
          showErrorToast("Failed to approve KYC submission")
          setIsProcessing(false)
        },
      }
    )
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      showErrorToast("Please provide a rejection reason")
      return
    }

    setIsProcessing(true)
    router.post(
      route("admin.kyc-verification.reject", submission.id),
      { rejection_reason: rejectionReason },
      {
        preserveScroll: true,
        onSuccess: () => {
          showSuccessToast("KYC submission rejected successfully")
          setShowRejectDialog(false)
          setRejectionReason("")
          setIsProcessing(false)
        },
        onError: () => {
          showErrorToast("Failed to reject KYC submission")
          setIsProcessing(false)
        },
      }
    )
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    showSuccessToast("Copied to clipboard")
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatAddress = (address: ResidentialAddress) => {
    const parts = [
      address.street_line_1,
      address.street_line_2,
      address.city,
      address.subdivision || address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "N/A"
  }

  const formatSSN = (ssn: string) => {
    if (!ssn) return "N/A"
    // Show only last 4 digits for security
    return `***-**-${ssn.slice(-4)}`
  }

  const getSSN = () => {
    if (!submission.identifying_information || !Array.isArray(submission.identifying_information)) {
      return null
    }
    const ssnInfo = submission.identifying_information.find((info) => info.type === "ssn")
    return ssnInfo?.number || null
  }

  const getIDInfo = () => {
    if (!submission.identifying_information || !Array.isArray(submission.identifying_information)) {
      return null
    }
    return submission.identifying_information.find(
      (info) => info.type && ["drivers_license", "passport", "state_id"].includes(info.type)
    )
  }

  const customerName = `${submission.first_name} ${submission.last_name}`
  const idInfo = getIDInfo()

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`KYC Verification - ${customerName}`} />
      <div className="m-2 md:m-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href={route("admin.kyc-verification.index")}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                KYC Verification Details
              </h1>
              <p className="text-sm text-muted-foreground">Review individual verification submission</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("flex items-center gap-1 px-3 py-1", statusInfo.className)}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            {(submission.submission_status === "pending" || submission.submission_status === "in_review") && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Rejection Reason Display */}
        {submission.submission_status === "rejected" && submission.submission_data?.rejection_reason && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">Rejection Reason</h3>
                <p className="text-sm text-red-800 dark:text-red-200">
                  {submission.submission_data.rejection_reason}
                </p>
                {submission.submission_data.rejected_at && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Rejected on {format(new Date(submission.submission_data.rejected_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Approval Notes Display */}
        {submission.submission_status === "approved" && submission.submission_data?.approval_notes && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">Approval Notes</h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {submission.submission_data.approval_notes}
                </p>
                {submission.submission_data.approved_at && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Approved on {format(new Date(submission.submission_data.approved_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Customer details submitted for verification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">First Name</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-medium">{submission.first_name || "N/A"}</p>
                        {submission.first_name && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.first_name, "first_name")}
                          >
                            {copiedField === "first_name" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Name</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-medium">{submission.last_name || "N/A"}</p>
                        {submission.last_name && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.last_name, "last_name")}
                          >
                            {copiedField === "last_name" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{submission.email || "N/A"}</p>
                        {submission.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.email, "email")}
                          >
                            {copiedField === "email" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {submission.birth_date ? format(new Date(submission.birth_date), "MMM d, yyyy") : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SSN</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium font-mono">{getSSN() ? formatSSN(getSSN()!) : "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bridge Customer ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium font-mono text-xs">
                          {submission.bridge_customer_id || "N/A"}
                        </p>
                        {submission.bridge_customer_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(submission.bridge_customer_id!, "bridge_customer_id")}
                          >
                            {copiedField === "bridge_customer_id" ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Residential Address</Label>
                    <div className="flex items-start gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="font-medium">{formatAddress(submission.residential_address)}</p>
                    </div>
                  </div>
                  {idInfo && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">ID Type</Label>
                        <p className="font-medium mt-1 capitalize">
                          {idInfo.type?.replace("_", " ") || "N/A"}
                        </p>
                      </div>
                      {idInfo.number && (
                        <div>
                          <Label className="text-xs text-muted-foreground">ID Number</Label>
                          <p className="font-medium font-mono mt-1">{idInfo.number}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* ID Documents */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Identity Documents
                  </CardTitle>
                  <CardDescription>Customer identification documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Front ID Image */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ID Front Image</Label>
                      {submission.id_front_image_url ? (
                        <div className="relative group">
                          <img
                            src={submission.id_front_image_url}
                            alt="ID Front"
                            className="w-full h-auto rounded-lg border border-border object-contain max-h-64"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <a
                              href={submission.id_front_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white rounded-full shadow-lg"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-lg p-8 text-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No image available</p>
                        </div>
                      )}
                    </div>

                    {/* Back ID Image */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ID Back Image</Label>
                      {submission.id_back_image_url ? (
                        <div className="relative group">
                          <img
                            src={submission.id_back_image_url}
                            alt="ID Back"
                            className="w-full h-auto rounded-lg border border-border object-contain max-h-64"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <a
                              href={submission.id_back_image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-white rounded-full shadow-lg"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-border rounded-lg p-8 text-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No image available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Submission Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Submission Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Submission ID</Label>
                    <p className="font-mono text-sm mt-1">#{submission.id}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-muted-foreground">Submitted</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Updated</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(submission.updated_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* User/Organization Info */}
            {(submission.bridge_integration?.organization || submission.bridge_integration?.user) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Associated Account</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {submission.bridge_integration.organization && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Organization</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium text-sm">
                            {submission.bridge_integration.organization.name}
                          </p>
                        </div>
                      </div>
                    )}
                    {submission.bridge_integration.user && (
                      <div>
                        <Label className="text-xs text-muted-foreground">User</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {submission.bridge_integration.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.bridge_integration.user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Approve KYC Verification
              </DialogTitle>
              <DialogDescription>Confirm that you have reviewed and verified all identity documents</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {submission.first_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{customerName}</p>
                      <p className="text-sm text-muted-foreground">{submission.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="approvalNotes">Verification Notes (Optional)</Label>
                <Textarea
                  id="approvalNotes"
                  placeholder="Add any additional notes about the verification process..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="min-h-[100px] bg-background/50 border-border/50"
                />
              </div>

              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-green-500 mb-1">Confirmation Required</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      By approving this KYC verification, you confirm that you have thoroughly reviewed all customer
                      identity documents and that they meet the required compliance standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing} className="bg-green-500 hover:bg-green-600 text-white">
                <CheckCircle className="mr-2 h-4 w-4" />
                {isProcessing ? "Approving..." : "Approve Verification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Reject KYC Verification
              </DialogTitle>
              <DialogDescription>Provide a detailed reason for rejecting this verification</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {submission.first_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{customerName}</p>
                      <p className="text-sm text-muted-foreground">{submission.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Explain clearly why the KYC verification is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  className="min-h-[100px] bg-background/50 border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be shared with the customer to help them correct the issue.
                </p>
              </div>

              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex gap-3">
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-500 mb-1">Important Notice</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The customer will need to resubmit their KYC verification with corrected documents. Please provide
                      clear, actionable instructions on what needs to be fixed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={isProcessing || !rejectionReason.trim()} variant="destructive">
                <XCircle className="mr-2 h-4 w-4" />
                {isProcessing ? "Rejecting..." : "Reject Verification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

