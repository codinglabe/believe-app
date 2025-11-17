"use client"

import React, { useState } from "react"
import { Link, router, usePage } from "@inertiajs/react"
import { Head } from "@inertiajs/react"
import AppLayout from "@/layouts/app-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Globe,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  Users,
  Award,
  Briefcase,
  TrendingUp,
  Shield,
  FileCheck,
  AlertCircle,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit,
  Save,
  Copy,
  Check,
} from "lucide-react"
import type { BreadcrumbItem } from "@/types"
import { showSuccessToast, showErrorToast } from "@/lib/toast"

const breadcrumbs: BreadcrumbItem[] = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Form 1023 Applications", href: "/admin/form1023" },
  { title: "Application Details", href: "#" },
]

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    icon: <FileText className="h-4 w-4" />,
  },
  pending_payment: {
    label: "Pending Payment",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: <Clock className="h-4 w-4" />,
  },
  awaiting_review: {
    label: "Awaiting Review",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: <Clock className="h-4 w-4" />,
  },
  needs_more_info: {
    label: "Needs More Info",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: <XCircle className="h-4 w-4" />,
  },
}

const paymentStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  refunded: {
    label: "Refunded",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: <ArrowLeft className="h-3.5 w-3.5" />,
  },
}

const organizationStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
}

const formatCurrency = (amount: number | string | null | undefined) => {
  if (!amount) return "$0.00"
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount))
}

const renderFileList = (
  files: any, 
  title: string, 
  fieldName: string,
  onReject?: (fieldName: string, fileIndex: number | null) => void,
  rejectedDocuments?: Record<string, any>
) => {
  if (!files) return null

  const fileArray = Array.isArray(files) ? files : [files]
  const validFiles = fileArray.filter((f: any) => f && (f.path || f.name))

  if (validFiles.length === 0) return null

  const isRejected = (index: number | null) => {
    if (!rejectedDocuments) return false
    const key = index !== null ? `${fieldName}[${index}]` : fieldName
    return rejectedDocuments[key] !== undefined
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">
        {validFiles.map((file: any, idx: number) => {
          const fileIndex = fileArray.length > 1 ? idx : null
          const rejected = isRejected(fileIndex)
          const rejectionInfo = rejected && rejectedDocuments 
            ? rejectedDocuments[fileIndex !== null ? `${fieldName}[${fileIndex}]` : fieldName]
            : null

          return (
            <div 
              key={idx} 
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                rejected 
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" 
                  : "bg-muted border-border hover:bg-muted/80"
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className={cn(
                  "h-5 w-5 flex-shrink-0",
                  rejected ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{file.name || 'Document'}</span>
                    {rejected && (
                      <Badge variant="destructive" className="text-xs">
                        Rejected
                      </Badge>
                    )}
                  </div>
                  {rejected && rejectionInfo?.reason && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Reason: {rejectionInfo.reason}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {file.path && (
                  <a
                    href={`/storage/${file.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    View
                  </a>
                )}
                {onReject && !rejected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(fieldName, fileIndex)}
                    className="text-xs h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminForm1023Show() {
  const { application, flash } = usePage<{
    application: any
    flash?: Record<string, string>
  }>().props

  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectDocumentModal, setShowRejectDocumentModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditFeeModal, setShowEditFeeModal] = useState(false)
  const [requestInfoMessage, setRequestInfoMessage] = useState("")
  const [declineMessage, setDeclineMessage] = useState("")
  const [approveMessage, setApproveMessage] = useState("")
  const [rejectDocumentReason, setRejectDocumentReason] = useState("")
  const [rejectingDocument, setRejectingDocument] = useState<{ fieldName: string; fileIndex: number | null } | null>(null)
  const [feeAmount, setFeeAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingFee, setIsUpdatingFee] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  React.useEffect(() => {
    if (flash?.success) {
      showSuccessToast(flash.success)
    }
  }, [flash])

  const handleCopy = async (text: string, fieldName: string) => {
    if (!text || text === "—" || text === "N/A") return
    
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      showSuccessToast("Copied to clipboard!")
      setTimeout(() => {
        setCopiedField(null)
      }, 2000)
    } catch (err) {
      showErrorToast("Failed to copy to clipboard")
    }
  }

  const CopyButton = ({ text, fieldName, className = "" }: { text: string | null | undefined; fieldName: string; className?: string }) => {
    if (!text || text === "—" || text === "N/A") return null
    
    const isCopied = copiedField === fieldName
    
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleCopy(text, fieldName)}
        className={cn("h-6 w-6 p-0", className)}
        title="Copy to clipboard"
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-green-600" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    )
  }

  const handleRequestInfo = () => {
    setShowRequestInfoModal(true)
  }

  const handleDecline = () => {
    setShowDeclineModal(true)
  }

  const submitRequestInfo = () => {
    if (!requestInfoMessage.trim()) {
      showErrorToast("Please provide a message describing what information is needed")
      return
    }

    setIsSubmitting(true)
    router.patch(route("admin.form1023.update", application.id), { 
      status: "needs_more_info", 
      message: requestInfoMessage 
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application marked as needing more info successfully")
        setShowRequestInfoModal(false)
        setRequestInfoMessage("")
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to update application status")
        setIsSubmitting(false)
      }
    })
  }

  const submitDecline = () => {
    if (!declineMessage.trim()) {
      showErrorToast("Please provide a reason for declining the application")
      return
    }

    setIsSubmitting(true)
    router.patch(route("admin.form1023.update", application.id), { 
      status: "declined", 
      message: declineMessage 
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application declined successfully")
        setShowDeclineModal(false)
        setDeclineMessage("")
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to update application status")
        setIsSubmitting(false)
      }
    })
  }

  const handleApprove = () => {
    setShowApproveModal(true)
  }

  const submitApprove = () => {
    setIsSubmitting(true)
    router.patch(route("admin.form1023.update", application.id), { 
      status: "approved",
      message: approveMessage || null
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Application approved successfully")
        setShowApproveModal(false)
        setApproveMessage("")
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to update application status")
        setIsSubmitting(false)
      }
    })
  }

  const handleRejectDocument = (fieldName: string, fileIndex: number | null) => {
    setRejectingDocument({ fieldName, fileIndex })
    setShowRejectDocumentModal(true)
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    setIsDeleting(true)
    router.delete(route("admin.form1023.destroy", application.id), {
      preserveScroll: false,
      onSuccess: () => {
        router.visit(route("admin.form1023.index"))
      },
      onError: () => {
        setIsDeleting(false)
      },
    })
  }

  const submitRejectDocument = () => {
    if (!rejectDocumentReason.trim() || !rejectingDocument) {
      showErrorToast("Please provide a reason for rejecting the document")
      return
    }

    setIsSubmitting(true)
    router.post(route("admin.form1023.reject-document", application.id), {
      field_name: rejectingDocument.fieldName,
      file_index: rejectingDocument.fileIndex,
      reason: rejectDocumentReason,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        showSuccessToast("Document rejected successfully. Organization will be notified to re-upload.")
        setShowRejectDocumentModal(false)
        setRejectDocumentReason("")
        setRejectingDocument(null)
        setIsSubmitting(false)
      },
      onError: () => {
        showErrorToast("Failed to reject document")
        setIsSubmitting(false)
      }
    })
  }

  const rejectedDocuments = application.meta?.rejected_documents || {}

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || {
      label: status,
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      icon: <FileText className="h-4 w-4" />,
    }

    return (
      <Badge className={config.className}>
        <span className="flex items-center gap-2">
          {config.icon}
          {config.label}
        </span>
      </Badge>
    )
  }

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const config = paymentStatusConfig[paymentStatus] || {
      label: paymentStatus.replace(/_/g, " "),
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
      icon: <DollarSign className="h-3.5 w-3.5" />,
    }

    return (
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 capitalize px-3 py-1.5 text-xs font-semibold border",
          config.className
        )}
      >
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const getOrganizationStatusBadge = (registrationStatus: string) => {
    const config = organizationStatusConfig[registrationStatus] || {
      label: registrationStatus.replace(/_/g, " "),
      className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800",
      icon: <Building className="h-3.5 w-3.5" />,
    }

    return (
      <Badge 
        variant="outline" 
        className={cn(
          "flex items-center gap-1.5 capitalize px-3 py-1.5 text-xs font-semibold border",
          config.className
        )}
      >
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Form 1023 Application - ${application.application_number}`} />
      <div className="m-3 md:m-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={route("admin.form1023.index")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Applications
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {/* Request More Info Button - Hide if current status is needs_more_info */}
            {application.status !== "needs_more_info" && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleRequestInfo}
                disabled={isSubmitting}
                className="text-xs sm:text-sm"
              >
                Request More Info
              </Button>
            )}
            
            {/* Decline Button - Hide if current status is declined */}
            {application.status !== "declined" && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDecline}
                disabled={isSubmitting}
                className="text-xs sm:text-sm"
              >
                Decline
              </Button>
            )}
            
            {/* Approve Button - Hide if current status is approved */}
            {application.status !== "approved" && (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="text-xs sm:text-sm"
              >
                Approve
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
            >
              <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        {/* Status Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span>{application.application_number}</span>
                <CopyButton text={application.application_number} fieldName="application_number" />
              </div>
              <Badge className={cn("capitalize", statusConfig[application.status]?.className ?? "bg-gray-100 text-gray-700")}>
                {application.status.replace(/_/g, " ")}
              </Badge>
              {application.payment_status && getPaymentStatusBadge(application.payment_status)}
            </CardTitle>
            <CardDescription>
              Submitted {application.submitted_at ? format(new Date(application.submitted_at), "MMM d, yyyy") : "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Organization</h3>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">{application.organization?.name || application.legal_name || "N/A"}</p>
                  <CopyButton text={application.organization?.name || application.legal_name} fieldName="organization_name" />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {application.organization?.ein && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="font-mono">
                        EIN: {application.organization.ein}
                      </Badge>
                      <CopyButton text={application.organization.ein} fieldName="organization_ein" />
                    </div>
                  )}
                  {application.organization?.registration_status && (
                    getOrganizationStatusBadge(application.organization.registration_status)
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <h3 className="text-sm font-semibold text-muted-foreground">Contact Information</h3>
                {application.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{application.contact_email}</span>
                    <CopyButton text={application.contact_email} fieldName="contact_email" />
                  </div>
                )}
                {application.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{application.contact_phone}</span>
                    <CopyButton text={application.contact_phone} fieldName="contact_phone" />
                  </div>
                )}
                {application.amount && (
                  <div className="mt-3 flex items-center gap-2">
                    <p>
                      <span className="text-muted-foreground">Application fee: </span>
                      <span className="font-semibold text-foreground">{formatCurrency(application.amount)}</span>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFeeAmount(application.amount.toString())
                        setShowEditFeeModal(true)
                      }}
                      className="h-6 w-6 p-0"
                      title="Edit fee"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          {application.status === "awaiting_review" && application.amount && (
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Fee collected: <span className="font-semibold text-foreground">{formatCurrency(application.amount)}</span>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Request More Info Modal */}
        <Dialog open={showRequestInfoModal} onOpenChange={setShowRequestInfoModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                Request More Information
              </DialogTitle>
              <DialogDescription>
                Describe what additional information is needed from the organization to proceed with the application review.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="request-info-message" className="text-sm font-semibold">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="request-info-message"
                  placeholder="Please provide details about what information is needed..."
                  value={requestInfoMessage}
                  onChange={(e) => setRequestInfoMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be sent to the organization.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRequestInfoModal(false)
                  setRequestInfoMessage("")
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitRequestInfo}
                disabled={isSubmitting || !requestInfoMessage.trim()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Application Modal */}
        <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Decline Application
              </DialogTitle>
              <DialogDescription>
                Provide a reason for declining this application. This information will be shared with the organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive mb-1">Warning</p>
                <p className="text-xs text-muted-foreground">
                  Declining this application will mark it as rejected. This action cannot be easily undone.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="decline-message" className="text-sm font-semibold">
                  Reason for Decline <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="decline-message"
                  placeholder="Please provide a clear reason for declining this application..."
                  value={declineMessage}
                  onChange={(e) => setDeclineMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be sent to the organization explaining why the application was declined.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineMessage("")
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitDecline}
                disabled={isSubmitting || !declineMessage.trim()}
              >
                {isSubmitting ? "Declining..." : "Decline Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Application Modal */}
        <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Approve Application
              </DialogTitle>
              <DialogDescription>
                Approve this Form 1023 application. You can optionally include a congratulatory message for the organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Success</p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Approving this application will grant the organization full access and update their registration status.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approve-message" className="text-sm font-semibold">
                  Message (Optional)
                </Label>
                <Textarea
                  id="approve-message"
                  placeholder="Optional: Add a congratulatory message or notes for the organization..."
                  value={approveMessage}
                  onChange={(e) => setApproveMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This optional message will be included in the approval email sent to the organization.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApproveModal(false)
                  setApproveMessage("")
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitApprove}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Approving..." : "Approve Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Document Modal */}
        <Dialog open={showRejectDocumentModal} onOpenChange={setShowRejectDocumentModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <XCircle className="h-5 w-5 text-destructive" />
                Reject Document
              </DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this document. The organization will be notified and can re-upload the document.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Note</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Rejecting this document will mark the application as "Needs More Info" and notify the organization to re-upload.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reject-document-reason" className="text-sm font-semibold">
                  Reason for Rejection <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reject-document-reason"
                  placeholder="Please provide a clear reason for rejecting this document..."
                  value={rejectDocumentReason}
                  onChange={(e) => setRejectDocumentReason(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be shown to the organization so they know what needs to be corrected.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDocumentModal(false)
                  setRejectDocumentReason("")
                  setRejectingDocument(null)
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={submitRejectDocument}
                disabled={isSubmitting || !rejectDocumentReason.trim()}
              >
                {isSubmitting ? "Rejecting..." : "Reject Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Fee Modal */}
        <Dialog open={showEditFeeModal} onOpenChange={setShowEditFeeModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <DollarSign className="h-5 w-5 text-green-600" />
                Update Application Fee
              </DialogTitle>
              <DialogDescription>
                Update the fee amount for this application. This will change the amount charged to the organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fee-amount" className="text-sm font-semibold">
                  Application Fee Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="fee-amount"
                    type="text"
                    value={feeAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '')
                      const parts = value.split('.')
                      const formattedValue = parts.length > 2 
                        ? parts[0] + '.' + parts.slice(1).join('') 
                        : value
                      setFeeAmount(formattedValue)
                    }}
                    placeholder="0.00"
                    className="pl-8"
                    disabled={isUpdatingFee}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Current fee: <span className="font-semibold">{formatCurrency(application.amount)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Enter a value between $0.00 and $10,000.00
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">Note</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Changing the fee will update the amount for this specific application. If payment is pending, the organization will be charged the new amount.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditFeeModal(false)
                  setFeeAmount("")
                }}
                disabled={isUpdatingFee}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const amount = parseFloat(feeAmount)
                  if (!feeAmount || isNaN(amount) || amount < 0 || amount > 10000) {
                    showErrorToast("Please enter a valid fee amount between $0.00 and $10,000.00")
                    return
                  }

                  setIsUpdatingFee(true)
                  router.patch(
                    route("admin.form1023.update-amount", application.id),
                    { amount: amount },
                    {
                      preserveScroll: true,
                      onSuccess: () => {
                        showSuccessToast("Application fee updated successfully")
                        setShowEditFeeModal(false)
                        setFeeAmount("")
                        setIsUpdatingFee(false)
                      },
                      onError: (errors) => {
                        showErrorToast(errors?.amount?.[0] || "Failed to update application fee")
                        setIsUpdatingFee(false)
                      },
                    }
                  )
                }}
                disabled={isUpdatingFee || !feeAmount}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdatingFee ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Fee
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* A. Basic Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building className="h-5 w-5" />
              A. Basic Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Legal Name</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold">{application.legal_name || "—"}</p>
                  <CopyButton text={application.legal_name} fieldName="legal_name" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">EIN</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold font-mono">{application.ein || "—"}</p>
                  <CopyButton text={application.ein} fieldName="ein" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date Incorporated</p>
                <p className="text-base font-semibold">
                  {application.date_incorporated
                    ? format(new Date(application.date_incorporated), "MMMM d, yyyy")
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">State of Incorporation</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold">{application.state_of_incorporation || "—"}</p>
                  <CopyButton text={application.state_of_incorporation} fieldName="state_of_incorporation" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Organizational Structure</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold capitalize">{application.organizational_structure || "—"}</p>
                  <CopyButton text={application.organizational_structure} fieldName="organizational_structure" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">{application.contact_email || "—"}</span>
                  <CopyButton text={application.contact_email} fieldName="contact_email_detail" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Phone</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-base font-semibold">{application.contact_phone || "—"}</span>
                  <CopyButton text={application.contact_phone} fieldName="contact_phone_detail" />
                </div>
              </div>
              {application.website && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Website</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={application.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-primary hover:underline flex items-center gap-2"
                    >
                      {application.website}
                      <LinkIcon className="h-4 w-4" />
                    </a>
                    <CopyButton text={application.website} fieldName="website" />
                  </div>
                </div>
              )}
            </div>
            {application.mailing_address && (
              <Separator />
            )}
            {application.mailing_address && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Mailing Address
                  </p>
                  <CopyButton text={application.mailing_address} fieldName="mailing_address" />
                </div>
                <p className="text-base font-semibold whitespace-pre-line">{application.mailing_address}</p>
              </div>
            )}
            {application.physical_address && application.physical_address !== application.mailing_address && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Physical Address
                    </p>
                    <CopyButton text={application.physical_address} fieldName="physical_address" />
                  </div>
                  <p className="text-base font-semibold whitespace-pre-line">{application.physical_address}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* B. Organizational Structure & Governance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5" />
              B. Organizational Structure & Governance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderFileList(
              application.organizing_documents, 
              "Articles of Incorporation",
              "organizing_documents",
              handleRejectDocument,
              rejectedDocuments
            )}
            {renderFileList(
              application.bylaws_document, 
              "Bylaws (Signed and Dated)",
              "bylaws_document",
              handleRejectDocument,
              rejectedDocuments
            )}
            {renderFileList(
              application.conflict_of_interest_policy_document, 
              "Conflict of Interest Policy",
              "conflict_of_interest_policy_document",
              handleRejectDocument,
              rejectedDocuments
            )}
            {renderFileList(
              application.organizational_chart_document, 
              "Organizational Chart",
              "organizational_chart_document",
              handleRejectDocument,
              rejectedDocuments
            )}

            {application.officers_directors && Array.isArray(application.officers_directors) && application.officers_directors.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Officers, Directors & Key Employees</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {application.officers_directors.map((officer: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border bg-muted/30">
                        <p className="font-semibold text-base">{officer.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{officer.title}</p>
                        {officer.address && <p className="text-xs text-muted-foreground mt-2">{officer.address}</p>}
                        {officer.compensation && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Compensation: {formatCurrency(officer.compensation)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {application.related_organizations && Array.isArray(application.related_organizations) && application.related_organizations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Related Organizations</h4>
                  <div className="space-y-3">
                    {application.related_organizations.map((org: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border bg-muted/30">
                        <p className="font-semibold text-base">{org.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {org.type} - {org.relationship}
                        </p>
                        {org.description && <p className="text-xs text-muted-foreground mt-2">{org.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* C. Purpose & Activities */}
        {application.mission_statement && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Award className="h-5 w-5" />
                C. Purpose & Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Mission Statement</h4>
                  <CopyButton text={application.mission_statement} fieldName="mission_statement" />
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{application.mission_statement}</p>
                </div>
              </div>

              {application.activities && Array.isArray(application.activities) && application.activities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Past, Present, and Planned Activities</h4>
                    <div className="space-y-4">
                      {application.activities.map((activity: any, index: number) => (
                        <div key={index} className="p-4 border-l-4 border-primary rounded-lg bg-muted/30">
                          <h5 className="font-semibold text-base mb-2">{activity.activity_name}</h5>
                          <p className="text-sm text-muted-foreground mb-3">{activity.description}</p>
                          <div className="grid gap-3 sm:grid-cols-2 text-sm">
                            <div>
                              <span className="font-semibold text-muted-foreground">Beneficiaries:</span>
                              <p className="mt-1">{activity.beneficiaries}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-muted-foreground">Funding Source:</span>
                              <p className="mt-1">{activity.funding_source}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.fundraising_materials && (
                <>
                  <Separator />
                  {renderFileList(
                    application.fundraising_materials, 
                    "Brochures / Advertisements / Web Pages",
                    "fundraising_materials",
                    handleRejectDocument,
                    rejectedDocuments
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* D. Financial Information */}
        {(application.revenue_sources || application.budget_per_program || application.major_contributors || application.fundraising_activities || application.prior_year_tax_filings) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5" />
                D. Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderFileList(
                application.financial_statements, 
                "Financial Statements (Current + 3-Year Projection)",
                "financial_statements",
                handleRejectDocument,
                rejectedDocuments
              )}

              {application.revenue_sources && Array.isArray(application.revenue_sources) && application.revenue_sources.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Sources of Revenue</h4>
                    <div className="space-y-2">
                      {application.revenue_sources.map((source: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-muted/30">
                          <span className="font-medium">{source.source}</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(source.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.budget_per_program && Array.isArray(application.budget_per_program) && application.budget_per_program.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Estimated Budget per Major Program</h4>
                    <div className="space-y-2">
                      {application.budget_per_program.map((program: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-muted/30">
                          <span className="font-medium">{program.program}</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(program.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.major_contributors && Array.isArray(application.major_contributors) && application.major_contributors.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Major Contributors (over $5,000)</h4>
                    <div className="space-y-2">
                      {application.major_contributors.map((contributor: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border bg-muted/30">
                          <p className="font-semibold text-base">{contributor.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatCurrency(contributor.amount)} ({contributor.type})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.fundraising_activities && Array.isArray(application.fundraising_activities) && application.fundraising_activities.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Fundraising Activities / Contracts</h4>
                    <div className="space-y-3">
                      {application.fundraising_activities.map((activity: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg border bg-muted/30">
                          <p className="font-semibold text-base">{activity.activity_name}</p>
                          <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
                          {activity.contract && (
                            <div className="mt-3">
                              {renderFileList(
                                activity.contract, 
                                "Contract",
                                `fundraising_activities[${index}].contract`,
                                handleRejectDocument,
                                rejectedDocuments
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.prior_year_tax_filings && (
                <>
                  <Separator />
                  {renderFileList(
                    application.prior_year_tax_filings, 
                    "Prior-Year Tax Filings",
                    "prior_year_tax_filings",
                    handleRejectDocument,
                    rejectedDocuments
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* E. Operational Details */}
        {(application.compensation_arrangements || application.related_party_agreements || application.political_activities_yes_no || application.foreign_activities_yes_no || application.grants) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Briefcase className="h-5 w-5" />
                E. Operational Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {application.compensation_arrangements && Array.isArray(application.compensation_arrangements) && application.compensation_arrangements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Compensation Arrangements</h4>
                  <div className="space-y-2">
                    {application.compensation_arrangements.map((arr: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg border bg-muted/30">
                        <p className="font-semibold text-base">{arr.name} ({arr.role})</p>
                        <p className="text-sm text-muted-foreground mt-1">{arr.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {application.related_party_agreements && Array.isArray(application.related_party_agreements) && application.related_party_agreements.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Related Party Agreements</h4>
                    <div className="space-y-2">
                      {application.related_party_agreements.map((agreement: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border bg-muted/30">
                          <p className="font-semibold text-base">{agreement.description}</p>
                          {agreement.document && (
                            <div className="mt-3">
                              {renderFileList(
                                agreement.document, 
                                "Supporting Document",
                                `related_party_agreements[${index}].document`,
                                handleRejectDocument,
                                rejectedDocuments
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.political_activities_yes_no && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Political / Lobbying Activities</h4>
                    <Badge className="mb-3">{application.political_activities_yes_no}</Badge>
                    {application.political_activities_desc && (
                      <div className="rounded-lg border bg-muted/30 p-4 mt-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {application.political_activities_desc}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {application.foreign_activities_yes_no && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Foreign Activities</h4>
                    <Badge className="mb-3">{application.foreign_activities_yes_no}</Badge>
                    {application.foreign_activities_desc && (
                      <div className="rounded-lg border bg-muted/30 p-4 mt-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {application.foreign_activities_desc}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {application.grants && Array.isArray(application.grants) && application.grants.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Grants Made / Planned</h4>
                    <div className="space-y-2">
                      {application.grants.map((grant: any, index: number) => (
                        <div key={index} className="p-3 rounded-lg border bg-muted/30">
                          <p className="font-semibold text-base">{grant.recipient}</p>
                          <p className="text-sm text-muted-foreground mt-1">Purpose: {grant.purpose}</p>
                          <p className="text-sm text-muted-foreground mt-1">Amount: {formatCurrency(grant.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* F. Supporting Documents */}
        {(application.form_ss4_confirmation || application.board_meeting_minutes || application.whistleblower_policy_document) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                F. Supporting Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderFileList(
                application.form_ss4_confirmation, 
                "IRS Form SS-4 (EIN Letter)",
                "form_ss4_confirmation",
                handleRejectDocument,
                rejectedDocuments
              )}
              {renderFileList(
                application.board_meeting_minutes, 
                "Board Meeting Minutes Approving Formation",
                "board_meeting_minutes",
                handleRejectDocument,
                rejectedDocuments
              )}
              {renderFileList(
                application.whistleblower_policy_document, 
                "Whistleblower Policy",
                "whistleblower_policy_document",
                handleRejectDocument,
                rejectedDocuments
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Notes */}
        {application.admin_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5" />
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{application.admin_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <XCircle className="h-5 w-5 text-destructive" />
                Delete Application
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this Form 1023 application? This action cannot be undone and will permanently delete all associated files and data.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive mb-1">Warning</p>
              <p className="text-xs text-muted-foreground">
                This will permanently delete the application and all uploaded documents. This action cannot be reversed.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
